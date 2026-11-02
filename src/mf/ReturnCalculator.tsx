import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Fund } from "./data";
import { inr, pct } from "./format";

type Mode = "sip" | "lump";

const periods = [
  { label: "1Y", years: 1, rate: (f: Fund) => f.r1 },
  { label: "3Y", years: 3, rate: (f: Fund) => f.r3 },
  { label: "5Y", years: 5, rate: (f: Fund) => f.r5 },
] as const;

/* What an amount would have become at the fund's own annualised return.
   SIP: one instalment at the start of every month, each growing at that same rate. */
function grow(mode: Mode, amount: number, years: number, annualPct: number) {
  const g = 1 + annualPct / 100;
  if (mode === "lump") return { invested: amount, value: amount * g ** years };
  const months = years * 12;
  const i = g ** (1 / 12) - 1;
  const invested = amount * months;
  const value = Math.abs(i) < 1e-9 ? invested : amount * (((1 + i) ** months - 1) / i) * (1 + i);
  return { invested, value };
}

/* Short labels for the ruler: 5K, 45K, 1L, 2.5L (K = thousand, L = lakh). */
const short = (v: number) => {
  const n = (x: number) => String(Math.round(x * 10) / 10);
  return v >= 100000 ? `${n(v / 100000)}L` : `${n(v / 1000)}K`;
};

/* Faint ticks past either end, getting a little shorter (13px down to 7px) so the scale trails off instead of stopping. */
const PAD_TICKS = 24;
function Pad({ side }: { side: "start" | "end" }) {
  const ticks = Array.from({ length: PAD_TICKS }, (_, k) => (
    <i key={k} style={{ "--h": `${13 - (k / (PAD_TICKS - 1)) * 6}px` } as CSSProperties} />
  ));
  // k = 0 is the tick next to the first/last value; on the start side it sits on the right.
  return (
    <span className={`rc-pad ${side}`} aria-hidden="true">
      {side === "start" ? ticks.reverse() : ticks}
    </span>
  );
}

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

const TICK = 9;

/* A ruler you scroll under a fixed centre marker. Native scroll-snap gives touch and trackpad momentum;
   a mouse can drag it, and the arrow keys step it. */
function Dial({
  min,
  max,
  step,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, left: 0, down: false, moved: false });
  const count = Math.round((max - min) / step) + 1;
  const index = Math.round((value - min) / step);
  const at = (i: number) => Math.min(count - 1, Math.max(0, i));

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollLeft = index * TICK;
    // Only on mount: after that the scroll position drives the value, not the other way round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = () => {
    const el = ref.current;
    if (!el) return;
    drag.current.down = false;
    el.classList.remove("dragging");
    el.scrollTo({ left: at(Math.round(el.scrollLeft / TICK)) * TICK, behavior: "smooth" });
  };

  return (
    <div className="rc-dial">
      <div
        ref={ref}
        className="rc-ruler"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={inr(value)}
        onScroll={(e) => {
          const i = at(Math.round(e.currentTarget.scrollLeft / TICK));
          if (i !== index) onChange(min + i * step);
        }}
        onKeyDown={(e) => {
          const move = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (!move) return;
          e.preventDefault();
          ref.current?.scrollTo({ left: at(index + move) * TICK, behavior: "smooth" });
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, down: true, moved: false };
          ref.current.classList.add("dragging");
          ref.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d.down || !ref.current) return;
          ref.current.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={settle}
        onPointerCancel={settle}
      >
        <Pad side="start" />
        {Array.from({ length: count }, (_, i) => {
          const v = min + i * step;
          const kind = v % (step * 10) === 0 ? "major" : v % (step * 5) === 0 ? "mid" : "";
          return <span key={v} className={`rc-tick ${kind}`} data-label={kind === "major" ? short(v) : undefined} />;
        })}
        <Pad side="end" />
      </div>
      <i className="rc-mark" aria-hidden="true" />
    </div>
  );
}


export function ReturnCalculator({ fund }: { fund: Fund }) {
  const sip = { min: Math.max(500, roundUp(fund.minSip, 500)), max: 50000, step: 500 };
  const lump = { min: Math.max(5000, roundUp(fund.minLump, 5000)), max: 500000, step: 5000 };
  const clamp = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, v));

  const [mode, setMode] = useState<Mode>("sip");
  const [amounts, setAmounts] = useState({ sip: clamp(5000, sip), lump: clamp(25000, lump) });
  const [pick, setPick] = useState<(typeof periods)[number]["label"]>("3Y");

  const range = mode === "sip" ? sip : lump;
  const amount = amounts[mode];
  const results = periods.map((p) => ({ ...p, ...grow(mode, amount, p.years, p.rate(fund)) }));
  const top = Math.max(...results.map((r) => Math.max(r.value, r.invested)));
  const chosen = results.find((r) => r.label === pick)!;
  const change = ((chosen.value - chosen.invested) / chosen.invested) * 100;
  const tone = change >= 0 ? "up" : "down";
  const bar = (v: number) => `${Math.max(3, (v / top) * 100)}%`;

  return (
    <section className="mf-section">
      <h3>Return calculator</h3>
      <p className="rc-lead">See what this fund would have turned your money into.</p>

      <div className="rc">
        <div className="rc-switch" role="tablist" aria-label="How you invest">
          {(
            [
              ["sip", "Monthly SIP"],
              ["lump", "One-time"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? "on" : ""} onClick={() => setMode(key)}>
              {label}
            </button>
          ))}
        </div>

        <span className="rc-label">{mode === "sip" ? "Monthly investment" : "One-time investment"}</span>
        <output className="rc-amount" aria-live="polite">
          {inr(amount)}
        </output>
        <Dial
          key={mode}
          label={mode === "sip" ? "Monthly investment" : "One-time investment"}
          {...range}
          value={amount}
          onChange={(v) => setAmounts((a) => ({ ...a, [mode]: v }))}
        />

        <div className="rc-cols" role="tablist" aria-label="Time period">
          {results.map((r) => {
            const t = r.value >= r.invested ? "up" : "down";
            return (
              <button
                key={r.label}
                role="tab"
                aria-selected={pick === r.label}
                className={`rc-col${pick === r.label ? " on" : ""}`}
                onClick={() => setPick(r.label)}
              >
                <span className="rc-bars" aria-hidden="true">
                  <i className="rc-in" style={{ height: bar(r.invested) }} />
                  <i className={`rc-out ${t}`} style={{ height: bar(r.value) }} />
                </span>
                <span className="rc-chip">{r.label}</span>
              </button>
            );
          })}
        </div>

        <dl className="rc-rows">
          <div>
            <dt>
              <i className="rc-dot in" />
              Total investment
            </dt>
            <dd>{inr(Math.round(chosen.invested))}</dd>
          </div>
          <div>
            <dt>
              <i className={`rc-dot out ${tone}`} />
              Would have become
            </dt>
            <dd>{inr(Math.round(chosen.value))}</dd>
          </div>
          <div className="rc-total">
            <dt>{pick} returns</dt>
            <dd className={tone}>{pct(change, 1)}</dd>
          </div>
        </dl>
      </div>

      <p className="mf-small">Based on this fund&rsquo;s past returns. Past performance does not predict future returns.</p>
    </section>
  );
}
