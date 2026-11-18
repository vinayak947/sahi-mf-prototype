import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Ticker, type CalcModel } from "./core";
import type { PeriodRow } from "./charts";
import { pct } from "../format";
import "./coins.css";

/* The Return calculator's chart: stacks of coins, one stack per period (1, 3, 5 years). Grey coins are what you put in, green
   coins what it earned, so they match the two dots in the rows below. One coin is the same sum in every stack, so you can
   count: put in 4, got back 15. 
   Bars, Curve and Rows were tried too; they are in Mutual Funds/archive/calculator-chart-bars-curve-rows.

   Each coin is drawn as a real one seen from above at an angle: a reeded edge (the fine ridges round the side), a raised rim
   round the face, and the SAHI mark struck into the face, foreshortened and turned a little so it lies flat. Only the top
   coin's face shows, so only it carries the mark. Coins fall with gravity and settle with a small bounce, one after another
   from the bottom; when the amount or the period changes only the new coins fall, and coins taken away lift off.

   All three stacks show at once, alike: nothing to pick. Above each, what it became and what went in; below, the period and
   its return. Selection styles that were tried (Tray, Lift, Pointer, Tag, Tray + Lift) are in Mutual Funds/archive. */

// What the money became, short, one decimal: ₹62.4K, ₹2.5L, ₹1.2Cr (Indian units; trailing .0 dropped).
export const short = (v: number) => {
  const cut = (n: number, d: number) => String(Number(n.toFixed(d)));
  if (v >= 1e7) return `₹${cut(v / 1e7, 1)}Cr`;
  if (v >= 1e5) return `₹${cut(v / 1e5, 1)}L`;
  if (v >= 1e3) return `₹${cut(v / 1e3, 1)}K`;
  return `₹${Math.round(v)}`;
};
const yearsText = (y: number) => `${y} ${y === 1 ? "year" : "years"}`;

const MAX_COINS = 15;
export const COIN_STEP = 5; // px of edge that shows between two coins
export const COIN_H = 20; // face (15) + edge (5)
// The SAHI mark (Figma: The New Home - SAHI, node 3184:31433), 149 x 148.
export const SAHI_MARK = "M136.247 104.506C134.702 107.984 131.253 110.226 127.447 110.226H87.3555C81.1498 110.226 75.5255 113.879 73.002 119.548L63.5078 140.876C61.961 144.351 58.5143 146.589 54.7109 146.589H1.47852L12.1768 122.531C13.7226 119.055 17.1701 116.815 20.9746 116.814H61.0869C67.2925 116.814 72.9168 113.161 75.4404 107.492L84.9346 86.1641C86.4813 82.6894 89.9281 80.4503 93.7314 80.4502H146.933L136.247 104.506ZM136.247 64.7647C134.702 68.243 131.253 70.4853 127.447 70.4854H87.3555C81.1498 70.4854 75.5255 74.1383 73.002 79.8077L63.5078 101.135C61.9611 104.61 58.5144 106.849 54.7109 106.849H1.47852L12.1768 82.7901C13.7227 79.3139 17.1702 77.0735 20.9746 77.0733H61.0869C67.2925 77.0733 72.9169 73.4204 75.4404 67.751L84.9346 46.4239C86.4813 42.9491 89.928 40.71 93.7314 40.71H146.933L136.247 64.7647ZM136.247 25.0147C134.702 28.4931 131.253 30.7354 127.447 30.7354H87.3555C81.1498 30.7354 75.5255 34.3883 73.002 40.0577L63.5088 61.3848C61.9621 64.8596 58.5144 67.0987 54.7109 67.0987H1.47852L12.1768 43.0401C13.7228 39.5638 17.171 37.3233 20.9756 37.3233H61.0879C67.2932 37.3231 72.9168 33.6709 75.4404 28.002L84.9346 6.67387C86.4812 3.19917 89.9281 0.960088 93.7314 0.960007H146.933L136.247 25.0147Z";
const CoinMark = () => (
  <svg className="vk-mark" viewBox="0 0 149 148" aria-hidden="true">
    <path d={SAHI_MARK} />
  </svg>
);

/* One stack: `n` coins, the first `base` grey (what went in), the rest green (gained) or dashed red (lost).

   Motion (physical, so it keeps real-world timing rather than the <300ms UI rule):
   - Coins added fall in with gravity, one after another, and the stagger counts from the first NEW coin. Going from 3 to 5
     years, the extra coins start falling at once instead of waiting out the delay of the ones already standing.
   - Coins taken away are lifted off: top coin first, each rising 18px and fading in 220ms. They stay mounted until that has
     played, so the stack never just snaps shorter.
   - The top coin's glint is timed to its own landing. */
const DROP_GAP = 35; // ms between coins falling
const LIFT_GAP = 25; // ms between coins lifting off
const LIFT_MS = 220;
type Kind = "in" | "gain" | "lost";
const kindOf = (k: number, base: number, tone: "up" | "down"): Kind => (k < base ? "in" : tone === "up" ? "gain" : "lost");

export function CoinStack({ n, base, tone, shine = 0 }: { n: number; base: number; tone: "up" | "down"; shine?: number }) {
  const prev = useRef({ n: 0, base: 0, tone });
  const [leaving, setLeaving] = useState<{ from: number; base: number; tone: "up" | "down" } | null>(null);
  // Where the new coins start, for the stagger. Read during render, updated after commit.
  const firstNew = n > prev.current.n ? prev.current.n : n;
  useLayoutEffect(() => {
    const was = prev.current;
    if (n < was.n) setLeaving({ from: was.n, base: was.base, tone: was.tone });
    else if (n > was.n) setLeaving(null);
    prev.current = { n, base, tone };
  }, [n, base, tone]);
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLeaving(null), (leaving.from - n) * LIFT_GAP + LIFT_MS + 40);
    return () => window.clearTimeout(t);
  }, [leaving, n]);

  const total = leaving ? Math.max(n, leaving.from) : n;
  return (
    <span className="vk-stack" style={{ height: n ? (n - 1) * COIN_STEP + COIN_H : 0 }} aria-hidden="true">
      <span className="vk-lift">
        {Array.from({ length: total }, (_, k) => {
          const out = k >= n;
          const kind = out && leaving ? kindOf(k, leaving.base, leaving.tone) : kindOf(k, base, tone);
          const top = out ? k === total - 1 : k === n - 1;
          const style = {
            bottom: k * COIN_STEP,
            "--d": `${Math.max(0, k - firstNew) * DROP_GAP}ms`,
            "--o": `${(total - 1 - k) * LIFT_GAP}ms`,
          } as CSSProperties;
          return (
            <i key={k} className={`vk-coin ${kind}${top ? " top" : ""}${out ? " out" : ""}`} style={style}>
              {top && kind !== "lost" && <CoinMark />}
              {/* tap: the top coin's face catches the light again; re-keyed on every tap so it replays */}
              {top && !out && shine > 0 && <i key={shine} className="vk-shine" />}
            </i>
          );
        })}
      </span>
    </span>
  );
}

export function CoinsChart({ m, rows }: { m: CalcModel; rows: PeriodRow[] }) {
  const top = Math.max(...rows.map((r) => Math.max(r.value, r.invested)));
  const unit = top / MAX_COINS;
  // Tapping a stack does nothing but make it catch the light, a small reward for touching it.
  const [shine, setShine] = useState<Record<number, number>>({});
  const reflect = (y: number) => setShine((s) => ({ ...s, [y]: (s[y] ?? 0) + 1 }));
  return (
    <div className="vk">
      {rows.map((r) => {
        const coinsIn = Math.max(1, Math.round(r.invested / unit));
        const coinsOut = Math.max(1, Math.round(r.value / unit));
        const n = m.open ? Math.max(coinsIn, coinsOut) : 0;
        return (
          <div key={r.label} className="vk-col" onPointerDown={() => reflect(r.years)}>
            {/* Above: what it became (green, like the green coins), then what went in (grey, like the grey coins). */}
            <span className="vk-fig">
              <span className={`vk-x ${r.tone}`}>
                <Ticker value={r.value} format={short} armed={m.open} />
              </span>
              <span className="vk-from">
                from <b>{short(r.invested)}</b>
              </span>
            </span>
            <CoinStack n={n} base={Math.min(coinsIn, coinsOut)} tone={r.tone} shine={shine[r.years]} />
            {/* Below: the period, and its return under it. */}
            <span className="vk-label">
              <span>{yearsText(r.years)}</span>
              <b className={r.tone}>{pct(r.change, 1)}</b>
            </span>
          </div>
        );
      })}
    </div>
  );
}
