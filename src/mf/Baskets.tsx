// Researcher backed baskets: the home carousel, the "View all" page, a basket's own page (with the
// researchers sheet), and the amount, review and done screens. All sample data lives in baskets-data.ts.
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { asset } from "../assets";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import {
  basketAsFund,
  basketFundId,
  basketAvailability,
  basketById,
  basketExpense,
  basketFunds,
  basketMinimum,
  basketReturn3Y,
  basketReturns,
  baskets,
  comparePaths,
  COMPARE_INDEX,
  COMPARE_YEARS,
  NEXT_REVIEW,
  NIFTY_50,
  REVIEWED,
  researchers,
  riskLabel,
  basketRisk,
  sipReturns,
  splitQualification,
  type Basket,
  type CompareRange,
} from "./baskets-data";
import { riskLevels, type Risk } from "./data";
import { inr, pct } from "./format";
import {
  FundMark,
  fundCategory,
  Notice,
  Riskometer,
  Row,
  Screen,
  Stars,
} from "./parts";
import { ReturnCalculator } from "./ReturnCalculator";
import { useMf } from "./store";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Per cent without the plus sign: "12.4%".
const plain = (value: number, decimals = 1) => pct(value, decimals).replace("+", "");

// ---- Small shared pieces --------------------------------------------------------------------

// A number that counts up to its value when armed, and drops back to 0 when disarmed.
function CountUp({
  value,
  format,
  armed = true,
  ms = 240,
}: {
  value: number;
  format: (n: number) => string;
  armed?: boolean;
  ms?: number;
}) {
  const [shown, setShown] = useState(armed ? value : 0);
  const current = useRef(shown);
  const frame = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    if (!armed) {
      const t = window.setTimeout(() => {
        current.current = 0;
        setShown(0);
      }, 280);
      return () => window.clearTimeout(t);
    }
    if (prefersReducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      current.current = from + (value - from) * (1 - (1 - t) ** 4);
      setShown(current.current);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [value, armed, ms]);
  return (
    <span className="bk-tick-num">
      <span className="bk-sr">{format(value)}</span>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}

// A section that folds shut: the title row shows a short summary while closed.
function Fold({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className={`mf-section bk-fold${open ? " open" : ""}`}>
      <h3>
        <button
          type="button"
          className="bk-fold-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          {title}
          <span className="bk-fold-end">
            {summary != null && <span className="bk-fold-summary">{summary}</span>}
            <Icon name="caret-down" size={16} />
          </span>
        </button>
      </h3>
      <div className="bk-fold-body" id={bodyId} inert={!open}>
        <div className="bk-fold-inner">{children}</div>
      </div>
    </section>
  );
}

// Pill switch with a sliding thumb.
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: [T, string][];
  className?: string;
}) {
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  return (
    <div
      className={`bk-seg wide${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={label}
      style={{ "--i": index, "--n": options.length } as CSSProperties}
    >
      <i className="bk-seg-pill" aria-hidden="true" />
      {options.map(([key, text]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? "on" : ""} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

// ---- Researchers ------------------------------------------------------------------------------

// Photo in a circle; initials when there is no photo.
function ResearcherAvatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="bk-mgr-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }} aria-hidden="true">
      {photo ? <img src={asset(photo)} alt="" draggable={false} /> : initials}
    </span>
  );
}

// The Verified by SEBI seal: a 24px scalloped circle.
const SEAL_PATH =
  "M12.00 0.61 L12.49 0.66 L12.98 0.83 L13.44 1.10 L13.86 1.43 L14.26 1.79 L14.64 2.15 L15.00 2.47 L15.37 2.74 L15.75 2.94 L16.16 3.07 L16.61 3.14 L17.10 3.16 L17.62 3.18 L18.16 3.20 L18.69 3.28 L19.21 3.41 L19.67 3.63 L20.06 3.94 L20.37 4.33 L20.59 4.79 L20.72 5.31 L20.80 5.84 L20.82 6.38 L20.84 6.90 L20.86 7.39 L20.93 7.84 L21.06 8.25 L21.26 8.63 L21.53 9.00 L21.85 9.36 L22.21 9.74 L22.57 10.14 L22.90 10.56 L23.17 11.02 L23.34 11.51 L23.39 12.00 L23.34 12.49 L23.17 12.98 L22.90 13.44 L22.57 13.86 L22.21 14.26 L21.85 14.64 L21.53 15.00 L21.26 15.37 L21.06 15.75 L20.93 16.16 L20.86 16.61 L20.84 17.10 L20.82 17.62 L20.80 18.16 L20.72 18.69 L20.59 19.21 L20.37 19.67 L20.06 20.06 L19.67 20.37 L19.21 20.59 L18.69 20.72 L18.16 20.80 L17.62 20.82 L17.10 20.84 L16.61 20.86 L16.16 20.93 L15.75 21.06 L15.37 21.26 L15.00 21.53 L14.64 21.85 L14.26 22.21 L13.86 22.57 L13.44 22.90 L12.98 23.17 L12.49 23.34 L12.00 23.39 L11.51 23.34 L11.02 23.17 L10.56 22.90 L10.14 22.57 L9.74 22.21 L9.36 21.85 L9.00 21.53 L8.63 21.26 L8.25 21.06 L7.84 20.93 L7.39 20.86 L6.90 20.84 L6.38 20.82 L5.84 20.80 L5.31 20.72 L4.79 20.59 L4.33 20.37 L3.94 20.06 L3.63 19.67 L3.41 19.21 L3.28 18.69 L3.20 18.16 L3.18 17.62 L3.16 17.10 L3.14 16.61 L3.07 16.16 L2.94 15.75 L2.74 15.37 L2.47 15.00 L2.15 14.64 L1.79 14.26 L1.43 13.86 L1.10 13.44 L0.83 12.98 L0.66 12.49 L0.61 12.00 L0.66 11.51 L0.83 11.02 L1.10 10.56 L1.43 10.14 L1.79 9.74 L2.15 9.36 L2.47 9.00 L2.74 8.63 L2.94 8.25 L3.07 7.84 L3.14 7.39 L3.16 6.90 L3.18 6.38 L3.20 5.84 L3.28 5.31 L3.41 4.79 L3.63 4.33 L3.94 3.94 L4.33 3.63 L4.79 3.41 L5.31 3.28 L5.84 3.20 L6.38 3.18 L6.90 3.16 L7.39 3.14 L7.84 3.07 L8.25 2.94 L8.63 2.74 L9.00 2.47 L9.36 2.15 L9.74 1.79 L10.14 1.43 L10.56 1.10 L11.02 0.83 L11.51 0.66Z";

// The seal pops in, its tick draws and a glint passes over it, once its section or sheet opens.
function VerifiedBadge({ size = 16, animate = false, label = "Verified by SEBI" }: { size?: number; animate?: boolean; label?: string }) {
  const clipId = `bk-vb-${useId().replace(/:/g, "")}`;
  return (
    <svg className={`bk-vbadge${animate ? " anim" : ""}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <defs>
        <clipPath id={clipId}>
          <path d={SEAL_PATH} />
        </clipPath>
      </defs>
      <path className="bk-vbadge-seal" d={SEAL_PATH} />
      <g clipPath={`url(#${clipId})`}>
        <rect className="bk-vbadge-glint" x="-10" y="0" width="8" height="24" />
      </g>
      <path className="bk-vbadge-check" d="M7.4 12.4l3.1 3.1 6.1-6.5" pathLength={1} />
    </svg>
  );
}

// Bottom sheet about one researcher; drag it down to close. A pill row switches researcher.
const FLICK_SPEED = 0.4; // px per ms
const CLOSE_FRACTION = 0.3; // of the sheet's height

function ResearcherSheet({
  start,
  onClose,
  others,
}: {
  start: string;
  onClose: () => void;
  others: ReactNode; // "Also researched": the other baskets
}) {
  const [name, setName] = useState(start);
  const [again, setAgain] = useState(false); // switched researcher: replay the content, faster
  const [phase, setPhase] = useState<"enter" | "open" | "exit">("enter");
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const drag = useRef({ id: -1, y0: 0, t0: 0, y: 0, t: 0, vy: 0, on: false });

  useEffect(() => {
    opener.current = document.activeElement;
    let opened = false;
    const open = () => {
      if (!opened) {
        opened = true;
        setPhase("open");
      }
    };
    const frame = requestAnimationFrame(() => requestAnimationFrame(open));
    const fallback = window.setTimeout(open, 120);
    sheet.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, []);

  const close = useCallback(() => {
    setPhase("exit");
    window.setTimeout(onClose, prefersReducedMotion() ? 150 : 280);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const now = performance.now();
    drag.current = { id: e.pointerId, y0: e.clientY, t0: now, y: e.clientY, t: now, vy: 0, on: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheet.current;
    if (d.id !== e.pointerId || !el) return;
    const dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.abs(dy) < 6) return;
      d.on = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer may already be gone */
      }
      el.classList.add("dragging");
    }
    const now = performance.now();
    d.vy = (e.clientY - d.y) / Math.max(1, now - d.t);
    d.y = e.clientY;
    d.t = now;
    const offset = dy > 0 ? dy : dy * 0.12; // resists being pulled up
    el.style.transform = `translateY(${offset}px)`;
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - Math.max(0, offset) / el.offsetHeight));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheet.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.on || !el) return;
    d.on = false;
    const dy = e.clientY - d.y0;
    el.classList.remove("dragging");
    const far = dy > el.offsetHeight * CLOSE_FRACTION;
    const flick = performance.now() - d.t < 80 && d.vy > FLICK_SPEED;
    if (far || flick) {
      el.classList.add("leaving");
      el.style.transform = "translateY(100%)";
      if (scrim.current) scrim.current.style.opacity = "0";
      close();
    } else {
      el.style.transform = "";
      if (scrim.current) scrim.current.style.opacity = "";
    }
  };

  const person = researchers.find((r) => r.name === name) ?? researchers[0];
  let order = 0; // stagger index for the content rising in
  const stagger = () => ({ "--k": order++ }) as CSSProperties;

  return createPortal(
    <div className={`bk-msheet-root ${phase}${again ? " again" : ""}`}>
      <button ref={scrim} className="bk-msheet-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
      <div ref={sheet} className="bk-msheet" role="dialog" aria-modal="true" aria-label={`${name}, SAHI researcher`} tabIndex={-1}>
        <div className="bk-msheet-top" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <button className="bk-msheet-grab" aria-label="Close" onClick={close}>
            <i />
          </button>
          {researchers.length > 1 && (
            <div className="bk-msheet-pick" role="tablist" aria-label="Researchers behind this basket">
              {researchers.map((r) => (
                <button
                  key={r.name}
                  role="tab"
                  aria-selected={r.name === name}
                  className={r.name === name ? "on" : ""}
                  onClick={() => {
                    setName(r.name);
                    setAgain(true);
                  }}
                >
                  <ResearcherAvatar name={r.name} photo={r.photo} size={28} />
                  {r.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bk-msheet-body" key={name}>
          <div className="bk-ms-hero">
            <span className="bk-ms-avatar" style={stagger()}>
              <ResearcherAvatar name={name} photo={person.photo} size={88} />
            </span>
            <h2 style={stagger()}>{name}</h2>
            <p className="bk-vb-line" style={stagger()}>
              <VerifiedBadge size={18} animate />
              {person.role}
            </p>
          </div>
          <dl className="bk-ms-stats" style={stagger()}>
            <div>
              <dt>Experience</dt>
              <dd>
                <CountUp value={person.years} format={(n) => `${Math.round(n)} years`} armed={phase === "open"} ms={700} />
              </dd>
            </div>
            <div>
              <dt>Baskets</dt>
              <dd>{baskets.length}</dd>
            </div>
          </dl>
          <section style={stagger()}>
            <h3>Qualifications</h3>
            <ul className="bk-ms-edu">
              {person.education.map((line) => {
                const [main, rest] = splitQualification(line);
                return (
                  <li key={line}>
                    <b>{main}</b>
                    {rest && <small>{rest}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
          <section style={stagger()}>
            <h3>Background</h3>
            <p className="bk-ms-bg">{person.background}</p>
          </section>
          {others && (
            <section style={stagger()}>
              <h3>Also researched</h3>
              {others}
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---- Cards ------------------------------------------------------------------------------------

const SLOT_COLOURS = ["var(--bk-c1)", "var(--bk-c2)", "var(--bk-c3)"];

// The first three funds' marks, overlapping, and "+N" for the rest.
function FundStack({ basket, size }: { basket: Basket; size: number }) {
  const list = basketFunds(basket);
  const shown = list.slice(0, 3);
  return (
    <span className="bk-stack" aria-hidden="true">
      {shown.map(({ fund }, i) => (
        <FundMark key={`${fund.id}-${i}`} fund={fund} size={size} />
      ))}
      {list.length > shown.length && (
        <span className="bk-more" style={{ width: size, height: size }}>
          +{list.length - shown.length}
        </span>
      )}
    </span>
  );
}

// SAHI's mark on a soft circle: "picked by the SAHI Research team".
function TeamMark({ size = 24 }: { size?: number }) {
  return (
    <span className="bk-team-mark" style={{ width: size, height: size }} aria-hidden="true">
      <img src={asset("37c13.svg")} alt="" draggable={false} style={{ width: size * 0.58, height: size * 0.58 }} />
    </span>
  );
}

function BasketCard({ basket, tint }: { basket: Basket; tint: number }) {
  const { push } = useMf();
  const ret = basketReturn3Y(basket);
  const minSip = basketMinimum(basket, "sip");
  const risk = riskLabel(basketRisk(basket));
  return (
    <button
      className="bk-card"
      data-tint={tint % 3}
      aria-label={`${basket.name}. ${basket.funds.length} funds. ${risk}. Minimum SIP ${inr(minSip)} a month. Reviewed by SAHI Research, ${REVIEWED}.`}
      onClick={() => push({ name: "basket", basketId: basket.id })}
    >
      <span className="bk-top">
        <FundStack basket={basket} size={28} />
        <span className="bk-count">
          {basket.funds.length} funds
          <Icon name="caret-right" size={16} />
        </span>
      </span>
      <b className="bk-name">{basket.name}</b>
      <span className="bk-who">{basket.who}</span>
      <span className="bk-stats">
        <span>
          <small>3Y return</small>
          <strong className={ret >= 0 ? "up" : "down"}>{plain(ret)}</strong>
        </span>
        <span>
          <small>Min. SIP</small>
          <strong>{inr(minSip)}</strong>
        </span>
        <span>
          <small>Risk</small>
          <strong>{risk.replace(" risk", "")}</strong>
        </span>
      </span>
    </button>
  );
}

// "Reviewed by SAHI Research" month line under the title.
function ReviewedLine({ className = "bk-sub", action }: { className?: string; action?: ReactNode }) {
  return (
    <div className={className}>
      <Icon name="shield-check" size={14} />
      <span>{REVIEWED}</span>
      {action}
    </div>
  );
}

// ---- Home carousel and "View all" page --------------------------------------------------------

// The home widget: a title, "View all", and one card per basket.
export function BasketsSection() {
  const { push } = useMf();
  return (
    <Block>
      <ReviewedLine className="bk-sub bk-eyebrow" />
      <div className="block-head">
        <h2>Researcher backed baskets</h2>
        <button className="text-link" onClick={() => push({ name: "baskets" })}>
          View all
        </button>
      </div>
      <HScroll>
        {baskets.map((basket, i) => (
          <BasketCard key={basket.id} basket={basket} tint={i} />
        ))}
      </HScroll>
    </Block>
  );
}

const BASKET_LIMITS =
  "A basket is a set of funds our research team chose to sit together. It isn’t advice made for you. Past returns aren’t a promise.";

export function BasketsScreen() {
  const { pop } = useMf();
  return (
    <Screen title="Researcher backed baskets" onBack={pop}>
      <ReviewedLine className="bk-sub bk-sub-page" />
      <div className="bk-list">
        {baskets.map((basket, i) => (
          <BasketCard key={basket.id} basket={basket} tint={i} />
        ))}
      </div>
      <p className="mf-small bk-limits">{BASKET_LIMITS}</p>
    </Screen>
  );
}

// ---- Compare with the Nifty 50 ----------------------------------------------------------------

function CompareChart({ basket }: { basket: Basket }) {
  const [range, setRange] = useState<CompareRange>("3Y");
  const index = COMPARE_INDEX[range];
  const years = COMPARE_YEARS[range];
  const mine = basketReturns(basket).mine[index];
  const nifty = [NIFTY_50.r1, NIFTY_50.r3, NIFTY_50.r5][index];
  const gap = mine - nifty;
  const grow = (rate: number) => 1e4 * (1 + rate / 100) ** years;
  const paths = useMemo(() => comparePaths(basket, range), [basket, range]);
  const span = years === 1 ? "1 year" : `${years} years`;
  return (
    <>
      <Segmented
        className="bk-seg-returns"
        label="How far back to compare"
        value={range}
        onChange={setRange}
        options={[
          ["1Y", "1Y"],
          ["3Y", "3Y"],
          ["5Y", "5Y"],
        ]}
      />
      <div className="bkc-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="bkc-nifty" d={paths.nifty} vectorEffect="non-scaling-stroke" />
          <path className="bkc-basket" d={paths.basket} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="bkc-legend">
        <span>
          <i className="b" />
          {basket.name}
        </span>
        <span>
          <i className="n" />
          {NIFTY_50.name}
        </span>
      </div>
      <table className="mf-table bkc-table">
        <thead>
          <tr>
            <th />
            <th>This basket</th>
            <th>{NIFTY_50.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A year over {span}</td>
            <td className={mine >= 0 ? "up" : "down"}>
              <b>{pct(mine, 1)}</b>
            </td>
            <td className={nifty >= 0 ? "up" : "down"}>{pct(nifty, 1)}</td>
          </tr>
          <tr>
            <td>₹10,000 became</td>
            <td>
              <b>{inr(Math.round(grow(mine)))}</b>
            </td>
            <td>{inr(Math.round(grow(nifty)))}</td>
          </tr>
        </tbody>
      </table>
      <p className="bkc-verdict">
        <b className={gap >= 0 ? "up" : "down"}>
          {plain(Math.abs(gap))} a year {gap >= 0 ? "ahead of" : "behind"}
        </b>{" "}
        the {NIFTY_50.name} over {span}.
      </p>
      <p className="mf-small">
        The {NIFTY_50.name} is India&rsquo;s 50 biggest companies, with dividends added back. Annualised. A basket holds
        more than company shares, so it can move differently. Past performance does not predict future returns.
      </p>
    </>
  );
}

// ---- A basket's page --------------------------------------------------------------------------

export function BasketScreen({ basketId }: { basketId: string }) {
  const { pop, push } = useMf();
  const basket = basketById(basketId);
  const list = basketFunds(basket);
  const ret3 = basketReturn3Y(basket);
  const risk = basketRisk(basket);
  const status = basketAvailability(basket);
  const lockIn = list.find((x) => x.fund.lockIn)?.fund.lockIn;
  const riskiest = list.reduce((a, b) => (riskLevelOf(b.fund.risk) > riskLevelOf(a.fund.risk) ? b : a));
  const tone = `var(--${["positive", "warning", "negative"][Math.floor(riskLevelOf(risk) / 2)]}-surface)`;
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [researcher, setResearcher] = useState<string | null>(null);
  const [measure, setMeasure] = useState<"lump" | "sip">("lump");
  const returns = basketReturns(basket);
  const mine = measure === "lump" ? returns.mine : sipReturns(returns.mine);
  const avg = measure === "lump" ? returns.avg : sipReturns(returns.avg);
  const rows: [string, number, number][] = [
    ["1Y", mine[0], avg[0]],
    ["3Y", mine[1], avg[1]],
    ["5Y", mine[2], avg[2]],
  ];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function share() {
    const text = `${basket.name} on SAHI: ${basket.who} ${basket.funds.length} funds, ${plain(ret3)} a year over the past 3 years, from ${inr(basketMinimum(basket, "sip"))} a month. Reviewed by SAHI Research, ${REVIEWED}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: basket.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* sharing was cancelled or is not allowed here */
    }
  }

  const start = (mode: "lump" | "sip") => push({ name: "amount", fundId: basketFundId(basketId), mode });

  return (
    <Screen
      onBack={pop}
      footer={
        status.state === "paused" ? (
          <button className="mf-btn solid wide" disabled>
            New investments paused
          </button>
        ) : status.state === "sip-only" ? (
          <button className="mf-btn solid wide" onClick={() => start("sip")}>
            Start SIP
          </button>
        ) : (
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={() => start("lump")}>
              Invest one-time
            </button>
            <button className="mf-btn solid" onClick={() => start("sip")}>
              Start SIP
            </button>
          </div>
        )
      }
      right={
        <button className="bk-share" onClick={share} aria-label={copied ? "Copied" : "Share this basket"}>
          {copied ? <small>Copied</small> : <Icon name="share-network" size={20} />}
        </button>
      }
    >
      <div className="fund-hero">
        <FundStack basket={basket} size={48} />
        <h2>{basket.name}</h2>
        <p className="fund-meta">{basket.who}</p>
      </div>

      {status.state === "paused" && (
        <Notice tone="warn">
          {status.fund.name} is not taking new money right now, so this basket can&rsquo;t be started until it reopens.
        </Notice>
      )}
      {status.state === "sip-only" && (
        <Notice tone="warn">
          {status.fund.name} has stopped one-time investments, so this basket can only be started as a SIP.
        </Notice>
      )}

      <div className="fund-figures">
        <div className="bk-fund-main">
          <strong className={ret3 >= 0 ? "up" : "down"}>
            <CountUp value={ret3} format={plain} armed={armed} ms={700} />
          </strong>
          <small>a year over 3 years</small>
        </div>
        <div className="bk-fund-day">
          <b>{riskLabel(risk).replace(" risk", "")}</b>
          <small>Risk</small>
        </div>
      </div>

      <dl className="bk-facts bk-stats-page">
        <div>
          <dt>Funds</dt>
          <dd>{basket.funds.length}</dd>
        </div>
        <div>
          <dt>Min. SIP</dt>
          <dd>{inr(basketMinimum(basket, "sip"))}</dd>
        </div>
        <div>
          <dt>Cost a year</dt>
          <dd>{basketExpense(basket).toFixed(2)}%</dd>
        </div>
      </dl>

      <Fold title={"What’s inside"} summary={`${basket.funds.length} funds`}>
        <div className="bk-bar" aria-hidden="true">
          {list.map((x, i) => (
            <i key={`${x.fund.id}-${i}`} style={{ flexGrow: x.weight, background: SLOT_COLOURS[i % SLOT_COLOURS.length] }} />
          ))}
        </div>
        <ul className="bk-rows">
          {list.map(({ fund, weight }, i) => (
            <li key={`${fund.id}-${i}`}>
              <button className="bk-row" onClick={() => push({ name: "fund", fundId: fund.id })}>
                <FundMark fund={fund} size={40} />
                <span className="bk-row-text">
                  <b>{fund.name}</b>
                  <small>
                    {fundCategory(fund)} • <Stars n={fund.stars} />
                  </small>
                </span>
                <span className="bk-weight">
                  <i style={{ background: SLOT_COLOURS[i % SLOT_COLOURS.length] }} />
                  {weight}%
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mf-small">Tap a fund to see it. Direct plans, with no commission on any fund here.</p>
      </Fold>

      <Fold title="Why this basket?" summary={basket.whyShort} defaultOpen={false}>
        <div className="bk-pick-head">
          <TeamMark size={32} />
          <span>
            <b>SAHI Research</b>
            <small>
              Reviewed {REVIEWED} · Next review {NEXT_REVIEW}
            </small>
          </span>
        </div>
        <ul className="bk-how">
          {basket.how.map((line) => (
            <li key={line}>
              <Icon name="check-circle" size={16} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Fold>

      <Fold title="Who is this for" summary={basket.whoShort} defaultOpen={false}>
        <ul className="bk-fit-list">
          <li>
            <span className="bk-fit-icon" style={{ color: tone }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 16.5a8.5 8.5 0 1 1 15 0" />
                <path d="M12 14.5l3.2-4.2" />
                <circle cx="12" cy="15.2" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <p>
              Investors {basket.seeking}, with {riskLabel(risk).toLowerCase()}.
            </p>
          </li>
          <li>
            <span className="bk-fit-icon" style={{ color: "var(--accent-text)" }}>
              <Icon name="clock" size={22} />
            </span>
            <p>
              Suggested holding period: {basket.years}+ {basket.years === 1 ? "year" : "years"}
              <span className="bk-fit-note"> · {lockIn ? `${lockIn} lock-in` : "No lock-in period"}</span>
            </p>
          </li>
        </ul>
      </Fold>

      <Fold
        title="Returns"
        defaultOpen={false}
        summary={
          <>
            <b className={mine[1] >= 0 ? "up" : "down"}>{pct(mine[1], 1)}</b> a year over 3 years
          </>
        }
      >
        <Segmented
          className="bk-seg-returns"
          label="How the returns are measured"
          value={measure}
          onChange={setMeasure}
          options={[
            ["lump", "Lumpsum"],
            ["sip", "SIP"],
          ]}
        />
        <table className="mf-table">
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
              <td>This basket</td>
              {rows.map(([key, value]) => (
                <td key={key} className={value >= 0 ? "up" : "down"}>
                  <b>{pct(value, 1)}</b>
                </td>
              ))}
            </tr>
            <tr>
              <td>Category average</td>
              {rows.map(([key, , average]) => (
                <td key={key}>{pct(average, 1)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mf-small">
          {measure === "lump"
            ? "Annualised, for a lumpsum held the whole period."
            : "Annualised (XIRR), for a monthly SIP over the period."}{" "}
          Each figure is the funds&rsquo; own, weighted by their share. Past performance does not predict future returns.
        </p>
      </Fold>

      <Fold
        title="Compare with Nifty 50"
        defaultOpen={false}
        summary={
          <>
            <b className={returns.mine[1] - NIFTY_50.r3 >= 0 ? "up" : "down"}>{pct(returns.mine[1] - NIFTY_50.r3, 1)}</b> a year
            over 3 years
          </>
        }
      >
        <CompareChart basket={basket} />
      </Fold>

      {/* The shared return calculator, fed the basket's blended figures. */}
      <ReturnCalculator fund={basketAsFund(basket)} />

      <Fold title="Researchers" summary={`${researchers.length} at SAHI Research`} defaultOpen={false}>
        <div className="bk-mgr-list">
          <small>Picked by</small>
          {researchers.map((person) => (
            <button key={person.name} className="bk-mgr-row" onClick={() => setResearcher(person.name)}>
              <ResearcherAvatar name={person.name} photo={person.photo} />
              <span className="bk-mgr-text">
                <b>{person.name}</b>
                <small className="bk-vb-line">
                  <VerifiedBadge size={14} animate />
                  {person.role}
                </small>
              </span>
              <Icon name="caret-right" size={16} />
            </button>
          ))}
        </div>
        {researcher && (
          <ResearcherSheet
            start={researcher}
            onClose={() => setResearcher(null)}
            others={
              <ul className="bk-ms-baskets">
                {baskets
                  .filter((b) => b.id !== basket.id)
                  .map((b) => {
                    const r = basketReturn3Y(b);
                    return (
                      <li key={b.id}>
                        <button
                          className="bk-ms-bk"
                          onClick={() => {
                            setResearcher(null);
                            push({ name: "basket", basketId: b.id });
                          }}
                        >
                          <FundStack basket={b} size={28} />
                          <span className="bk-ms-bk-text">
                            <b>{b.name}</b>
                            <small>
                              <span className={r >= 0 ? "up" : "down"}>{plain(r)}</span> a year over 3 years
                            </small>
                          </span>
                          <Icon name="caret-right" size={16} />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            }
          />
        )}
        <p className="mf-small">
          Reviewed {REVIEWED}, next review {NEXT_REVIEW}. A basket is the research team&rsquo;s view, not advice made for you.
        </p>
      </Fold>

      <Fold title="Charges" summary={`${basketExpense(basket).toFixed(2)}% a year`} defaultOpen={false}>
        <div className="mf-facts">
          <Row label="Minimum one-time" value={inr(basketMinimum(basket, "lump"))} />
          <Row
            label="Cost a year"
            value={`${basketExpense(basket).toFixed(2)}%, each fund's own cost weighted by its share. Charged daily from each fund's NAV.`}
          />
          {list.map(({ fund }, i) => (
            <Row key={`${fund.id}-${i}`} label={`Exit load, ${fund.name}`} value={fund.exitLoad} />
          ))}
        </div>
        <p className="mf-small">The minimum is the smallest amount that meets every fund&rsquo;s own minimum at these shares.</p>
      </Fold>

      <Fold title="Riskometer" summary={risk} defaultOpen={false}>
        <div className="bk-risk-top bk-risk">
          <Riskometer risk={risk} />
        </div>
        <p className="bk-risk-why">
          A mix is as risky as its riskiest fund. Here that is {riskiest.fund.name}, at {riskiest.fund.risk.toLowerCase()} risk.
        </p>
      </Fold>

      <p className="mf-small mf-source">Star ratings by Value Research.</p>
      <p className="mf-small bk-limits">
        A basket is a set of funds our research team chose to sit together. It isn&rsquo;t advice made for you, so check
        that it fits your goal and how much risk you can take. Past returns aren&rsquo;t a promise. The past 3 years is each
        fund&rsquo;s own figure, weighted by its share.
      </p>
      <p className="mf-small mf-source">{RISK_DISCLAIMER}</p>
    </Screen>
  );
}

const riskLevelOf = (risk: Risk) => riskLevels.indexOf(risk);
const RISK_DISCLAIMER = "Mutual fund investments are subject to market risks, read all scheme related documents carefully.";

// ---- Amount, review and done ------------------------------------------------------------------

export function BasketLine({ basket, note }: { basket: Basket; note: string }) {
  return (
    <div className="mf-fundline">
      <div className="bk-line-logos">
        <FundStack basket={basket} size={32} />
      </div>
      <span>
        <b>{basket.name}</b>
        <small>{note}</small>
      </span>
    </div>
  );
}
