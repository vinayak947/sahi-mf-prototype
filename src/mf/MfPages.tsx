import { useEffect, useRef, useState, type ReactNode } from "react";
import { Block } from "../ui/widgets";
import { Icon } from "../ui/Icon";
import { fundById } from "./data";
import { blendSeries, fmtDay, inr, pct, xirr, type Range } from "./format";
import { FundMark } from "./parts";
import { FundListBody, RangeChart } from "./screens";
import { BasketHoldingsTab } from "./BasketHoldings";
import { OrdersList2, type TypeFilter } from "./OrdersList2";
import { useMf } from "./store";

// "Stocks | Mutual funds" switch used at the top of Orders and Portfolio.
export function SegmentChips({
  value,
  onChange,
  withOverview,
}: {
  value: string;
  onChange: (value: "overview" | "stocks" | "mf") => void;
  withOverview?: boolean;
}) {
  const items: { key: "overview" | "stocks" | "mf"; label: string }[] = [
    ...(withOverview ? [{ key: "overview" as const, label: "Overview" }] : []),
    { key: "stocks", label: "Stocks" },
    { key: "mf", label: "Mutual funds" },
  ];
  return (
    <div className="chip-row page-chips">
      {items.map((item) => (
        <button
          className={`chip${value === item.key ? " active" : ""}`}
          key={item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// The Orders page seen from inside Mutual Funds: the order-type filter sits at the right of the header.
export function MfOrdersPage({ segments }: { segments?: ReactNode }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [picking, setPicking] = useState(false);

  return (
    <>
      <div className="mf-pf-head">
        <h1 className="page-title">Orders</h1>
        <button
          className={`mf-orders-filter${type !== "all" ? " on" : ""}`}
          aria-label="Filter by order type"
          onClick={() => setPicking(true)}
        >
          <Icon name="funnel-simple" size={20} />
        </button>
      </div>
      {segments}
      <OrdersList2 type={type} picking={picking} onType={setType} onClosePicker={() => setPicking(false)} />
    </>
  );
}

// Mutual funds and baskets are held and shown apart, so a switcher sits on top.
export function MfPortfolio({ hideSips = false, showBaskets = true }: { hideSips?: boolean; showBaskets?: boolean }) {
  const [kind, setKind] = useState<"funds" | "baskets">("funds");
  // Funds only: no switcher, just the holdings.
  if (!showBaskets) return <FundsPortfolio hideSips={hideSips} />;
  return (
    <>
      <div className="tabs-row mf-subtabs">
        <div className="tabs-list" role="tablist" aria-label="What you hold">
          {(["funds", "baskets"] as const).map((k) => (
            <button
              key={k}
              className={`tab-underlined${kind === k ? " active" : ""}`}
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
            >
              {k === "funds" ? "Mutual funds" : "Baskets"}
            </button>
          ))}
        </div>
      </div>
      {kind === "funds" ? <FundsPortfolio hideSips={hideSips} /> : <BasketHoldingsTab />}
    </>
  );
}

// The Portfolio page seen from inside Mutual Funds. A "more" button beside the title opens a
// product setting: show mutual funds only, or mutual funds and baskets (which brings the switcher back).
type PortfolioView = "funds" | "both";
const PORTFOLIO_VIEW_KEY = "sahi-dev-portfolio-view";
const PORTFOLIO_VIEWS: { key: PortfolioView; label: string }[] = [
  { key: "funds", label: "Mutual funds" },
  { key: "both", label: "Mutual funds + Baskets" },
];

function readPortfolioView(): PortfolioView {
  try {
    return localStorage.getItem(PORTFOLIO_VIEW_KEY) === "both" ? "both" : "funds";
  } catch {
    return "funds";
  }
}

export function MfPortfolioPage() {
  const [view, setView] = useState<PortfolioView>(readPortfolioView);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (next: PortfolioView) => {
    setView(next);
    setOpen(false);
    try {
      localStorage.setItem(PORTFOLIO_VIEW_KEY, next);
    } catch {
      /* storage blocked: the setting still works for this visit */
    }
  };

  return (
    <>
      <div className="mf-pf-head">
        <h1 className="page-title">Portfolio</h1>
        <div className="mf-pf-more" ref={wrap}>
          <button
            className="mf-pf-more-btn"
            aria-label="Portfolio settings"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="dots-three-vertical" size={20} />
          </button>
          {open && (
            <div className="mf-pf-menu" role="menu" aria-label="Show in Portfolio">
              <p>Show in Portfolio</p>
              {PORTFOLIO_VIEWS.map((v) => (
                <button
                  key={v.key}
                  role="menuitemradio"
                  aria-checked={view === v.key}
                  className={view === v.key ? "on" : undefined}
                  onClick={() => pick(v.key)}
                >
                  <i aria-hidden="true" />
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MfPortfolio hideSips showBaskets={view === "both"} />
    </>
  );
}

function FundsPortfolio({ hideSips = false }: { hideSips?: boolean }) {
  const { holdings, push, setSegment } = useMf();
  const current = holdings.reduce((s, h) => s + h.current, 0);
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const gain = current - invested;

  if (holdings.length === 0) {
    return (
      <div className="mf-empty-card tall">
        <b>No mutual funds yet</b>
        <p>Start a SIP from ₹100 or invest a one-time amount. Your funds will show up here.</p>
        <button className="mf-btn solid" onClick={() => push({ name: "list", spec: { title: "All mutual funds" } })}>
          Browse funds
        </button>
        <button className="proto-link" onClick={() => setSegment("holdings")}>
          Prototype · show with sample holdings
        </button>
      </div>
    );
  }

  return <SipHoldingTabs current={current} invested={invested} gain={gain} hideSips={hideSips} />;
}

function SipHoldingTabs({
  current,
  invested,
  gain,
  hideSips,
}: {
  current: number;
  invested: number;
  gain: number;
  hideSips: boolean;
}) {
  const { holdings, sips } = useMf();
  const [tab, setTab] = useState<"h" | "s">("h");
  return (
    <>
      {!hideSips && (
      <div className="tabs-row mf-subtabs">
        <div className="tabs-list">
          <button className={`tab-underlined${tab === "h" ? " active" : ""}`} onClick={() => setTab("h")}>
            Holdings ({holdings.length})
          </button>
          {!hideSips && (
            <button className={`tab-underlined${tab === "s" ? " active" : ""}`} onClick={() => setTab("s")}>
              SIPs ({sips.length})
            </button>
          )}
        </div>
      </div>
      )}

      {tab === "h" ? (
        <HoldingsDashboard current={current} invested={invested} gain={gain} />
      ) : (
        <ul className="holding-list">
          {sips.length === 0 && <p className="mf-empty">No SIPs yet.</p>}
          {sips.map((s) => {
            const fund = fundById(s.fundId);
            const t = new Date();
            const next = new Date(t.getFullYear(), t.getMonth() + (t.getDate() >= s.day ? 1 : 0), s.day);
            return (
              <li key={s.fundId}>
                <div className="holding-row">
                  <span className="holding-top">
                    <b>
                      <FundMark fund={fund} size={32} />
                      {fund.name}
                    </b>
                  </span>
                  <span className="holding-bot">
                    <small>
                      <b>{inr(s.amount)}</b> every month
                    </small>
                    <small>
                      Next debit: <b>{next.getDate()} {next.toLocaleString("en-IN", { month: "short" })}</b>
                    </small>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const subCategory = (catLabel: string) => catLabel.split(" · ")[1] ?? catLabel;

const SORTS = [
  { key: "returns", label: "Returns" },
  { key: "current", label: "Current value" },
  { key: "invested", label: "Invested" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

// MF portfolio dashboard: totals, where the money sits, then every fund with what it has made.
function HoldingsDashboard({ current, invested, gain }: { current: number; invested: number; gain: number }) {
  const { holdings, sips, push } = useMf();
  const [sort, setSort] = useState<SortKey>("returns");

  const rows = holdings.map((h) => {
    const fund = fundById(h.fundId);
    const g = h.current - h.invested;
    return { h, fund, g, gPct: (g / h.invested) * 100, sub: subCategory(fund.catLabel) };
  });

  // Each purchase is a cash outflow on its date (the amount split by units); today's value comes back in.
  const flows = holdings.flatMap((h) =>
    h.lots.map((l) => ({ date: new Date(l.date), amount: -(h.invested * l.units) / h.units })),
  );
  const rate = xirr([...flows, { date: new Date(), amount: current }]);
  // Today's move: each allotted holding moves with its fund's NAV change on the day.
  const day = holdings.reduce((sum, h) => {
    if (h.pending) return sum;
    const change = fundById(h.fundId).navChange;
    return sum + h.current - h.current / (1 + change / 100);
  }, 0);

  const portfolioSeries = (range: Range) =>
    blendSeries(
      holdings.map((h) => {
        const fund = fundById(h.fundId);
        return { weight: h.current, id: fund.id, r1: fund.r1, r3: fund.r3, r5: fund.r5 };
      }),
      range,
    );

  const shown = rows.sort((a, b) =>
    sort === "returns" ? b.gPct - a.gPct : sort === "current" ? b.h.current - a.h.current : b.h.invested - a.h.invested,
  );
  const sortLabel = SORTS.find((x) => x.key === sort)!.label;
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((x) => x.key === sort) + 1) % SORTS.length].key);

  return (
    <>
      <div className="mf-pf-card flat">
        <small>Holdings</small>
        <div className="mf-pf-total">
          <strong>{inr(current)}</strong>
          {rate !== null && <em className={rate >= 0 ? "up" : "down"}>XIRR {(rate * 100).toFixed(1)}%</em>}
        </div>
        <RangeChart initial="1M" seriesFor={portfolioSeries} showChange={false} />
        <dl className="mf-pf-stats">
          <div>
            <dt>Total Returns</dt>
            <dd>{inr(gain)}</dd>
          </div>
          <div>
            <dt>Invested</dt>
            <dd>{inr(invested)}</dd>
          </div>
          <div>
            <dt>1D returns</dt>
            <dd>{inr(day)}</dd>
          </div>
        </dl>
      </div>

      <div className="mf-pf-bar">
        <span>
          {shown.length} {shown.length === 1 ? "fund" : "funds"}
        </span>
        <button className="text-link" onClick={nextSort}>
          Sort: {sortLabel} <Icon name="caret-up-down" size={14} />
        </button>
      </div>

      <ul className="holding-list">
        {shown.map(({ h, fund, g, gPct, sub }) => {
          const sip = sips.find((x) => x.fundId === h.fundId);
          return (
            <li key={h.fundId}>
              <button className="holding-row" onClick={() => push({ name: "holding", fundId: h.fundId })}>
                <span className="holding-top">
                  <b>
                    <FundMark fund={fund} size={32} />
                    <span className="mf-pf-name">
                      {fund.name}
                      <small>
                        {sub}
                        {sip && ` · SIP ${inr(sip.amount)}/mo`}
                      </small>
                    </span>
                  </b>
                  <span className="mf-pf-value">
                    <b>{h.pending ? inr(h.invested) : inr(h.current)}</b>
                    <small className={g >= 0 ? "up" : "down"}>
                      {g >= 0 ? "+" : ""}
                      {inr(g)} ({pct(gPct, 2)})
                    </small>
                  </span>
                </span>
                {/* No invested / units line; only a fund still waiting on its units says when they land. */}
                {h.pending && (
                  <span className="holding-bot mf-pf-bot">
                    <small>
                      <b>{h.pending}</b>
                    </small>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// Overview: stocks and MFs side by side (the "one portfolio" idea in the PRD).
export function PortfolioOverview({ onOpen }: { onOpen: (view: "stocks" | "mf") => void }) {
  const { holdings } = useMf();
  const mfCurrent = holdings.reduce((s, h) => s + h.current, 0);
  const mfInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const stockCurrent = 22826;
  const stockInvested = 15897;
  const total = stockCurrent + mfCurrent;
  const totalInv = stockInvested + mfInvested;
  const gain = total - totalInv;
  const mfShare = total ? (mfCurrent / total) * 100 : 0;

  return (
    <>
      <div className="summary-card summary-card-lg">
        <div className="summary-grid">
          <span>
            <small>Portfolio value</small>
            <strong>{inr(total)}</strong>
          </span>
          <span className="summary-right">
            <small>Total P&amp;L</small>
            <strong className={gain >= 0 ? "up" : "down"}>
              {gain >= 0 ? "+" : ""}
              {inr(gain)} <em>({pct((gain / totalInv) * 100, 2)})</em>
            </strong>
          </span>
        </div>
        <div className="mf-split" aria-hidden="true">
          <i style={{ width: `${100 - mfShare}%` }} />
          <i className="mf" style={{ width: `${mfShare}%` }} />
        </div>
        <div className="mf-split-legend">
          <span>
            <u /> Stocks {Math.round(100 - mfShare)}%
          </span>
          <span>
            <u className="mf" /> Mutual funds {Math.round(mfShare)}%
          </span>
        </div>
      </div>

      <div className="mf-gap" />
      <Block title="Where your money is" divided={false}>
        <ul className="holding-list">
          <li>
            <button className="holding-row" onClick={() => onOpen("stocks")}>
              <span className="holding-top">
                <b>Stocks</b>
                <Icon name="caret-right" size={16} />
              </span>
              <span className="holding-bot">
                <small>
                  Current: <b>{inr(stockCurrent)}</b>
                </small>
                <small className="up">+{inr(stockCurrent - stockInvested)} (43.59%)</small>
              </span>
            </button>
          </li>
          <li>
            <button className="holding-row" onClick={() => onOpen("mf")}>
              <span className="holding-top">
                <b>Mutual funds</b>
                <Icon name="caret-right" size={16} />
              </span>
              <span className="holding-bot">
                <small>
                  {holdings.length === 0 ? (
                    "No funds yet"
                  ) : (
                    <>
                      Current: <b>{inr(mfCurrent)}</b>
                    </>
                  )}
                </small>
                {holdings.length > 0 && (
                  <small className={mfCurrent >= mfInvested ? "up" : "down"}>
                    {mfCurrent >= mfInvested ? "+" : ""}
                    {inr(mfCurrent - mfInvested)} ({pct(((mfCurrent - mfInvested) / mfInvested) * 100, 2)})
                  </small>
                )}
              </span>
            </button>
          </li>
        </ul>
      </Block>
    </>
  );
}

// SIP tab (Mutual Funds bottom bar): what is running and what is due next.
export function SipPage() {
  const { sips, push, setSegment } = useMf();
  const today = new Date();
  const upcoming = sips
    .map((s) => ({
      ...s,
      next: new Date(today.getFullYear(), today.getMonth() + (today.getDate() >= s.day ? 1 : 0), s.day),
    }))
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  const monthly = sips.reduce((sum, s) => sum + s.amount, 0);
  const dueSoon = upcoming.filter((s) => (s.next.getTime() - today.getTime()) / 864e5 <= 2);
  const fromHundred = { title: "SIP from ₹100", sipOnly: true, caption: "Funds you can start with ₹100 a month. Stop anytime." };
  const startList = () => push({ name: "list", spec: fromHundred });

  return (
    <main className="page">
      <h1 className="page-title">SIPs</h1>

      {sips.length === 0 ? (
        // No SIP running (never invested, or one-time only): ₹0 a month, a way in, and the ₹100 funds right below.
        <>
          <div className="mf-sip-zero">
            <small>Monthly SIP amount</small>
            <strong>{inr(0)}</strong>
            <button onClick={startList}>
              Start a new SIP
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
          <p className="mf-lede">{fromHundred.caption}</p>
          <FundListBody spec={fromHundred} />
          <button className="proto-link" onClick={() => setSegment("holdings")}>
            Prototype · show with sample SIPs
          </button>
        </>
      ) : (
        <>
            <div className="mf-sip-zero">
              <small>
                Monthly SIP amount · {sips.length} {sips.length === 1 ? "SIP" : "SIPs"}
              </small>
              <strong>{inr(monthly)}</strong>
              <div className="mf-sip-due">
                <Icon name="clock" size={24} />
                <span>
                  {dueSoon.length > 0 ? (
                    <>
                      <b>{inr(dueSoon.reduce((sum, s) => sum + s.amount, 0))} due in the next 2 days</b>
                      <small>
                        {dueSoon.length === 1 ? fundById(dueSoon[0].fundId).name : `${dueSoon.length} SIPs`} · debits on{" "}
                        {fmtDay(dueSoon[0].next)}
                      </small>
                    </>
                  ) : (
                    <>
                      <b>Next debit on {fmtDay(upcoming[0].next)}</b>
                      <small>
                        {fundById(upcoming[0].fundId).name} · {inr(upcoming[0].amount)}
                      </small>
                    </>
                  )}
                </span>
              </div>
            </div>

          <div className="block-head mf-sip-head">
            <h2>Active SIPs ({sips.length})</h2>
          </div>
          <ul className="row-list">
            {upcoming.map((s) => {
              const fund = fundById(s.fundId);
              return (
                <li key={s.fundId}>
                  <button className="list-row fund-row" onClick={() => push({ name: "sipdetail", fundId: s.fundId })}>
                    <FundMark fund={fund} />
                    <span className="row-main">
                      <b>{fund.name}</b>
                      <small>{inr(s.amount)} every month</small>
                    </span>
                    <span className="row-side">
                      <b>
                        {s.next.getDate()} {s.next.toLocaleString("en-IN", { month: "short" })}
                      </b>
                      <small>Next debit</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
