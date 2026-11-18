import "./idp-vars.css";
import "./fundidp.css";
import "./charges.css";
import "./folds.css";
import "./stats.css";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../../assets";
import { Icon } from "./Icon";
import { cutoffKind, fundById, funds, riskLevels, type Fund } from "../data";
import {
  afterCutoff,
  cutoffLabel,
  fmtDay,
  fmtFull,
  inr,
  navDay,
  nextBusinessDay,
  navSeries,
  parseDay,
  pct,
  ranges,
  smoothPath,
  type Range,
} from "./format";
import {
  FundMark,
  Disclaimer,
  Notice,
  Fold,
  fundCategory,
  ManagerAvatar,
  RISK_TONES,
  Riskometer,
  RowSide,
  Row,
  type ReturnBasis,
  Screen,
  SegmentSwitcher,
  Sheet,
  SheetLine,
  Stars,
} from "./parts";
import { Dial, ReturnCalculator } from "./ReturnCalculator";
import { Ticker } from "./calc/core";
import { SAHI_MARK } from "./calc/coins";
import { sipReturns } from "./sip";
import { portfolioOf, weightText } from "./portfolio";
import { BottomSheet } from "./Sheet";
import { RISK_COPY, outcomes, whyRisk, type Outcomes } from "./risk";
import { ManagerSheet } from "./ManagerSheet";
import { hostOf, infoFor, joinedAfterLaunch, managerSince, otherFunds, sinceText, tenureText, yearsLabel } from "./managers";
import { useMf } from "../store";
import { KyroCard, KyroSheet } from "./kyro";

// ---- Fund page ---------------------------------------------------------------------

/* The chart is drawn in real pixels (not a stretched 100x100 box) so the dots stay round.
   The dotted area is the web's: a 4px grid of 0.7px dots, brightest under the line, fading to nothing at the bottom. */
export function FundRow({ fund, basis = "3Y" }: { fund: Fund; basis?: ReturnBasis }) {
  const { push } = useMf();
  return (
    <button className="list-row-idp fund-row-idp" onClick={() => push({ name: "fund", fundId: fund.id })}>
      <FundMark fund={fund} />
      <span className="row-main-idp">
        <b>{fund.name}</b>
        <small>
          {fundCategory(fund)} • <Stars n={fund.stars} />
          {fund.lockIn && ` • ${fund.lockIn.replace(" years", "-year")} lock-in`}
        </small>
      </span>
      <RowSide fund={fund} basis={basis} />
    </button>
  );
}


function NavChart({ fund, range, onRange, navOn }: { fund: Fund; range: Range; onRange: (r: Range) => void; navOn: Date }) {
  const plot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const el = plot.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { pts, values, change } = useMemo(() => navSeries(fund.id, range, fund.r1, fund.r3, fund.r5), [fund, range]);
  const tone = change >= 0 ? "up" : "down";
  const { w, h } = size;
  const line = useMemo(() => (w ? smoothPath(pts, w, h) : ""), [pts, w, h]);
  const top = Math.min(...pts.map(([, y]) => (1 - y) * h));

  // Touch (or hover) the chart: a line follows the finger with the NAV and date above it. The series is the same sample path as the
  // line; each point's NAV works back from today's NAV (the last point), and its date is spread evenly from the start of the range to the NAV date.
  const lineRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<{ on: boolean; x: number; y: number; nav: number; date: Date }>({ on: false, x: 0, y: 0, nav: fund.nav, date: navOn });
  const startOn = useMemo(() => {
    const d = new Date(navOn);
    if (range === "ALL") return parseDay(fund.launched);
    const back = { "1M": [0, 1], "6M": [0, 6], "1Y": [1, 0], "3Y": [3, 0], "5Y": [5, 0] }[range]!;
    d.setFullYear(d.getFullYear() - back[0], d.getMonth() - back[1]);
    return d;
  }, [range, navOn, fund.launched]);
  const trackAt = (clientX: number, on = true) => {
    const el = plot.current;
    if (!el || !w) return;
    const x = Math.min(w, Math.max(0, clientX - el.getBoundingClientRect().left));
    const f = (x / w) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const gain = values[i] + (values[i + 1] - values[i]) * (f - i);
    const nav = (fund.nav * (1 + gain / 100)) / (1 + change / 100);
    const date = new Date(startOn.getTime() + (navOn.getTime() - startOn.getTime()) * (x / w));
    // the dot rides the drawn (smoothed) line: find the point on the path at this x
    let y = (1 - pts[Math.round(f)][1]) * h;
    const path = lineRef.current;
    if (path) {
      let lo = 0;
      let hi = path.getTotalLength();
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x < x) lo = mid;
        else hi = mid;
      }
      y = path.getPointAtLength(hi).y;
    }
    setScrub({ on, x, y, nav, date });
  };
  // keep the label inside the chart's edges
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (!label || !scrub.on) return;
    const lw = label.offsetWidth;
    label.style.transform = `translateX(${Math.min(Math.max(-lw / 2, -scrub.x), w - scrub.x - lw)}px)`;
  }, [scrub.x, scrub.nav, scrub.on, w]);

  return (
    <div className="mf-chart-idp">
      <div
        className="mf-chart-plot-idp"
        ref={plot}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId); // keep following the finger if it slides off the chart
          } catch {
            /* not an active pointer (a synthetic event): tracking still works */
          }
          trackAt(e.clientX);
        }}
        onPointerMove={(e) => {
          // a finger or pen only counts while it is down; a mouse follows the hover
          if (e.pointerType === "mouse" || scrub.on) trackAt(e.clientX);
        }}
        onPointerUp={(e) => e.pointerType !== "mouse" && setScrub((s) => ({ ...s, on: false }))}
        onPointerCancel={() => setScrub((s) => ({ ...s, on: false }))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setScrub((s) => ({ ...s, on: false }))}
      >
        {w > 0 && (
          // Mounts once, when the chart first has a size, so the draw-in plays when the page opens and not on every range change.
          <div className="chart-reveal">
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className={`chart-dots ${tone}`}>
              <defs>
                <pattern id={`${uid}d`} width="4" height="4" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r=".7" />
                </pattern>
                <linearGradient id={`${uid}v`} x1="0" y1={top} x2="0" y2={h} gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#fff" stopOpacity=".9" />
                  <stop offset=".55" stopColor="#fff" stopOpacity=".3" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
                  <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${uid}v)`} />
                </mask>
              </defs>
              <rect width={w} height={h} fill={`url(#${uid}d)`} mask={`url(#${uid}m)`} opacity=".665" />
              <path className={`chart-line ${tone}`} d={line} ref={lineRef} />
            </svg>
          </div>
        )}
        <div className={`chart-scrub ${tone}${scrub.on ? " on" : ""}`} aria-hidden="true" style={{ left: scrub.x }}>
          <i className="chart-scrub-line" />
          <i className="chart-scrub-dot" style={{ top: scrub.y }} />
          <div className="chart-scrub-label" ref={labelRef}>
            <b>{inr(scrub.nav, 2)}</b>
            <span>{fmtFull(scrub.date)}</span>
          </div>
        </div>
      </div>
      <div className="mf-ranges-idp" role="tablist" aria-label="Chart range">
        {ranges.map((r) => (
          <button key={r} className={r === range ? "on" : ""} onClick={() => onRange(r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

type PfRow = { name: string; weight: number; sub?: string; change?: number | null };

/* A list of holdings: name (and sector) on the left, share of the fund on the right. With `showChange`, the change since last month
   sits under the share as a coloured percentage, like the returns elsewhere (green up, red down, no arrows). */
function PfList({ rows, showChange }: { rows: PfRow[]; showChange?: boolean }) {
  return (
    <ul className="pf-list">
      {rows.map((r, i) => (
        <li key={r.name} style={{ "--k": i } as CSSProperties}>
          <span className="pf-name">
            {r.name}
            {r.sub && <small>{r.sub}</small>}
          </span>
          <span className="pf-num">
            <b>{weightText(r.weight)}</b>
            {showChange && r.change !== undefined && <PfChange change={r.change} />}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PfChange({ change }: { change: number | null }) {
  if (change === null) return <small className="pf-chg new">New</small>;
  if (Math.abs(change) < 0.005) return <small className="pf-chg">No change</small>;
  return <small className={`pf-chg ${change > 0 ? "up" : "down"}`}>{pct(change, 2)}</small>;
}

/* What the fund is made of, in one bar: equity, debt, cash. Colours are the DLS palette (see .pf-mixbar in mf.css). */
function PfMix({ tiles, palette = ["pfc0", "pfc1", "pfc2"], padTo }: { tiles: { label: string; value: number }[]; palette?: string[]; padTo?: number }) {
  const parts = tiles.filter((t) => t.value > 0);
  // `padTo`: the bar stands for this many % (100 = the whole fund); anything the parts do not cover stays an empty track
  const left = padTo ? Math.max(0, padTo - parts.reduce((a, t) => a + t.value, 0)) : 0;
  const tone = (i: number) => palette[i] ?? "pfc3";
  return (
    <div className="pf-mix">
      <div className="pf-mixbar" role="img" aria-label={parts.map((t) => `${t.label} ${t.value.toFixed(1)}%`).join(", ")}>
        {parts.map((t, i) => (
          <i key={t.label} className={tone(i)} style={{ flexGrow: t.value }} />
        ))}
        {left > 0 && <i className="pad" style={{ flexGrow: left }} />}
      </div>
      <ul className="pf-legend">
        {parts.map((t, i) => (
          <li key={t.label}>
            <i className={tone(i)} />
            {t.label}
            <b>{t.value.toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Kyro's read of the holdings, the SAME shape for every view and every kind of fund: a short headline and one sentence of numbers.
   A new view only has to return these two strings.
   Companies: how spread out the fund is. Our rule of thumb from the share held by the ten biggest (Morningstar treats over 45% as
   concentrated): under 30% well spread, 30 to 45% fairly concentrated, over 45% concentrated. Index funds are concentrated by
   design, so they say what they do; debt funds hold a few dozen short-term instruments by design, so they get the count, no label.
   Sectors / types: who leads, and how much the three biggest take. Metal funds: they hold a few ETFs, so say that. */
function pfInsightFor(fund: Fund, p: ReturnType<typeof portfolioOf>, view: "groups" | "items"): { headline: string; detail: string } {
  const n = p.items.length;
  const sum = (ws: number[]) => ws.reduce((a, b) => a + b, 0).toFixed(1);
  if (!p.groupLabel) {
    const metal = fund.catLabel.includes("Silver") ? "silver" : "gold";
    return { headline: "Held through ETFs", detail: `The fund buys ${n} ${metal} ETFs. The biggest is ${p.items[0].name}, at ${weightText(p.items[0].weight)}.` };
  }
  if (view === "groups") {
    const k = Math.min(3, p.groups.length);
    return {
      headline: `Led by ${p.groups[0].name}`,
      detail: `${p.groups.length} ${p.groupLabel.toLowerCase()}, and the ${k} biggest make up ${sum(p.groups.slice(0, k).map((g) => g.weight))}% of the fund.`,
    };
  }
  const k = Math.min(10, n);
  const top = p.items.slice(0, k).reduce((a, i) => a + i.weight, 0);
  const noun = p.itemLabel.toLowerCase();
  if (fund.cat === "debt" || fund.cat === "liquid") {
    return { headline: `${n} ${noun}`, detail: n <= 10 ? `Together they make up ${top.toFixed(1)}% of the fund.` : `The ${k} biggest make up ${top.toFixed(1)}% of the fund.` };
  }
  const headline = fund.cat === "index" ? "Tracks an index" : top < 30 ? "Well spread" : top < 45 ? "Fairly concentrated" : "Concentrated";
  return { headline, detail: n <= 10 ? `${n} ${noun}.` : `${n} ${noun}, and the ${k} biggest make up ${top.toFixed(1)}% of the fund.` };
}

/* The six levels in a sheet: only the levels and what each one means, no dial. This fund's row is tinted and tagged. Motion: the rows
   rise one after another once the sheet is on its way up (transform and opacity only, 40ms apart), then this fund's tint fades in
   last so the eye lands on it. Reduced motion: no rise, the tint is just there. */
function RiskLevelsSheet({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  return (
    <BottomSheet title="How risk levels work" sub="Set by SEBI. Every fund gets one of six." fit onClose={onClose}>
      <ol className="rl-list">
        {riskLevels.map((level, i) => (
          <li key={level} className={level === fund.risk ? "here" : undefined} style={{ "--k": i } as CSSProperties}>
            <i className={RISK_TONES[Math.floor(i / 2)].name}>{i + 1}</i>
            <span>
              <b>{level}</b>
              <small>{RISK_COPY[level].meaning}</small>
            </span>
            {level === fund.risk && <em>This fund</em>}
          </li>
        ))}
      </ol>
    </BottomSheet>
  );
}

/* Riskometer widget. Mobbin research (Nutmeg, Acorns, Lightyear, Shopee, Monzo) says people want four things, in this order:
   how risky (the SEBI level, as the dial), what that means in plain words (and how it compares with similar funds), what a bad
   patch has actually looked like in rupees (biggest fall, what 10,000 dipped to, how long to recover), and who it suits.
   The six levels explained sit behind one tap. The rough-patch figures are sample numbers, see risk.ts. */
const pctText = (v: number) => `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(v)}%`;

/* The range bar for one span: from the worst to the best result, red where it lost money and green where it gained, a dot at the typical
   one. Both spans share one scale, so switching from 1 year to 5 years slides the ends and the dot and the range visibly narrows. */
function RangeBar({ range, years, axis }: { range: Outcomes["oneYear"]; years: number; axis: { min: number; max: number } }) {
  const span = axis.max - axis.min || 1;
  const at = (v: number) => ((v - axis.min) / span) * 100;
  const lossEnd = Math.min(range.worst, 0);
  const gainStart = Math.max(range.worst, 0);
  return (
    <div className="risk-range">
      <div className="risk-bar" aria-hidden="true">
        <i className="neg" style={{ left: `${at(lossEnd)}%`, width: `${at(0) - at(lossEnd)}%` }} />
        <i className={`pos${range.worst < 0 ? "" : " alone"}`} style={{ left: `${at(gainStart)}%`, width: `${at(Math.max(range.best, 0)) - at(gainStart)}%` }} />
        {axis.min < 0 && <u className="zero" style={{ left: `${at(0)}%` }} />}
        <em className="dot" style={{ left: `${at(range.typical)}%` }} />
      </div>
      <dl className="risk-three" aria-live="polite">
        <div>
          <dt>Worst</dt>
          <dd className={range.worst < 0 ? "down" : undefined}>{pctText(range.worst)}{years === 5 && <small> a year</small>}</dd>
        </div>
        <div>
          <dt>Typical</dt>
          <dd>{pctText(range.typical)}{years === 5 && <small> a year</small>}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{pctText(range.best)}{years === 5 && <small> a year</small>}</dd>
        </div>
      </dl>
    </div>
  );
}

const SHOW_RISKOMETER = false;

function RiskWidget({ fund }: { fund: Fund }) {
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [span, setSpan] = useState<"1" | "5">("1");
  const spread = outcomes(fund);
  const axis = { min: Math.min(0, spread.oneYear.worst), max: spread.oneYear.best }; // one scale for both rows, so five years visibly narrows the range
  return (
    <div className="risk">
      <div className="risk-top">
        <Riskometer risk={fund.risk} compact />
        <div className="risk-text">
          <b>{fund.risk}</b>
        </div>
      </div>

      <h4 className="pf-sub risk-sub">Reason</h4>
      <p className="risk-why">{whyRisk(fund)}</p>

      <div className="risk-behaved">
        <h4 className="pf-sub risk-sub">How it has behaved</h4>
        <button className="mf-retswitch" onClick={() => setSpan(span === "1" ? "5" : "1")} aria-label={`Showing ${span === "1" ? "1 year" : "5 years"}. Change the period`}>
          <Icon name="caret-left-right" size={14} />
          <u>{span}Y</u>
        </button>
      </div>
      <RangeBar range={span === "1" ? spread.oneYear : spread.fiveYear} years={Number(span)} axis={axis} />

      <button className="rlc" onClick={() => setLevelsOpen(true)} aria-haspopup="dialog" aria-label={`How risk levels work. This fund is level ${riskLevels.indexOf(fund.risk) + 1} of 6`}>
        <span className="rlc-text">
          <b>How risk levels work</b>
          <small>Rated by SEBI on a scale of 6</small>
        </span>
        <span className="rlc-scale" aria-hidden="true">
          {riskLevels.map((level, i) => (
            <i key={level} className={`${RISK_TONES[Math.floor(i / 2)].name}${level === fund.risk ? " here" : ""}`} />
          ))}
        </span>
        <Icon name="caret-right" size={16} />
      </button>
      {levelsOpen && <RiskLevelsSheet fund={fund} onClose={() => setLevelsOpen(false)} />}
      <p className="mf-small-idp risk-note">
        Your principal will be at {fund.risk.toLowerCase()} risk. The fund house reviews this level every month against the actual portfolio.
      </p>
    </div>
  );
}

/* The Kyro card. It always has the same parts: the headline on the left, the Kyro mark on the right, one sentence below.
   The first time the widget opens, the mark spins big in the middle of the card (two turns), then settles into the top right
   corner, and only then do the headline and the sentence arrive, word by word. Switching view afterwards is only a quick fade:
   people switch often, so the beat is spent once. stage: think = mark in the middle, reveal = mark moves, text arrives,
   swap = quick fade. The mark is moved with a transform; how far (--dx, --dy) is measured from the card, so it works at any size. */
type PfStage = "think" | "reveal" | "swap";
function PfInsight({ headline, detail, stage }: { headline: string; detail: string; stage: PfStage }) {
  const words = detail.split(" ");
  const card = useRef<HTMLDivElement>(null);
  const by = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const c = card.current;
    const b = by.current;
    if (!c || !b) return;
    // offsetLeft/offsetTop ignore transforms, so this is the corner position whatever the mark is doing right now
    const measure = () => {
      c.style.setProperty("--dx", `${c.clientWidth / 2 - (b.offsetLeft + b.offsetWidth / 2)}px`);
      c.style.setProperty("--dy", `${c.clientHeight / 2 - (b.offsetTop + b.offsetHeight / 2)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, [detail]);
  return (
    <div className={`pf-insight ${stage}`} ref={card}>
      <div className="pf-insight-head">
        <b className="pf-insight-tag">{headline}</b>
        <span className="pf-insight-by" ref={by}>
          <img src={asset("kyro-mark-idp.svg")} alt="Kyro" width={16} height={16} draggable={false} />
        </span>
      </div>
      <p>
        {words.map((w, i) => (
          <span key={i}>
            <span className="w" style={{ "--w": Math.min(i, 14) } as CSSProperties}>
              {w}
            </span>{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

/* Fund page widget: what the fund is made of. First the kind of assets (one bar), then the two views people ask for: which
   sectors, or which exact companies, with one line on how spread out each is, five rows and the link to everything. */
function PortfolioWidget({ fund }: { fund: Fund }) {
  const { push } = useMf();
  const [holdingsOpen, setHoldingsOpen] = useState(false);
  const p = useMemo(() => portfolioOf(fund), [fund]);
  const [view, setView] = useState<"groups" | "items">("items");
  const showGroups = view === "groups" && !!p.groupLabel;
  const rows: PfRow[] = (showGroups ? p.groups.map((g) => ({ name: g.name, weight: g.weight })) : p.items.map((i) => ({ name: i.name, weight: i.weight, sub: p.groupLabel ? i.group : undefined }))).slice(0, 5);
  const insight = pfInsightFor(fund, p, view);
  // Kyro reads once, the first time the widget opens; after that a view change is only a quick fade.
  const [stage, setStage] = useState<PfStage>("think");
  const opened = useRef(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onOpen = (open: boolean) => {
    if (!open || opened.current) return;
    opened.current = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(() => setStage("reveal"), calm ? 0 : 1300); // spin 1100ms + a 200ms rest in the middle
  };
  const changeView = (v: "groups" | "items") => {
    setView(v);
    setStage((s) => (s === "think" ? s : "swap"));
  };
  return (
    <Fold title="Portfolio" summary={insight.headline} defaultOpen={false} onOpenChange={onOpen}>
      <p className="pf-asof">as of {p.asOf}</p>

      {/* two sections of their own: what kind of assets, then what exactly it holds */}
      <section className="pf-sec">
        <h4 className="pf-sub">Asset mix</h4>
        <PfMix tiles={p.tiles} />
      </section>

      <section className="pf-sec">
        <h4 className="pf-sub">Holdings</h4>
        {p.groupLabel && (
          <SegmentSwitcher
            wide
            className="seg-portfolio"
            label="Group the holdings by"
            value={view}
            onChange={changeView}
            options={[
              ["groups", p.groupLabel],
              ["items", p.itemLabel],
            ]}
          />
        )}
        {/* One bordered panel, laid out like "Invest in a sector": the one-line read, a count row, the rows, then the link to all. */}
        <div className="pf-panel" key={view}>
          <PfInsight headline={insight.headline} detail={insight.detail} stage={stage} />
          <div className="mf-allhead pf-allhead">
            <span>
              {showGroups ? `${p.groups.length} ${(p.groupLabel ?? "").toLowerCase()}` : `${p.items.length} ${p.itemLabel.toLowerCase()}`}
            </span>
            <span>Share of fund</span>
          </div>
          <PfList rows={rows} />
          <button className="pf-all" onClick={() => setHoldingsOpen(true)}>
            View all {p.items.length} holdings
            <Icon name="caret-right" size={16} />
          </button>
        </div>
        {holdingsOpen && <HoldingsSheet fund={fund} onClose={() => setHoldingsOpen(false)} />}
      </section>
    </Fold>
  );
}

/* Every holding of the fund, on its own page: search, sectors or companies, the share of each and how it moved since last month. */
/* The holdings list (search, group by, the list), shown in the tall sheet (HoldingsSheet). */
function HoldingsBody({ fund, showHead }: { fund: Fund; showHead?: boolean }) {
  const p = useMemo(() => portfolioOf(fund), [fund]);
  const [view, setView] = useState<"groups" | "items">("items");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const showGroups = view === "groups" && !!p.groupLabel;
  const all: PfRow[] = showGroups
    ? p.groups.map((g) => ({ name: g.name, weight: g.weight }))
    : p.items.map((i) => ({ name: i.name, weight: i.weight, sub: p.groupLabel ? i.group : undefined, change: i.change }));
  const rows = needle ? all.filter((r) => `${r.name} ${r.sub ?? ""}`.toLowerCase().includes(needle)) : all;
  // Sectors view: the three biggest sectors as one bar, so the main sector stands out before the list does
  const sectorMix =
    showGroups && !needle && p.groups.length > 3
      ? (() => {
          const top = p.groups.slice(0, 3);
          const total = p.groups.reduce((a, g) => a + g.weight, 0);
          return [...top.map((g) => ({ label: g.name, value: g.weight })), { label: `Other ${(p.groupLabel ?? "sectors").toLowerCase()}`, value: total - top.reduce((a, g) => a + g.weight, 0) }];
        })()
      : null;
  return (
    <>
      {showHead && (
      <div className="pf-page-head">
        <FundMark fund={fund} size={40} />
        <div>
          <h2 className="pf-page-title">{fund.name}</h2>
          <p className="pf-page-sub">
            {p.items.length} holdings, as of {p.asOf}
          </p>
        </div>
      </div>
      )}
      <label className="mf-search-input pf-search">
        <Icon name="magnifying-glass" size={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${p.itemLabel.toLowerCase()}${p.groupLabel ? ` or ${p.groupLabel.toLowerCase()}` : ""}`} autoComplete="off" />
      </label>
      {p.groupLabel && (
        <SegmentSwitcher
          wide
          className="seg-portfolio"
          label="Group the holdings by"
          value={view}
          onChange={setView}
          options={[
            ["groups", p.groupLabel],
            ["items", p.itemLabel],
          ]}
        />
      )}
      {rows.length > 0 ? (
        <div className="pf-screen" key={`${view}-${needle ? "q" : "all"}`}>
          {sectorMix && (
            <section className="pf-sec pf-card">
              <h4 className="pf-sub">Biggest {(p.groupLabel ?? "sectors").toLowerCase()}</h4>
              <PfMix tiles={sectorMix} palette={["pfc0", "pfc1", "pfc2", "pfc3"]} padTo={100} />
            </section>
          )}
          <p className="pf-cap">
            <span>{showGroups ? p.groupLabel : p.itemLabel}</span>
            <span className="pf-cap-r">{showGroups ? "Share of fund" : "Share of fund · change since last month"}</span>
          </p>
          <PfList rows={rows} showChange={!showGroups} />
        </div>
      ) : (
        <p className="mf-empty">Nothing matches &ldquo;{q.trim()}&rdquo;.</p>
      )}
    </>
  );
}


function HoldingsSheet({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const p = useMemo(() => portfolioOf(fund), [fund]);
  return (
    <BottomSheet title="Holdings" sub={`${p.items.length} holdings, as of ${p.asOf}`} onClose={onClose}>
      <HoldingsBody fund={fund} />
    </BottomSheet>
  );
}

function ageText(launched: string) {
  const d = new Date(launched);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth() - (now.getDate() < d.getDate() ? 1 : 0);
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  return years >= 1 ? `${years} ${years === 1 ? "yr" : "yrs"} old` : `${months} ${months === 1 ? "month" : "months"} old`;
}

function launchedAge(launched: string) {
  const text = ageText(launched);
  return text ? <span className="age"> ({text})</span> : null;
}

// ---- Charges and tax ----------------------------------------------------------------
// Three questions, each a small group of "when / what" rows: the number sits on the right, the words stay short on the left.
// No sentence mixes the two. "Nil" is shown in green so the good news is seen first.
const dayWord = (days: number) =>
  days % 365 === 0 ? `${days / 365} ${days === 365 ? "year" : "years"}` : days === 30 ? "1 month" : days % 30 === 0 && days < 365 ? `${days / 30} months` : `${days} ${days === 1 ? "day" : "days"}`;
const pctWord = (v: number) => `${Number(v.toFixed(3))}%`;

function ChargeRow({ title, note, value }: { title: string; note: ReactNode; value?: ReactNode }) {
  return (
    <li className="chg-row">
      <div className="chg-text">
        <span className="chg-title">{title}</span>
        <span className="chg-note">{note}</span>
      </div>
      {value ? <b>{value}</b> : null}
    </li>
  );
}

function ChargesAndTax({ fund }: { fund: Fund }) {
  const steps = [...fund.loads].sort((x, y) => x.days - y.days);
  const last = steps[steps.length - 1];
  // Tax comes in three kinds: equity (20% under a year, 12.5% after, first ₹1.25 lakh free), gold and silver (slab under two years, 12.5% after), and debt (slab rate always).
  // Prototype: the kind rotates through the fund list so every state can be seen on the funds page, whatever the category.
  const taxKind = (["equity", "gold", "debt"] as const)[Math.max(0, funds.findIndex((f) => f.id === fund.id)) % 3];
  const tax =
    taxKind === "debt"
      ? "Returns are taxed as per your Income Tax slab."
      : taxKind === "gold"
        ? "If you redeem within two years, returns are taxed as per your Income Tax slab. If you redeem after two years, returns are taxed at 12.5%."
        : "If you redeem within one year, returns are taxed at 20%. If you redeem after one year, returns exceeding ₹1.25 lakh in a financial year are taxed at 12.5%.";
  // Exit load: the charge on the right, the condition under the title. Nil, a lock-in, one step, a ladder of steps, or a
  // day-by-day scale (liquid funds). With a ladder or a scale the right side shows the highest charge, "Up to 1%".
  const scale = steps.length > 3;
  const top = steps.reduce((mx, t) => Math.max(mx, t.pct), 0);
  const exit: { value: string; note: ReactNode } = fund.lockIn
    ? { value: "Nil", note: `Units are locked in for ${fund.lockIn}, so they can't be redeemed before that.` }
    : !last
      ? { value: "Nil", note: "No charge whenever you redeem." }
      : scale
        ? { value: `Up to ${pctWord(top)}`, note: `${pctWord(steps[0].pct)} on day ${steps[0].days}, reducing to ${pctWord(last.pct)} by day ${last.days}. Nil after that.` }
        : steps.length === 1
          ? {
              value: pctWord(last.pct),
              note: (
                <>
                  If you redeem within {dayWord(last.days)}.<br />
                  Nil after that.
                </>
              ),
            }
          : { value: `Up to ${pctWord(top)}`, note: `${steps.map((t) => `${pctWord(t.pct)} within ${dayWord(t.days)}`).join(", ")}. Nothing after that.` };
  const exitNote = fund.loadFree && last && !fund.lockIn ? <>{exit.note} The first {Math.round(fund.loadFree * 100)}% of units each year are free.</> : exit.note;
  return (
    <ul className="chg">
      <ChargeRow title="Expense ratio" note="Inclusive of GST and statutory charges" value={`${fund.expense}% a year`} />
      <ChargeRow title="Exit load" note={exitNote} value={exit.value} />
      <ChargeRow title="Tax implication" note={tax} />
    </ul>
  );
}

export function FundScreen({ fundId }: { fundId: string }) {
  const { pop, push } = useMf();
  const fund = fundById(fundId);
  const [range, setRange] = useState<Range>("3Y");
  // The figure counts up from 0 as the chart draws in when the page opens (and re-counts to the new value when the range changes).
  const [counting, setCounting] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setCounting(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Over 1 year and up the figure is a yearly rate (annualised), as on the Returns fold: 3Y +84.3% in total is +22.6% a year.
  const totalChange = navSeries(fund.id, range, fund.r1, fund.r3, fund.r5).change;
  const rangeYears = range === "3Y" ? 3 : range === "5Y" ? 5 : 0;
  const rangeChange = rangeYears ? (Math.pow(1 + totalChange / 100, 1 / rangeYears) - 1) * 100 : totalChange;
  const now = new Date();
  const lastNav = navDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const navOn = afterCutoff(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) ? nextBusinessDay(lastNav) : lastNav;
  const navDate = fmtDay(navOn);
  const riskText = `${fund.risk.charAt(0)}${fund.risk.slice(1).toLowerCase()} risk`;
  // Returns widget: what a lumpsum earned, or what a monthly SIP earned (worked out from the same published numbers, see ./sip).
  const [retMode, setRetMode] = useState<"lump" | "sip">("lump");
  const [sheetFor, setSheetFor] = useState<string | null>(null); // the manager whose sheet is open
  const [kyro, setKyro] = useState<{ q?: string } | null>(null); // the Kyro sheet, opened empty or with a question asked
  const mine: [number, number, number] = retMode === "lump" ? [fund.r1, fund.r3, fund.r5] : sipReturns([fund.r1, fund.r3, fund.r5]);
  const avg: [number, number, number] = retMode === "lump" ? fund.avg : sipReturns(fund.avg);
  const rows: [string, number, number][] = [
    ["1Y", mine[0], avg[0]],
    ["3Y", mine[1], avg[1]],
    ["5Y", mine[2], avg[2]],
  ];

  return (
    <Screen
      onBack={pop}
      plainBack
      dockTitle={
        <>
          <FundMark fund={fund} size={24} />
          <span className="dock-name">{fund.name}</span>
        </>
      }
      footer={
        // The fund house can close a fund to new money (see Fund.buy): no buttons for a paused fund, only the SIP for one that took one-time buys off.
        fund.buy === "halted" ? (
          <button className="mf-btn solid wide" disabled>
            New investments paused
          </button>
        ) : fund.buy === "restricted" ? (
          // A fund this person can't buy (like Groww, but with no dead buttons): the bottom bar says why and offers nothing to tap.
          <p className="mf-foot-note-idp">{fund.buyNote}</p>
        ) : fund.buy === "sip-only" ? (
          <button className="mf-btn solid wide" onClick={() => push({ name: "amount", fundId, mode: "sip" })}>
            Start SIP
          </button>
        ) : (
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={() => push({ name: "amount", fundId, mode: "lump" })}>
              Invest One-time
            </button>
            <button className="mf-btn solid" onClick={() => push({ name: "amount", fundId, mode: "sip" })}>
              Start SIP
            </button>
          </div>
        )
      }
    >
      <div className="fund-hero">
        {/* The logo is a two-sided card: it arrives showing its back (the SAHI mark) and turns over to the fund's logo. */}
        <span className="fund-flip">
          <FundMark fund={fund} size={48} />
          <span className="fund-flip-back" aria-hidden="true">
            <svg viewBox="0 0 149 148">
              <path d={SAHI_MARK} />
            </svg>
          </span>
        </span>
        <h2 data-dock-anchor>{fund.name}</h2>
        <p className="fund-meta-idp">
          {fund.plan ?? "Direct"} • {fundCategory(fund)} • <Stars n={fund.stars} bds /> • {riskText}
        </p>
      </div>
      {fund.buyNote && fund.buy !== "restricted" && <Notice tone="warn">{fund.buyNote}</Notice>}

      <div className="fund-figures-idp">
        <div className="fund-main">
          <strong className={rangeChange >= 0 ? "up" : "down"}>
            <Ticker value={rangeChange} format={(v) => pct(v, 1)} armed={counting} ms={700} />
          </strong>
          <small>{range === "ALL" ? "Since inception" : rangeYears ? `${range} annualised` : `${range} change`}</small>
        </div>
        {/* today's change in the NAV; it does not follow the chart range */}
        <div className="fund-day">
          <b className={fund.navChange >= 0 ? "up" : "down"}>{pct(fund.navChange, 2)}</b>
          <small>1D</small>
        </div>
      </div>

      <NavChart fund={fund} range={range} onRange={setRange} navOn={navOn} />

      <dl className="fund-stats">
        <div>
          <dt>NAV · {navDate}</dt>
          <dd>₹{fund.nav.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</dd>
        </div>
        <div>
          <dt>Min. SIP</dt>
          <dd>{inr(fund.minSip)}</dd>
        </div>
        <div>
          <dt>AUM</dt>
          <dd>{fund.aum}</dd>
        </div>
      </dl>

      {/* Facts first, then Kyro's reading of them (same order as the basket page). */}
      <KyroCard fund={fund} onAsk={(q) => setKyro({ q })} />
      {kyro && <KyroSheet fund={fund} question={kyro.q} onClose={() => setKyro(null)} />}

      <Fold
        title="Returns"
        defaultOpen={false}
        summary={
          <>
            <b className={mine[1] >= 0 ? "up" : "down"}>{pct(mine[1], 1)}</b> a year over 3 years
          </>
        }
      >
        <SegmentSwitcher
          wide
          className="seg-returns"
          label="How the returns are measured"
          value={retMode}
          onChange={setRetMode}
          options={[
            ["lump", "Lumpsum"],
            ["sip", "SIP"],
          ]}
        />
        {/* same panel as Portfolio > Holdings: the switch above, the table and its note inside one box */}
        <div className="pf-panel">
          <table className="mf-table-idp">
            <thead>
              <tr>
                <th />
                <th>1Y</th>
                <th>3Y</th>
                <th>5Y</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>This fund</td>
                {rows.map(([k, v]) => (
                  <td key={k} className={v >= 0 ? "up" : "down"}>
                    <b>{pct(v, 1)}</b>
                  </td>
                ))}
              </tr>
              {/* The category average is a lumpsum figure, so SIP returns (XIRR) don't get one. The row stays, invisible, so the fold keeps its height and columns when the tab changes. */}
              <tr className={retMode === "sip" ? "mf-row-blank" : undefined} aria-hidden={retMode === "sip" || undefined}>
                <td>Category average</td>
                {rows.map(([k, , a]) => (
                  <td key={k}>{pct(a, 1)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mf-small-idp">
            {retMode === "lump" ? "Annualised, for a lumpsum held the whole period." : "Annualised (XIRR), for a monthly SIP over the period."} Past
            performance does not predict future returns.
          </p>
        </div>
      </Fold>

      <ReturnCalculator fund={fund} />

      <PortfolioWidget fund={fund} />


      <Fold title="About the fund" summary={ageText(fund.launched) ?? undefined} defaultOpen={false} boxed>
        <p className="mf-body-copy-idp">{fund.aim}</p>
        {/* the facts that are not shown anywhere else on the page: AUM and Min. SIP are in the top row, the expense ratio is under Charges and tax */}
        <div className="mf-grid2-idp about-facts">
          <Row label="Minimum one-time" value={fund.buy === "restricted" ? "Not available" : fund.buy ? "Not open" : inr(fund.minLump)} />
          <Row label="Launched" value={<>{fund.launched}{launchedAge(fund.launched)}</>} />
        </div>
        <div className="mgr-list">
          <small>Managed by</small>
          {fund.managers.map((name) => {
            const since = managerSince(name, fund);
            const years = yearsLabel(infoFor(name));
            const line = [since && `Since ${sinceText(since)}`, years && `${years} experience`].filter(Boolean).join(" · ");
            return (
              <button key={name} className="mgr-row" onClick={() => setSheetFor(name)}>
                <ManagerAvatar name={name} photo={infoFor(name).photo} zoom={infoFor(name).photoZoom} />
                <span className="mgr-text">
                  <b>{name}</b>
                  {line && <small>{line}</small>}
                </span>
                <Icon name="caret-right" size={16} />
              </button>
            );
          })}
        </div>
        {sheetFor && (
          <ManagerSheet
            fund={fund}
            start={sheetFor}
            onClose={() => setSheetFor(null)}
            renderOthers={(who) => {
              const list = otherFunds(who, fund.id);
              return list.length ? (
                <ul className="row-list-idp">
                  {list.map((other) => (
                    <li key={other.id}>
                      <FundRow fund={other} />
                    </li>
                  ))}
                </ul>
              ) : null;
            }}
          />
        )}
        <button className="mf-link-idp">
          <Icon name="file-text-fill" size={16} />
          Scheme Information Document
          <Icon name="caret-right" size={16} />
        </button>
      </Fold>

      <Fold title="Charges and tax" summary={`${fund.expense}% a year`} defaultOpen={false} boxed>
        <ChargesAndTax fund={fund} />
      </Fold>

      {/* Archived for now (2026-11-16): set SHOW_RISKOMETER to true to bring the fold back. The RiskWidget code below is untouched. */}
      {SHOW_RISKOMETER && (
        <Fold title="Riskometer" summary={fund.risk} defaultOpen={false}>
          <RiskWidget fund={fund} />
        </Fold>
      )}

      {/* PRD dependency: fund data provider. The star rating comes from Value Research; keep this line until compliance says whether the licence needs it. */}
      <p className="mf-small-idp mf-source-idp">Star ratings by Value Research.</p>
      <Disclaimer />
    </Screen>
  );
}

// ---- Amount ----------------------------------------------------------------------

// SIP date sheet (Figma 28:7235): days 1–28 in weeks of seven; 29 and 30 shown but off,
// since not every month has them.
const SIP_DAY_ROWS = [1, 8, 15, 22, 29].map((start) =>
  Array.from({ length: start === 29 ? 2 : 7 }, (_, i) => start + i),
);

