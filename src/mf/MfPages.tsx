import { useState } from "react";
import { Block } from "../ui/widgets";
import { Icon } from "../ui/Icon";
import { fundById } from "./data";
import { inr, pct, xirr } from "./format";
import { FundMark } from "./parts";
import { FundListBody, statusLabel } from "./screens";
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

export function MfOrders() {
  const { orders, push } = useMf();
  const inProgress = orders.filter((o) => o.status === "placed" || o.status === "processing");
  const done = orders.filter((o) => o.status === "allotted");
  const failed = orders.filter((o) => o.status === "failed");
  const groups = [
    { label: `In progress (${inProgress.length})`, list: inProgress },
    { label: `Completed (${done.length})`, list: done },
    { label: `Failed (${failed.length})`, list: failed },
  ];
  // initial tab: first with something in it
  const first = Math.max(0, groups.findIndex((g) => g.list.length > 0));
  return <MfOrderTabs groups={groups} first={first} onOpen={(id) => push({ name: "orderdetail", orderId: id })} />;
}

function MfOrderTabs({
  groups,
  first,
  onOpen,
}: {
  groups: { label: string; list: ReturnType<typeof useMf>["orders"] }[];
  first: number;
  onOpen: (id: string) => void;
}) {
  const [active, setActive] = useState(first);
  const list = groups[active].list;
  return (
    <>
      <div className="tabs-row">
        <div className="tabs-list">
          {groups.map((g, i) => (
            <button
              className={`tab-underlined${i === active ? " active" : ""}`}
              key={g.label}
              onClick={() => setActive(i)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="mf-empty">No orders here yet.</p>
      ) : (
        <ul className="order-list">
          {list.map((order) => {
            const fund = fundById(order.fundId);
            return (
              <li key={order.id}>
                <button className="order-row" onClick={() => onOpen(order.id)}>
                  <span className="order-top">
                    <small>
                      Mutual fund • {order.kind}
                    </small>
                    <em className={`amo st-${order.status}`}>{statusLabel(order)}</em>
                  </span>
                  <span className="order-mid">
                    <b>{fund.name}</b>
                    <span className="order-qty">{inr(order.amount)}</span>
                  </span>
                  <span className="order-bot">
                    <span>{order.placedAt}</span>
                    <span>
                      NAV date: <b>{order.navDate}</b>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function MfPortfolio({ hideSips = false }: { hideSips?: boolean }) {
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
  const { holdings, sips, push } = useMf();
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

  const shown = rows.sort((a, b) =>
    sort === "returns" ? b.gPct - a.gPct : sort === "current" ? b.h.current - a.h.current : b.h.invested - a.h.invested,
  );
  const sortLabel = SORTS.find((x) => x.key === sort)!.label;
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((x) => x.key === sort) + 1) % SORTS.length].key);

  return (
    <>
      <div className="mf-pf-card">
        <small>Holdings</small>
        <div className="mf-pf-total">
          <strong>{inr(current)}</strong>
          {rate !== null && <em className={rate >= 0 ? "up" : "down"}>XIRR {(rate * 100).toFixed(1)}%</em>}
        </div>
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
          <div className="summary-card summary-card-lg">
            <div className="summary-grid">
              <span>
                <small>Monthly SIP amount</small>
                <strong>{inr(monthly)}</strong>
              </span>
              <span className="summary-right">
                <small>Active SIPs</small>
                <strong>{sips.length}</strong>
              </span>
            </div>
            {dueSoon.length > 0 && (
              <span className="summary-day">
                <b>{inr(dueSoon.reduce((sum, s) => sum + s.amount, 0))}</b> due in the next 2 days
              </span>
            )}
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
