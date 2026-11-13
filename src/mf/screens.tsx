import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { asset } from "../assets";
import {
  categories,
  cutoffKind,
  ELSS_LOCK_YEARS,
  funds,
  fundById,
  payoutDays,
  type CategoryKey,
  type Fund,
  type MfOrder,
} from "./data";
import { BasketLine } from "./Baskets";
import { basketOfFundId } from "./baskets-data";
import {
  addBusinessDays,
  afterCutoff,
  closedBecause,
  cutoffLabel,
  fmtDay,
  fmtWeekday,
  fmtTime,
  inr,
  isBusinessDay,
  istNow,
  SIP_LEAD_DAYS,
  navDay,
  nextBusinessDay,
  nextSipDate,
  tradeDay,
  navSeries,
  ordinal,
  pct,
  rupeesInWords,
  ranges,
  sipSchedule,
  smoothPath,
  type Range,
} from "./format";
import {
  applyKey,
  CategoryIcon,
  FundMark,
  Keypad,
  Notice,
  FilterRow,
  fundCategory,
  ReturnSwitch,
  type ReturnBasis,
  Riskometer,
  RollingAmount,
  RowSide,
  Sheet,
  SheetLine,
  Row,
  Screen,
  sortFunds,
  Stars,
  useFundView,
} from "./parts";
import { DotField } from "./DotField";
import { GoalHero } from "./GoalArt";
import { nextFunds, sectors, themeOf } from "./sectors";
import { ReturnCalculator } from "./ReturnCalculator";
import { accountLabel, mandateAccount, methodView } from "./payData";
import { UI_STATUS_LABEL, uiStatus } from "./orderStatus";
import { useMf, type ListSpec } from "./store";


// ---- Fund list rows -------------------------------------------------------------

export function FundRow({ fund, basis = "3Y" }: { fund: Fund; basis?: ReturnBasis }) {
  const { push } = useMf();
  return (
    <button className="list-row fund-row" onClick={() => push({ name: "fund", fundId: fund.id })}>
      <FundMark fund={fund} />
      <span className="row-main">
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

// Monthly SIP that reaches `target` in `years` at an assumed yearly rate, rounded up to ₹100.
function sipFor(target: number, years: number, rate = 0.1) {
  const i = rate / 12;
  const n = years * 12;
  const factor = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return Math.ceil(target / factor / 100) * 100;
}

// "What it takes" rows for the Order 2.0 goal pages (same rows as the classic goal page, without the poster text above).
function BucketLadder({ ladder }: { ladder: NonNullable<ListSpec["bucket"]>["ladder"] & {} }) {
  return (
    <div className="bucket-ladder">
      <p className="bucket-ladder-label">How much to invest each month</p>
      <div className="bucket-ladder-rows">
        {ladder.map((step) => (
          <div key={step.goal + step.years} className="ladder-row">
            <div className="ladder-top">
              <span>{step.goal}</span>
              <b>{inr(sipFor(step.target, step.years))}</b>
            </div>
            <div className="ladder-sub">
              <span>in {step.years} years</span>
              <span>a month</span>
            </div>
          </div>
        ))}
      </div>
      <p className="bucket-fine">An illustration at an assumed 10% a year. Real returns vary and are not promised.</p>
    </div>
  );
}

function BucketTop({ spec }: { spec: ListSpec }) {
  const b = spec.bucket!;
  // Order 2.0 goals with art open on a poster; the promise moves onto it and only the note and ladder stay below.
  if (b.art) {
    return (
      <>
        <GoalHero art={b.art} big={b.big} promise={b.promise} />
        {(b.note || b.ladder) && (
          <section className="bucket-intro">
            {b.note && <p className="bucket-note">{b.note}</p>}
            {b.ladder && <BucketLadder ladder={b.ladder} />}
          </section>
        )}
        <h2 className="mf-list-title">{b.listTitle}</h2>
      </>
    );
  }
  return (
    <>
      <section className="bucket-intro">
        <div className="bucket-head">
          <b className="bucket-big">{b.big}</b>
          <p>{b.promise}</p>
          {b.note && <p className="bucket-note">{b.note}</p>}
        </div>
        {b.ladder && (
          <div className="bucket-ladder">
            <p className="bucket-ladder-label">How much to invest each month</p>
            <div className="bucket-ladder-rows">
              {b.ladder.map((step) => (
                <div key={step.goal + step.years} className="ladder-row">
                  <div className="ladder-top">
                    <span>{step.goal}</span>
                    <b>{inr(sipFor(step.target, step.years))}</b>
                  </div>
                  <div className="ladder-sub">
                    <span>in {step.years} years</span>
                    <span>a month</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="bucket-fine">An illustration at an assumed 10% a year. Real returns vary and are not promised.</p>
          </div>
        )}
      </section>
      <h2 className="mf-list-title">{b.listTitle}</h2>
    </>
  );
}

const CAT_LABEL: Partial<Record<CategoryKey, string>> = {
  index: "Index",
  large: "Large Cap",
  flexi: "Flexi Cap",
  mid: "Mid Cap",
  small: "Small Cap",
  debt: "Debt",
  liquid: "Liquid",
  elss: "ELSS",
  gold: "Gold & Silver",
};

// Filter chips, count and fund rows for a list spec. Shared by the list screen and the SIP tab's empty state.
export function FundListBody({ spec }: { spec: ListSpec }) {
  const { basis, sort, setBasis, setSort } = useFundView();
  const [cat, setCat] = useState<CategoryKey | "all">(spec.cat ?? "all");
  const [sector, setSector] = useState<string>(spec.theme ?? "all"); // Order 2.0 sector pages only

  const filtered = useMemo(() => {
    return (spec.withExtras || spec.theme ? nextFunds : funds)
      .filter((fund) => (cat === "all" ? (spec.cats ? spec.cats.includes(fund.cat) : true) : fund.cat === cat))
      .filter((fund) => (spec.sipOnly ? fund.minSip <= 100 : true))
      .filter((fund) => (spec.equityOnly ? fund.catLabel.startsWith("Equity") : true))
      .filter((fund) => (spec.theme ? (sector === "all" ? themeOf(fund) !== undefined : themeOf(fund) === sector) : true))
      .filter((fund) => (spec.minStars ? fund.stars >= spec.minStars : true));
  }, [cat, sector, spec.cats, spec.sipOnly, spec.equityOnly, spec.minStars, spec.theme, spec.withExtras]);
  const list = sortFunds(filtered, sort, basis);

  return (
    <>
      {spec.theme ? (
        <FilterRow
          cat={sector as CategoryKey | "all"}
          onCat={(key) => setSector(key)}
          sort={sort}
          onSort={setSort}
          chips={sectors.map((item) => ({ key: item.key as CategoryKey, label: item.label }))}
        />
      ) : (
      <FilterRow cat={cat} onCat={setCat} sort={sort} onSort={setSort} chips={
          spec.bucket
            ? (spec.cats ?? []).length > 1
              ? spec.cats!.map((key) => ({ key, label: CAT_LABEL[key] ?? key }))
              : []
            : undefined
        }
      />
      )}
      <div className="mf-sortbar">
        <span>{list.length} funds</span>
        <ReturnSwitch basis={basis} onChange={setBasis} />
      </div>
      <ul className="row-list">
        {list.map((fund) => (
          <li key={fund.id}>
            <FundRow fund={fund} basis={basis} />
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mf-empty">No funds match this filter.</p>}
    </>
  );
}

export function ListScreen({ spec }: { spec: ListSpec }) {
  const { pop } = useMf();
  const [shared, setShared] = useState(false);

  async function share() {
    const text = `${spec.title} on SAHI: ${spec.bucket?.promise ?? spec.caption ?? ""}`;
    try {
      if (navigator.share) await navigator.share({ title: spec.title, text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // the person closed the share sheet
    }
  }

  return (
    <Screen
      title={spec.title}
      onBack={pop}
      right={
        spec.bucket ? (
          <button className="mf-share" onClick={share}>
            {shared ? "Copied" : "Share"}
          </button>
        ) : undefined
      }
    >
      {spec.bucket ? <BucketTop spec={spec} /> : spec.caption && <p className="mf-lede">{spec.caption}</p>}
      <FundListBody spec={spec} />
      {/* Returns note and SEBI disclaimer taken off the list screens for now (PRD: needed before launch). */}
    </Screen>
  );
}

export function SearchScreen() {
  const { pop, push } = useMf();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const results = q.trim()
    ? funds.filter((fund) =>
        `${fund.name} ${fund.amc} ${fund.catLabel}`.toLowerCase().includes(q.trim().toLowerCase()),
      )
    : [];

  return (
    <Screen onBack={pop} title="Search funds">
      <label className="mf-search-input">
        <Icon name="magnifying-glass" size={20} />
        <input
          ref={input}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by fund or AMC name"
          autoComplete="off"
        />
      </label>
      {!q.trim() && (
        <>
          <p className="mf-lede">Browse by category</p>
          <div className="mf-catlist">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() =>
                  push({ name: "list", spec: { title: cat.title, cat: cat.key, caption: cat.sub } })
                }
              >
                <CategoryIcon cat={cat.key} />
                <b>{cat.title}</b>
                <small>{cat.plain}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {q.trim() && (
        <ul className="row-list">
          {results.map((fund) => (
            <li key={fund.id}>
              <FundRow fund={fund} />
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && (
        <p className="mf-empty">No fund found for "{q.trim()}". Check the spelling or try the AMC name.</p>
      )}
    </Screen>
  );
}

// ---- Fund page ---------------------------------------------------------------------

/* The chart is drawn in real pixels (not a stretched 100x100 box) so the dots stay round.
   The dotted area is the web's: a 4px grid of 0.7px dots, brightest under the line, fading to nothing at the bottom. */
function NavChart({ fund }: { fund: Fund }) {
  return (
    <RangeChart
      initial="3Y"
      seriesFor={(range) => navSeries(fund.id, range, fund.r1, fund.r3, fund.r5)}
    />
  );
}

// The dotted line chart with its range switcher. The fund page and the portfolio both draw it;
// each passes what the series looks like for a range.
export function RangeChart({
  seriesFor,
  initial,
  showChange = true,
}: {
  seriesFor: (range: Range) => { pts: [number, number][]; change: number };
  initial: Range;
  showChange?: boolean; // the "3Y change" line under the switcher
}) {
  const [range, setRange] = useState<Range>(initial);
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

  const { pts, change } = seriesFor(range);
  const tone = change >= 0 ? "up" : "down";
  const { w, h } = size;
  const line = w ? smoothPath(pts, w, h) : "";
  const top = Math.min(...pts.map(([, y]) => (1 - y) * h));
  return (
    <div className="mf-chart">
      <div className="mf-chart-plot" ref={plot}>
        {w > 0 && (
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
            <path className={`chart-line ${tone}`} d={line} />
          </svg>
        )}
      </div>
      <div className="mf-ranges" role="tablist" aria-label="Chart range">
        {ranges.map((r) => (
          <button key={r} className={r === range ? "on" : ""} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>
      {showChange && (
        <small className="mf-chart-note">
          {range} change:{" "}
          <b className={tone}>{pct(change, 1)}</b>
        </small>
      )}
    </div>
  );
}

export function FundScreen({ fundId }: { fundId: string }) {
  const { pop, push } = useMf();
  const fund = fundById(fundId);
  const now = new Date();
  const lastNav = navDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const navDate = fmtDay(afterCutoff(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) ? nextBusinessDay(lastNav) : lastNav);
  const riskText = `${fund.risk.charAt(0)}${fund.risk.slice(1).toLowerCase()} risk`;
  const rows: [string, number, number][] = [
    ["1Y", fund.r1, fund.avg[0]],
    ["3Y", fund.r3, fund.avg[1]],
    ["5Y", fund.r5, fund.avg[2]],
  ];

  return (
    <Screen
      onBack={pop}
      footer={
        fund.buy === "halted" ? (
          <button className="mf-btn solid wide" disabled>
            New investments paused
          </button>
        ) : fund.buy === "sip-only" ? (
          <button className="mf-btn solid wide" onClick={() => push({ name: "amount", fundId, mode: "sip" })}>
            Start SIP
          </button>
        ) : (
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={() => push({ name: "amount", fundId, mode: "sip" })}>
              Start SIP
            </button>
            <button className="mf-btn solid" onClick={() => push({ name: "amount", fundId, mode: "lump" })}>
              Invest one-time
            </button>
          </div>
        )
      }
    >
      <div className="fund-hero">
        <FundMark fund={fund} size={48} />
        <h2>{fund.name}</h2>
        <p className="fund-meta">
          {fundCategory(fund)} • <Stars n={fund.stars} /> • {riskText}
        </p>
      </div>
      {fund.buyNote && <Notice tone="warn">{fund.buyNote}</Notice>}

      <div className="fund-figures">
        <span>
          <small>3Y returns</small>
          <strong className={fund.r3 >= 0 ? "up" : "down"}>{pct(fund.r3, 1)}</strong>
        </span>
        <span className="right">
          <small>NAV · {navDate}</small>
          <strong>
            ₹{fund.nav.toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
            <em className={fund.navChange >= 0 ? "up" : "down"}>
              {fund.navChange >= 0 ? "+" : ""}
              {fund.navChange.toFixed(2)}%
            </em>
          </strong>
        </span>
      </div>

      <NavChart fund={fund} />

      <section className="mf-section">
        <h3>Returns</h3>
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
              <td>This fund</td>
              {rows.map(([k, v]) => (
                <td key={k} className={v >= 0 ? "up" : "down"}>
                  <b>{pct(v, 1)}</b>
                </td>
              ))}
            </tr>
            <tr>
              <td>Category average</td>
              {rows.map(([k, , a]) => (
                <td key={k}>{pct(a, 1)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mf-small">
          Annualised, for a lumpsum held the whole period. Past performance does not predict future returns.
        </p>
      </section>

      <ReturnCalculator fund={fund} />

      <section className="mf-section">
        <h3>Key facts</h3>
        <div className="mf-grid2">
          <Row label="Fund size (AUM)" value={fund.aum} />
          <Row label="Expense ratio" value={`${fund.expense}% a year`} />
          <Row label="Minimum one-time" value={fund.buy ? "Not open" : inr(fund.minLump)} />
          <Row label="Minimum SIP" value={`${inr(fund.minSip)} a month`} />
          <Row label="Benchmark" value={fund.benchmark} />
          <Row label="Launched" value={fund.launched} />
        </div>
      </section>

      <section className="mf-section">
        <h3>About the fund</h3>
        <p className="mf-body-copy">{fund.aim}</p>
        <div className="mf-managers">
          <small>Managed by</small>
          {fund.managers.map((name) => (
            <span key={name}>
              <i>{name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</i>
              {name}
            </span>
          ))}
        </div>
        <button className="mf-link">
          <Icon name="file-text-fill" size={16} />
          Scheme Information Document
          <Icon name="caret-right" size={16} />
        </button>
      </section>

      <section className="mf-section">
        <h3>Charges and tax</h3>
        <div className="mf-facts">
          <Row label="Exit load" value={fund.exitLoad} />
          <Row
            label="Expense ratio"
            value={`${fund.expense}% a year, charged daily from the NAV. About ${inr(Math.round(fund.expense * 1000))} a year on ₹1 lakh.`}
          />
          <Row
            label="Tax on gains"
            value={
              fund.cat === "debt" || fund.cat === "liquid"
                ? "Gains are added to your income and taxed at your slab rate."
                : fund.cat === "gold"
                  ? "Held under 24 months: taxed at your slab rate. Held over 24 months: 12.5% on your gain."
                  : "Held under 12 months: 20% on your gain. Held over 12 months: 12.5% on gains above ₹1.25 lakh in a financial year."
            }
          />
        </div>
        <p className="mf-small">Tax rates assume no other capital gains. Your own rate may differ.</p>
      </section>

      <section className="mf-section">
        <h3>Riskometer</h3>
        <Riskometer risk={fund.risk} />
        <p className="mf-small center">
          Your principal will be at {fund.risk.toLowerCase()} risk. Reviewed monthly against the actual portfolio.
        </p>
      </section>

      <Notice icon="clock">
        <b>Price is set at the end of day.</b> If your money reaches the fund house by {cutoffLabel(cutoffKind(fund))} on
        a working day, you get {cutoffKind(fund) === "liquid" ? "the previous day\u2019s" : "that day\u2019s"} NAV. After that,
        it moves to the next working day.
      </Notice>

      <p className="mf-source">
        Fund data, ratings and risk measures are sourced from Value Research. This data is solely and
        exclusively owned by Value Research.
      </p>
    </Screen>
  );
}

// ---- Amount ----------------------------------------------------------------------

// SIP date sheet (Figma 28:7235): days 1–28 in weeks of seven; 29 and 30 shown but off,
// since not every month has them.
const SIP_DAY_ROWS = [1, 8, 15, 22, 29].map((start) =>
  Array.from({ length: start === 29 ? 2 : 7 }, (_, i) => start + i),
);

export function AmountScreen({ fundId, mode, preset }: { fundId: string; mode: "lump" | "sip"; preset?: number }) {
  return mode === "lump" ? <OneTimePad fundId={fundId} preset={preset} /> : <SipPad fundId={fundId} preset={preset} />;
}

// Round cross beside the amount: wipes the whole figure in one tap (the keypad's backspace takes one digit).
// It sits outside the figure's width, so the number stays centred; it is only there when there is something to clear.
function ClearAmount({ show, onClear }: { show: boolean; onClear: () => void }) {
  return (
    <button className={`mf-pad-clear${show ? " show" : ""}`} onClick={onClear} aria-label="Clear amount" tabIndex={show ? 0 : -1}>
      <Icon name="x-circle" size={22} />
    </button>
  );
}

// Who the order is for: a fund, or a basket (the same heading, with its funds' logos stacked).
function PadHeading({ fund }: { fund: Fund }) {
  const basket = basketOfFundId(fund.id);
  if (basket) return <BasketLine basket={basket} note="Direct · Growth" />;
  return (
    <div className="mf-fundline">
      <FundMark fund={fund} size={32} />
      <span>
        <b>{fund.name}</b>
        <small>Direct · Growth</small>
      </span>
    </div>
  );
}

// The fund house's rules for an amount: minimum, multiple and maximum. Returns what's wrong, if anything.
function amountProblem(amount: number, min: number, multiple?: number, max?: number, per = ""): string | null {
  if (amount < min) return `Minimum is ${inr(min)}${per}`;
  if (multiple && amount % multiple !== 0) return `Enter a multiple of ${inr(multiple)}`;
  if (max && amount > max) return `Maximum is ${inr(max)}${per}`;
  return null;
}

// Up-down chevron beside the pad's label: flips between the monthly SIP and one-time pads, carrying the typed amount across.
// Blocked when the fund doesn't take the other kind of order.
function PadModeSwitch({ fundId, oneTime, amount, blocked }: { fundId: string; oneTime: boolean; amount: number; blocked: boolean }) {
  const { replace } = useMf();
  return (
    <button
      type="button"
      className="mf-pad-mode"
      disabled={blocked}
      aria-label={oneTime ? "Switch to monthly SIP" : "Switch to one-time investment"}
      onClick={() => replace({ name: "amount", fundId, mode: oneTime ? "sip" : "lump", preset: amount > 0 ? amount : undefined })}
    >
      <Icon name="caret-up-down" size={16} />
    </button>
  );
}

// One-time order pad, Figma "2 · One-time order pad" (7Jrg7bnhHGo1mitr3hJ2z2, node 25:2310).
const ONE_TIME_QUICK = [1000, 5000, 10000];

function OneTimePad({ fundId, preset }: { fundId: string; preset?: number }) {
  const { pop, push, payMethod, holdings } = useMf();
  const fund = fundById(fundId);
  // A later buy in a fund already held has its own (often lower) minimum.
  const min = holdings.some((h) => h.fundId === fundId) ? fund.minAdd : fund.minLump;
  const method = methodView(payMethod);
  // Opens on the fund's minimum (or the amount handed in), so it starts valid; errors show only after an edit.
  const [digits, setDigits] = useState(String(preset ?? min));
  const [typed, setTyped] = useState(false); // dots drift until the first amount change, then fade
  const amount = Number(digits || 0);
  const problem = fund.buy ? "This fund isn\u2019t taking one-time investments" : amountProblem(amount, min, fund.multiple);
  const low = problem !== null;

  // The method is already on screen, so Invest goes straight to the UPI app (or bank).
  function go() {
    if (!low) push({ name: "checkout", fundId, amount });
  }

  return (
    <Screen
      onBack={pop}
      className="pad"
      backdrop={<DotField active={!typed} />}
      heading={
        <PadHeading fund={fund} />
      }
      footer={
        <>
          <div className="mf-paywith">
            <button
              onClick={() => !low && push({ name: "paymode", fundId, amount })}
              disabled={low}
              aria-label="Change payment method"
            >
              <span className={`mf-paywith-logo${method.filled ? " filled" : ""}`}>
                <img src={asset(method.logo)} alt="" />
              </span>
              {method.title}
              <Icon name="chevron-down" size={16} />
            </button>
            <span>{method.sub}</span>
          </div>
          <button className="mf-btn solid wide" disabled={low} onClick={go}>
            Invest
          </button>
        </>
      }
    >
      <div className={`mf-pad-amount${low && amount > 0 ? " error" : ""}`}>
        <div className="mf-pad-label">
          <p>One time amount</p>
          <PadModeSwitch fundId={fundId} oneTime amount={amount} blocked={fund.buy === "halted"} />
        </div>
        <div className="mf-pad-figure" data-digits={digits.split(".")[0].length}>
          <b>
            <span className="rupee">₹</span>
            {digits ? <RollingAmount value={digits} /> : <em>0</em>}
          </b>
          <i className="caret" />
          <ClearAmount show={digits !== ""} onClear={() => { setTyped(true); setDigits(""); }} />
        </div>
        <span className="mf-pad-words">{rupeesInWords(amount)}</span>
        {low && <small>{problem}</small>}
      </div>

      <div className="mf-quick pad">
        {ONE_TIME_QUICK.map((q) => (
          <button
            key={q}
            onClick={() => {
              setTyped(true);
              setDigits(String(Math.round((amount + q) * 100) / 100));
            }}
          >
            + {inr(q)}
          </button>
        ))}
      </div>

      <Keypad
        onKey={(k) => {
          setTyped(true);
          setDigits((d) => applyKey(d, k));
        }}
      />
    </Screen>
  );
}

// SIP order pad, Figma "2 · One-time order pad" SIP variant (7Jrg7bnhHGo1mitr3hJ2z2, node 25:4412).
const SIP_QUICK = [1000, 5000, 10000];

// UPI AutoPay runs without a PIN per debit up to ₹1 lakh for mutual funds; above that needs eNACH (not in the prototype).
const UPI_AUTOPAY_MAX = 100000;

function SipPad({ fundId, preset }: { fundId: string; preset?: number }) {
  const { pop, push, payMethod, sips } = useMf();
  const fund = fundById(fundId);
  const min = fund.minSip;
  const existing = sips.find((s) => s.fundId === fundId);
  // Opens on the fund's minimum (or the amount carried over from the one-time pad), so the pad starts valid.
  const [digits, setDigits] = useState(String(preset ?? min));
  const [typed, setTyped] = useState(false); // dots drift until the first amount change, then fade
  const [day, setDay] = useState(5);
  const [picking, setPicking] = useState(false);
  const [explain, setExplain] = useState(false); // the "how SIP dates work" sheet over the date sheet
  const [draft, setDraft] = useState(day);
  const amount = Number(digits || 0);
  const max = Math.min(fund.maxSip ?? Infinity, UPI_AUTOPAY_MAX);
  const problem =
    fund.buy === "halted"
      ? "This fund isn\u2019t taking new SIPs"
      : existing
        ? `You already have a ${inr(existing.amount)} SIP here`
        : amount > UPI_AUTOPAY_MAX && max === UPI_AUTOPAY_MAX
          ? `UPI AutoPay allows up to ${inr(UPI_AUTOPAY_MAX)} a month`
          : amountProblem(amount, min, fund.multiple, max, " a month");
  const low = problem !== null;
  const account = mandateAccount(payMethod);

  // Like the one-time pad: Invest goes straight to the UPI app to approve AutoPay (or, with
  // AutoPay already on, straight to starting the SIP).
  function go() {
    if (!low) push({ name: "checkout", fundId, amount, day, payFirst: true }); // first instalment is always paid today
  }

  return (
    <Screen
      onBack={pop}
      className="pad"
      backdrop={<DotField active={!typed} />}
      heading={
        <PadHeading fund={fund} />
      }
      footer={
        <>
          <div className="mf-paywith">
            <span className="mf-paywith-mode">
              <span className="mf-paywith-logo mandate">
                <img src={asset("mandate-hdfc.png")} alt="" />
              </span>
              Pay via Mandate
              <Icon name="chevron-down" size={16} />
            </span>
            <span>{accountLabel(account)}</span>
          </div>
          <button className="mf-btn solid wide" disabled={low} onClick={go}>
            Invest
          </button>
        </>
      }
    >
      <div className={`mf-pad-amount${low && amount > 0 ? " error" : ""}`}>
        <div className="mf-pad-label">
          <p>Monthly SIP amount</p>
          <PadModeSwitch fundId={fundId} oneTime={false} amount={amount} blocked={fund.buy !== undefined} />
        </div>
        <div className="mf-pad-figure" data-digits={digits.split(".")[0].length}>
          <b>
            <span className="rupee">₹</span>
            {digits ? <RollingAmount value={digits} /> : <em>0</em>}
          </b>
          <i className="caret" />
          <ClearAmount show={digits !== ""} onClear={() => { setTyped(true); setDigits(""); }} />
        </div>
        <span className="mf-pad-words">{rupeesInWords(amount)}</span>
        {low && <small>{problem}</small>}
      </div>
      {existing && (
        <Notice icon="info">
          To change it, open <button className="text-link" onClick={() => push({ name: "sipdetail", fundId })}>your SIP</button>.
          A second SIP in the same fund isn&rsquo;t supported yet.
        </Notice>
      )}

      <div className="mf-quick pad">
        {SIP_QUICK.map((q) => (
          <button
            key={q}
            onClick={() => {
              setTyped(true);
              setDigits(String(Math.round((amount + q) * 100) / 100));
            }}
          >
            + {inr(q)}
          </button>
        ))}
      </div>

      <button
        className="mf-sip-date"
        onClick={() => {
          setDraft(day);
          setPicking(true);
        }}
        aria-haspopup="dialog"
      >
        <Icon name="calendar" size={20} />
        <span className="mf-sip-date-label">Monthly SIP on {ordinal(day)}</span>
        <Icon name="chevron-down-solid" size={16} />
      </button>

      <Keypad
        onKey={(k) => {
          setTyped(true);
          setDigits((d) => applyKey(d, k));
        }}
      />

      {picking && (
        <Sheet
          title="Choose SIP instalment date"
          action="Update"
          className="sip-date"
          onAction={() => {
            setDay(draft);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        >
          <div className="mf-days" role="radiogroup" aria-label="Day of the month">
            {SIP_DAY_ROWS.map((row) => (
              <div className="mf-days-row" key={row[0]}>
                {row.map((d) => (
                  <button
                    key={d}
                    role="radio"
                    aria-checked={d === draft}
                    className={d === draft ? "on" : ""}
                    disabled={d > 28}
                    onClick={() => setDraft(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button className="mf-days-next" onClick={() => setExplain(true)} aria-haspopup="dialog">
            Next SIP instalment on {firstDebit(draft, true)}
            <Icon name="info" size={18} />
          </button>
        </Sheet>
      )}
      {picking && explain && <SipDatesInfo day={draft} amount={amount} onClose={() => setExplain(false)} />}
    </Screen>
  );
}

// "How your SIP dates work": opens from the (i) under the date picker. It answers three questions in
// order: when does the money first move, when does it move after that, and what if that day is closed.
// It follows the day being looked at in the picker, so every case is reachable by tapping a date.
function SipDatesInfo({ day, amount, onClose }: { day: number; amount: number; onClose: () => void }) {
  const now = istNow();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rows = sipSchedule(day, 3, now);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  const daysAway = Math.round((thisMonth.getTime() - today.getTime()) / 864e5);
  const tooClose = daysAway >= 0 && daysAway < SIP_LEAD_DAYS; // this month's date is still ahead, but under the AutoPay notice
  const shiftedRow = rows.find((r) => r.shifted);
  const nth = ["2nd", "3rd", "4th"];
  const monthName = rows[0].due.toLocaleString("en-IN", { month: "long" });
  return (
    <Sheet title="How your SIP dates work" action="Got it" className="sip-date sip-why" onClose={onClose}>
      <ol className="sip-why-list">
        <li>
          <b>Today</b>
          <small>1st instalment. We place it as soon as you invest.</small>
        </li>
        {rows.map((r, i) => (
          <li key={r.due.getTime()} className={r.shifted ? "moved" : ""}>
            <b>{fmtWeekday(r.debit)}</b>
            <small>
              {nth[i]} instalment
              {r.shifted && <> · {fmtDay(r.due)} is {closedBecause(r.due)}, so it moves to the next working day</>}
            </small>
          </li>
        ))}
      </ol>
      <div className="sip-why-notes">
        <SheetLine icon="calendar">
          After today, {inr(amount)} is debited every month on the {ordinal(day)}. Your SIP date stays the {ordinal(day)} even
          when one month&rsquo;s debit moves.
        </SheetLine>
        <SheetLine icon="info">
          If the {ordinal(day)} is a weekend or a market holiday, that month&rsquo;s debit happens on the next working day.
          {!shiftedRow && " None of your next three fall on one."}
        </SheetLine>
        {tooClose && (
          <SheetLine icon="info">
            UPI AutoPay needs 24 hours&rsquo; notice before a debit. The {ordinal(day)} is too close for this month, so your
            next instalment is in {monthName}.
          </SheetLine>
        )}
        <SheetLine icon="nav-clock">Units are allotted 2 to 3 working days after each debit.</SheetLine>
      </div>
    </Sheet>
  );
}

const firstDebit = (day: number, withYear = false) => {
  const next = nextSipDate(day);
  return withYear ? `${fmtDay(next)} ${next.getFullYear()}` : fmtDay(next);
};

// ---- Holding and redeem -----------------------------------------------------------------

export function HoldingScreen({ fundId }: { fundId: string }) {
  const { pop, push, holdings, sips, orders } = useMf();
  const fund = fundById(fundId);
  const holding = holdings.find((h) => h.fundId === fundId);
  const sip = sips.find((s) => s.fundId === fundId);
  const mine = orders.filter((o) => o.fundId === fundId);
  if (!holding) {
    return (
      <Screen onBack={pop} title={fund.name}>
        <p className="mf-empty">You don&rsquo;t hold this fund any more.</p>
      </Screen>
    );
  }
  const gain = holding.current - holding.invested;
  const gainPct = (gain / holding.invested) * 100;
  return (
    <Screen
      onBack={pop}
      title="Your investment"
      right={
        <button className="mf-head-link" onClick={() => push({ name: "redeem", fundId })}>
          Redeem
        </button>
      }
      footer={
        // Starting a SIP leads; with one already running, investing more is all that's left.
        sip ? (
          <button
            className="mf-btn solid wide"
            disabled={!!fund.buy}
            onClick={() => push({ name: "amount", fundId, mode: "lump" })}
          >
            Invest more
          </button>
        ) : (
          <div className="mf-actions">
            <button
              className="mf-btn ghost"
              disabled={!!fund.buy}
              onClick={() => push({ name: "amount", fundId, mode: "lump" })}
            >
              Invest more
            </button>
            <button
              className="mf-btn solid"
              disabled={fund.buy === "halted"}
              onClick={() => push({ name: "amount", fundId, mode: "sip" })}
            >
              Start a SIP
            </button>
          </div>
        )
      }
    >
      <button className="mf-fundline link" onClick={() => push({ name: "fund", fundId })}>
        <FundMark fund={fund} size={40} />
        <span>
          <b>{fund.name}</b>
          <small>{fund.catLabel} · Direct plan</small>
        </span>
        <Icon name="caret-right" size={16} />
      </button>

      <div className="summary-card summary-card-lg">
        <div className="summary-grid">
          <span>
            <small>Current value</small>
            <strong>{inr(holding.current)}</strong>
          </span>
          <span className="summary-right">
            <small>Total returns</small>
            <strong className={gain >= 0 ? "up" : "down"}>
              {gain >= 0 ? "+" : ""}
              {inr(gain)} <em>({pct(gainPct, 2)})</em>
            </strong>
          </span>
        </div>
        <div className="summary-grid">
          <span>
            <small>Invested</small>
            <strong>{inr(holding.invested)}</strong>
          </span>
          <span className="summary-right">
            <small>Units</small>
            <strong>{holding.units.toFixed(3)}</strong>
          </span>
        </div>
      </div>

      {holding.pending && (
        <Notice icon="clock">
          <b>{holding.pending}.</b> Until then this shows what you paid. Returns start once units are allotted.
        </Notice>
      )}

      {sip && (
        <section className="mf-section">
          <h3>SIP</h3>
          <div className="mf-card flat">
            <Row label="SIP" value={`${inr(sip.amount)} a month`} />
            <Row label="Date" value={`${ordinal(sip.day)} of every month`} />
            <button className="st-link mf-sip-manage" onClick={() => push({ name: "sipdetail", fundId })}>
              Manage SIP
            </button>
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mf-section">
          <h3>Orders</h3>
          <ul className="row-list">
            {mine.map((order) => (
              <li key={order.id}>
                <button className="list-row" onClick={() => push({ name: "orderdetail", orderId: order.id })}>
                  <span className="row-main">
                    <b>{kindLabel(order.kind)}</b>
                    <small>{order.placedAt}</small>
                  </span>
                  <span className="row-side">
                    <b>{inr(order.amount)}</b>
                    <small className={statusClass(order)}>{statusLabel(order)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}

// ---- SIP tracking and cancel -------------------------------------------------------------

export const CANCEL_REASONS = [
  "I want to invest in a different fund",
  "I'm short on money right now",
  "The fund isn't doing well",
  "I'd rather invest one-time amounts",
  "I've reached my goal",
  "Something else",
];

// Four statuses everywhere (Initiated · In progress · Completed · Failed), from the one mapping in orderStatus.ts.
export const statusLabel = (order: MfOrder) => UI_STATUS_LABEL[uiStatus(order)];

export const statusClass = (order: MfOrder) => `st-${uiStatus(order)}`;

// Order types read One-time, SIP and Redemption; "Lumpsum" is only the internal key.
export const kindLabel = (kind: MfOrder["kind"]) =>
  kind === "Lumpsum" ? "One-time" : kind === "Redeem" ? "Redemption" : "SIP";

// "Not finished yet": Scheduled, In progress and Payment done all sit under the In progress chip.
export const isOpen = (order: MfOrder) => order.status !== "completed" && order.status !== "failed";

const DAY = 864e5;
const daysSince = (isoDate: string, now: Date) => Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY);

// Exit load on a sale, first-in-first-out: each lot pays the rate for its own age.
// PPFAS-style free units: that share of all units sells without load first.
function exitLoadFor(fund: Fund, lots: { date: string; units: number }[], sellUnits: number, perUnit: number, now: Date) {
  let free = (fund.loadFree ?? 0) * lots.reduce((s, l) => s + l.units, 0);
  let left = sellUnits;
  let load = 0;
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(lot.units, left);
    left -= take;
    const exempt = Math.min(free, take);
    free -= exempt;
    const age = daysSince(lot.date, now);
    const tier = fund.loads.find((t) => age < t.days);
    if (tier) load += (take - exempt) * perUnit * (tier.pct / 100);
  }
  return Math.round(load * 100) / 100;
}

// ---- Redeem pad -----------------------------------------------------------------------
// After the PM prototype (#redeem, #redsum, #rednav), benchmarked to Groww and Kotak:
// one number to type (amount or units), Redeem all, then a short summary sheet.
// Phase 1 shows no tax (STCG/LTCG) breakdown.

type RedeemBy = "amount" | "units";
type RedeemSheet = "by" | "value" | "summary" | "nav" | null;

export const REDEEM_BANK = "HDFC Bank **4417";

// Units go to 3 decimal places, as in the folio.
function applyUnitsKey(current: string, key: string): string {
  if (key === "del") return current.slice(0, -1);
  if (key === "." && current === "") return "0.";
  const next = (current === "0" && key !== "." ? "" : current) + key;
  return /^\d{0,7}(\.\d{0,3})?$/.test(next) ? next : current;
}

const floor3 = (u: number) => Math.floor(u * 1000 + 1e-6) / 1000;
export const unitsText = (u: number) =>
  u.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// The latest NAV the fund house has published: today's after about 10 PM on a working day, else the working day before.
function lastNavDay(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (isBusinessDay(d) && now.getHours() >= 22) return d;
  do d.setDate(d.getDate() - 1);
  while (!isBusinessDay(d));
  return d;
}

export function RedeemScreen({ fundId }: { fundId: string }) {
  const { pop, replace, holdings, placeRedeem } = useMf();
  const fund = fundById(fundId);
  const holding = holdings.find((h) => h.fundId === fundId);
  const [by, setBy] = useState<RedeemBy>("amount");
  const [draftBy, setDraftBy] = useState<RedeemBy>("amount");
  const [digits, setDigits] = useState("");
  const [typed, setTyped] = useState(false); // dots drift until the first edit, as on the invest pad
  const [sheet, setSheet] = useState<RedeemSheet>(null);
  const [navFromSummary, setNavFromSummary] = useState(false);
  if (!holding) return null;

  const now = istNow();
  const kind = cutoffKind(fund);
  const perUnit = holding.current / holding.units;

  // Units that can be sold today: allotted, and for a tax saver, 3 years past their own purchase date.
  const unlockDate = (d: string) => {
    const t = new Date(d);
    return new Date(t.getFullYear() + ELSS_LOCK_YEARS, t.getMonth(), t.getDate());
  };
  const isLocked = (d: string) => !!fund.lockIn && unlockDate(d) > now;
  const freeLots = holding.lots.filter((l) => l.allotted && !isLocked(l.date));
  const lockedLots = holding.lots.filter((l) => l.allotted && isLocked(l.date));
  const waiting = holding.lots.filter((l) => !l.allotted).reduce((s, l) => s + l.units, 0);
  const locked = lockedLots.reduce((s, l) => s + l.units, 0);
  const freeUnits = freeLots.reduce((s, l) => s + l.units, 0);
  const maxUnits = floor3(freeUnits);
  const freeValue = Math.floor(freeUnits * perUnit);
  const nothing = maxUnits <= 0;
  const firstLocked = lockedLots.length ? unlockDate(lockedLots[0].date) : null;
  const nextUnlock = firstLocked ? `${fmtDay(firstLocked)} ${firstLocked.getFullYear()}` : "";
  const lockLabel = fund.lockIn?.replace(" years", "-year") ?? "";

  // What's on the pad. "All" is whatever equals the full redeemable figure, typed or ticked.
  const n = Number(digits || 0);
  const all = !nothing && n > 0 && (by === "amount" ? n === freeValue : n === maxUnits);
  const sellUnits = all ? freeUnits : by === "amount" ? n / perUnit : n;
  const value = all ? freeValue : by === "amount" ? n : Math.floor(n * perUnit);
  const problem =
    nothing || n <= 0
      ? null
      : by === "amount"
        ? n > freeValue
          ? `You can redeem up to ${inr(freeValue)}`
          : null
        : n > maxUnits
          ? `You can redeem up to ${unitsText(maxUnits)} units`
          : value < 1
            ? "That's worth less than ₹1. Enter more units."
            : null;
  const ok = !nothing && n > 0 && !problem;

  const late = afterCutoff(now, kind);
  const workday = isBusinessDay(now);
  const trade = tradeDay(now, kind);
  const nav = fmtDay(trade);
  const credit = addBusinessDays(trade, payoutDays(fund));
  const lastNav = fmtDay(lastNavDay(now));
  const cutoff = cutoffLabel(kind);
  const exit = ok ? exitLoadFor(fund, freeLots, sellUnits, perUnit, now) : 0;

  const edit = (key: string) => {
    setTyped(true);
    setDigits((d) => (by === "units" ? applyUnitsKey(d, key) : applyKey(d, key)));
  };
  const toggleAll = () => {
    setTyped(true);
    setDigits(all ? "" : by === "amount" ? String(freeValue) : maxUnits.toFixed(3));
  };
  // Switching keeps the same redemption: the figure converts at the last NAV.
  const switchTo = (next: RedeemBy) => {
    if (next === by) return;
    setBy(next);
    if (all) setDigits(next === "amount" ? String(freeValue) : maxUnits.toFixed(3));
    else if (n > 0) setDigits(next === "amount" ? String(Math.floor(n * perUnit)) : floor3(n / perUnit).toFixed(3));
  };

  const helper = !n
    ? by === "amount"
      ? "Enter an amount"
      : "Enter units"
    : by === "amount"
      ? <>You are redeeming <b>{unitsText(sellUnits)} units</b></>
      : <>Worth about <b>{inr(value)}</b></>;

  return (
    <Screen
      onBack={pop}
      className="pad redeem"
      backdrop={<DotField active={!typed} />}
      heading={
        <div className="mf-fundline">
          <FundMark fund={fund} size={32} />
          <span>
            <b>{fund.name}</b>
            <small>Direct · Growth</small>
          </span>
        </div>
      }
      footer={
        <button className="mf-btn solid wide" disabled={!ok} onClick={() => setSheet("summary")}>
          Continue
        </button>
      }
    >
      {nothing ? (
        <Notice icon="clock">
          {locked > 0 ? (
            <>
              <b>Nothing to redeem yet.</b> All your units are in the {lockLabel} lock-in. The first ones free up on{" "}
              {nextUnlock}.
            </>
          ) : (
            <>
              <b>Nothing to redeem yet.</b> Your units are still being allotted. You can redeem once they show in your
              folio.
            </>
          )}
        </Notice>
      ) : (
        <>
          <div className={`mf-pad-amount${problem ? " error" : ""}`}>
            <p>{by === "amount" ? "Redemption amount" : "Units to redeem"}</p>
            <div className="mf-pad-figure" data-digits={digits.split(".")[0].length}>
              <b>
                {by === "amount" && <span className="rupee">₹</span>}
                {digits ? <RollingAmount value={digits} /> : <em>0</em>}
              </b>
              <i className="caret" />
              <ClearAmount show={digits !== ""} onClear={() => { setTyped(true); setDigits(""); }} />
            </div>
            {by === "amount" && <span className="mf-pad-words">{rupeesInWords(n)}</span>}
            {problem ? <small>{problem}</small> : <small className="hint">{helper}</small>}
          </div>

          <label className={`mf-redeem-all${all ? " on" : ""}`}>
            <input type="checkbox" checked={all} onChange={toggleAll} />
            <span className="box" aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            Redeem all · {by === "amount" ? inr(freeValue) : `${unitsText(maxUnits)} units`}
            <button
              type="button"
              className="mf-redeem-info"
              aria-label="About the redeemable value"
              aria-haspopup="dialog"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSheet("value");
              }}
            >
              <Icon name="info" size={16} />
            </button>
          </label>

          <button
            className="mf-strip"
            onClick={() => {
              setNavFromSummary(false);
              setSheet("nav");
            }}
            aria-haspopup="dialog"
          >
            <span>
              Amount is approximate, at the {lastNav} NAV. Applicable NAV date {nav}.
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
          <Keypad decimal onKey={edit} />
        </>
      )}

      {sheet === "by" && (
        <Sheet
          title="Redeem by"
          action="Done"
          onAction={() => {
            switchTo(draftBy);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        >
          <div className="mf-options" role="radiogroup" aria-label="Redeem by">
            {(
              [
                ["amount", "Amount", "Enter how much money you want back"],
                ["units", "Units", "Enter how many units to sell"],
              ] as const
            ).map(([key, title, sub]) => (
              <label key={key} className={`mf-option${draftBy === key ? " on" : ""}`}>
                <input type="radio" name="redeem-by" checked={draftBy === key} onChange={() => setDraftBy(key)} />
                <span className="radio" />
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
              </label>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "value" && (
        <Sheet title="Redeemable value" onClose={() => setSheet(null)}>
          <SheetLine icon="info">
            What the units you can sell today are worth at the {lastNav} NAV: {unitsText(maxUnits)} units,{" "}
            {inr(freeValue)}.
          </SheetLine>
          {locked > 0 && (
            <SheetLine icon="clock">
              {unitsText(locked)} units ({inr(Math.floor(locked * perUnit))}) are in the {lockLabel} lock-in. Each
              purchase unlocks 3 years after it was made; the next on {nextUnlock}.
            </SheetLine>
          )}
          {waiting > 0 && (
            <SheetLine icon="clock">
              {unitsText(waiting)} units are still being allotted. You can redeem them once they show in your folio.
            </SheetLine>
          )}
        </Sheet>
      )}

      {sheet === "summary" && (
        <Sheet
          title="Summary"
          action="Redeem"
          className="redeem-sum"
          onAction={() => replace({ name: "done", done: placeRedeem(fundId, sellUnits, value) })}
          onClose={() => setSheet(null)}
        >
          <div className="mf-redeem-sum">
            <div className="credit">
              <small>Estimated credit date</small>
              <strong>{fmtDay(credit)}</strong>
              <span>To {REDEEM_BANK}</span>
            </div>
            <div className="rows">
              <Row label="Units" value={unitsText(sellUnits)} />
              <div className="mf-kv">
                <span className="with-info">
                  Applicable NAV date
                  <button
                    aria-label="Why this NAV date"
                    onClick={() => {
                      setNavFromSummary(true);
                      setSheet("nav");
                    }}
                  >
                    <Icon name="info" size={16} />
                  </button>
                </span>
                <b>{nav}</b>
              </div>
              <Row
                label={by === "amount" && !all ? "Amount requested" : "Approximate value"}
                value={by === "amount" && !all ? inr(value, 2) : `about ${inr(value)}`}
              />
              {exit > 0 && <Row label="Exit load" hint="On units held for a short time" value={`about ${inr(exit, 2)}`} />}
            </div>
            <Notice tone="warn" icon="warning-circle">
              The final amount may differ. It is calculated on the NAV of {nav}, which is not published yet.
            </Notice>
          </div>
        </Sheet>
      )}

      {sheet === "nav" && (
        <Sheet
          title={late ? `Why is my NAV date ${nav} and not today?` : `Applicable NAV date ${nav}`}
          onClose={() => setSheet(navFromSummary ? "summary" : null)}
        >
          <p className="mf-sheet-text">
            {!workday
              ? `Today isn't a working day for mutual funds, so the order gets the next working day's NAV, which is ${nav}.`
              : late
                ? `You're placing this order after the fund's cut-off time of ${cutoff}. Orders after the cut-off get the next working day's NAV, which is ${nav}.`
                : `You're placing this order before the fund's cut-off time of ${cutoff}, so it gets today's NAV.`}
          </p>
          <div className="mf-redeem-navbox">
            <Row label="You're placing the order" value={`${fmtDay(now)}, ${fmtTime(now)}`} />
            <Row label="Fund's cut-off time" value={cutoff} />
            <Row label="Applicable NAV date" value={<em>{nav}</em>} />
          </div>
          <p className="mf-sheet-text muted">
            The NAV for {nav} is published at the end of that day, so the exact amount is known only after your units are
            sold.
          </p>
        </Sheet>
      )}
    </Screen>
  );
}
