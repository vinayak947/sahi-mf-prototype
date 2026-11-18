import { Masked, toggleHidden, useHidden } from "./privacy";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../assets";
import { RollText } from "../ui/RollText";
import { Block, DlsTab } from "../ui/widgets";
import { Icon } from "../ui/Icon";
import { MarketOrders } from "./MarketOrders";
import { fundById } from "./data";
import { fmtDay, inr, inrShort, pct, xirr } from "./format";
import { FundMark } from "./parts";
import { BasketHoldingsTab } from "./BasketHoldings";
import { OrdersList2, type TypeFilter } from "./OrdersList2";
import { SIP_FROM_100 } from "./listSpecs";
import { useMf } from "./store";
import { FilterSortSheet } from "./FilterSortSheet";

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
type OrderMarket = "mf" | "stocks" | "fno";

// Chips under the Orders title: one orders view per market; the picked one carries a check.
export function OrderMarketPills({ value, onChange }: { value: OrderMarket; onChange: (next: OrderMarket) => void }) {
  const items: { key: OrderMarket; label: string }[] = [
    { key: "mf", label: "Mutual funds" },
    { key: "stocks", label: "Stocks" },
    { key: "fno", label: "F&O" },
  ];
  return (
    <div className="chip-row page-chips order-pills" role="tablist" aria-label="Order type">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button key={item.key} role="tab" aria-selected={active} className={`chip${active ? " active" : ""}`} onClick={() => onChange(item.key)}>
            {item.label}
            {active && <Icon name="check" size={16} />}
          </button>
        );
      })}
    </div>
  );
}

export function MfOrdersPage({ segments }: { segments?: ReactNode }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [picking, setPicking] = useState(false);
  const [market, setMarket] = useState<OrderMarket>("mf");
  const { push } = useMf();

  return (
    <>
      <div className="mf-pf-head">
        <h1 className="page-title">Orders</h1>
        <button
          className="mf-pf-more-btn"
          aria-label="Search orders"
          onClick={() => push({ name: "ordersearch" })}
        >
          <Icon name="magnifying-glass" size={24} />
        </button>
      </div>
      {segments || <OrderMarketPills value={market} onChange={setMarket} />}
      {market === "mf" || segments ? (
        <OrdersList2
          type={type}
          picking={picking}
          onType={setType}
          onClosePicker={() => setPicking(false)}
          onOpenPicker={() => setPicking(true)}
        />
      ) : (
        <MarketOrders market={market} />
      )}
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
            <DlsTab key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "funds" ? "Mutual funds" : "Baskets"}
            </DlsTab>
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
  const { holdings, push } = useMf();
  const current = holdings.reduce((s, h) => s + h.current, 0);
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const gain = current - invested;

  if (holdings.length === 0) {
    return (
      <div className="mf-sip-zero">
        <small>Current value</small>
        <strong>{inr(0)}</strong>
        <button onClick={() => push({ name: "list", spec: { title: "All mutual funds" } })}>
          Browse funds
          <Icon name="chevron-right" size={20} />
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
        <div className="tabs-list" role="tablist" aria-label="Holdings and SIPs">
          <DlsTab active={tab === "h"} onClick={() => setTab("h")}>
            Holdings ({holdings.length})
          </DlsTab>
          {!hideSips && (
            <DlsTab active={tab === "s"} onClick={() => setTab("s")}>
              SIPs ({sips.length})
            </DlsTab>
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
  { key: "current", label: "Current value - High to low" },
  { key: "invested", label: "Invested - High to low" },
  { key: "abs", label: "Absolute return - High to low" },
  { key: "absPct", label: "Absolute return % - High to low" },
  { key: "xirr", label: "XIRR - High to low" },
  { key: "az", label: "Alphabetical (A-Z)" },
  { key: "za", label: "Alphabetical (Z-A)" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

// MF portfolio dashboard: totals, where the money sits, then every fund with what it has made.
function HoldingsDashboard({ current, invested, gain }: { current: number; invested: number; gain: number }) {
  const { holdings, sips, push } = useMf();
  const [sort, setSort] = useState<SortKey>("current");
  const [sorting, setSorting] = useState(false);

  const rows = holdings.map((h) => {
    const fund = fundById(h.fundId);
    const g = h.current - h.invested;
    const fundFlows = h.lots.map((l) => ({ date: new Date(l.date), amount: -(h.invested * l.units) / h.units }));
    const fundRate = xirr([...fundFlows, { date: new Date(), amount: h.current }]) ?? -Infinity;
    return { h, fund, g, gPct: (g / h.invested) * 100, fundRate, sub: subCategory(fund.catLabel) };
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

  const shown = rows.sort((a, b) => {
    switch (sort) {
      case "invested": return b.h.invested - a.h.invested;
      case "abs": return b.g - a.g;
      case "absPct": return b.gPct - a.gPct;
      case "xirr": return b.fundRate - a.fundRate;
      case "az": return a.fund.name.localeCompare(b.fund.name);
      case "za": return b.fund.name.localeCompare(a.fund.name);
      default: return b.h.current - a.h.current;
    }
  });

  return (
    <>
      <PfSummary
        tone={day >= 0 ? "positive" : "negative"}
        hero={inr(current)}
        note={rate !== null ? <span className={rate >= 0 ? "up" : "down"}>XIRR {(rate * 100).toFixed(1)}%</span> : undefined}
        stats={[
          ["Total returns", <PfDelta key="t" amount={gain} pctValue={(gain / invested) * 100} />],
          ["Invested", <b key="i"><RollText text={inrShort(invested)} /></b>],
          ["1D returns", <PfDelta key="d" amount={day} pctValue={(day / (current - day)) * 100} />],
        ]}
      />

      <div className="pf-sheet">
      <div className="mf-pf-bar">
        <span>
          {shown.length} {shown.length === 1 ? "fund" : "funds"}
        </span>
        <button
          className={`dls-chip mf-orders-typechip${sort !== "current" ? " on" : ""}`}
          onClick={() => setSorting(true)}
          aria-label="Sort holdings"
        >
          <Icon name="funnel-simple" size={16} />
        </button>
      </div>

      <ul className="os-list">
        {shown.map(({ h, fund, g, gPct }) => (
          <li key={h.fundId}>
            <button className="os-row" onClick={() => push({ name: "holding", fundId: h.fundId })}>
              <FundMark fund={fund} size={40} />
              <span className="os-mid">
                <b>{fund.name}</b>
                <small>{h.pending ?? fund.catLabel}</small>
              </span>
              <span className="os-end">
                <span className="os-amt">
                  <Masked>{h.pending ? inr(h.invested) : inr(h.current)}</Masked>
                </span>
                <small className={`os-gain ${g >= 0 ? "up" : "down"}`}>
                  <Masked>
                    {g >= 0 ? "+" : ""}
                    {inr(g)} ({pct(gPct, 2)})
                  </Masked>
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      </div>

      {sorting && (
        <FilterSortSheet
          groups={[]}
          sorts={[...SORTS]}
          picks={{}}
          sort={sort}
          defaultSort="current"
          onApply={(_picks, next) => setSort(next)}
          onClose={() => setSorting(false)}
        />
      )}
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
  const { sips, push } = useMf();
  const today = new Date();
  const upcoming = sips
    .map((s) => ({
      ...s,
      next: new Date(today.getFullYear(), today.getMonth() + (today.getDate() >= s.day ? 1 : 0), s.day),
    }))
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  const monthly = sips.reduce((sum, s) => sum + s.amount, 0);
  const dueSoon = upcoming.filter((s) => (s.next.getTime() - today.getTime()) / 864e5 <= 2);
  const startList = () => push({ name: "list", spec: SIP_FROM_100 });

  return (
    <main className="page">
      <h1 className="page-title">SIPs</h1>

      {sips.length === 0 ? (
        // No SIP running (never invested, or one-time only): ₹0 a month and a way in. No fund list or filters here.
        <>
          <div className="mf-sip-zero">
            <small>Monthly SIP amount</small>
            <strong>{inr(0)}</strong>
            <button onClick={startList}>
              Start a new SIP
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
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
          <ul className="os-list">
            {upcoming.map((s) => {
              const fund = fundById(s.fundId);
              return (
                <li key={s.fundId}>
                  <button className="os-row" onClick={() => push({ name: "sipdetail", fundId: s.fundId })}>
                    <FundMark fund={fund} />
                    <span className="os-mid">
                      <b>{fund.name}</b>
                      <small>{inr(s.amount)} every month</small>
                    </span>
                    <span className="os-end">
                      <span className="os-amt">
                        {s.next.getDate()} {s.next.toLocaleString("en-IN", { month: "short" })}
                      </span>
                      <span className="os-gain" style={{ color: "var(--text-secondary)" }}>Next debit</span>
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

// Summary card shared by Stocks and Mutual funds under Portfolio: the current value is the hero with an optional note
// (XIRR) right beside it, and three metrics sit in a row below.
export function PfDelta({ amount, pctValue }: { amount: number; pctValue: number }) {
  const up = amount >= 0;
  return (
    <>
      <b className={up ? "up" : "down"}>
        <RollText text={`${up ? "+" : "-"}${inrShort(Math.abs(amount))}`} />
      </b>
      <em className={up ? "up" : "down"}>({pctValue.toFixed(2)}%)</em>
    </>
  );
}

export function PfSummary({
  label = "Current value",
  hero,
  note,
  stats,
  tone,
}: {
  label?: string;
  hero: string;
  note?: ReactNode;
  stats: [string, ReactNode][];
  tone?: "positive" | "negative"; // a faint wash behind the block: green when the portfolio is up today, red when down
}) {
  const off = useHidden();
  return (
    <div
      className={`pf-summary${tone ? ` ${tone}` : ""}`}
      style={{ "--pf-dots": `url(${asset("mf-banner-dots.png")})` } as CSSProperties}
    >
      <button
        className="pf-eye"
        aria-pressed={off}
        aria-label={off ? "Show values" : "Hide values"}
        onClick={toggleHidden}
      >
        <span key={String(off)} className="pf-eye-glyph">
          <Icon name={off ? "eye-off" : "eye"} size={20} />
        </span>
      </button>
      <small className="pf-hero-label">{label}</small>
      <div className="pf-hero">
        <strong>
          <Masked mask="₹••••••">
            <RollText text={hero} />
          </Masked>
        </strong>
        {note && <span className="pf-hero-note">{note}</span>}
      </div>
      <dl className="pf-stats">
        {stats.map(([name, value]) => (
          <div key={name} className="pf-stat">
            <dt>{name}</dt>
            <dd>
              <Masked>{value}</Masked>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
