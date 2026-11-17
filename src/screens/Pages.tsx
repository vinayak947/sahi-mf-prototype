import { useEffect, useMemo, useState } from "react";
import { asset } from "../assets";
import { holdings, indexScalper, orders } from "../data";
import { Icon, type IconName } from "../ui/Icon";
import { MfOrdersPage, MfPortfolio, PfDelta, PfSummary, SegmentChips } from "../mf/MfPages";
import { useMf } from "../mf/store";
import { FilterSortSheet } from "../mf/FilterSortSheet";
import { inrShort } from "../mf/format";
import { RollText } from "../ui/RollText";
import {
  Block,
  CardGrid,
  DlsTab,
  SparkleBadge,
  Tabs,
  toneOf,
} from "../ui/widgets";

export type Page = "home" | "watchlist" | "trade" | "orders" | "portfolio" | "sip";

function FloatingSearch({
  label,
  icon = "magnifying-glass",
}: {
  label: string;
  icon?: IconName;
}) {
  return (
    <div className="float-bar" role="search">
      <button aria-label="Filter">
        <Icon name="funnel-simple" size={24} />
      </button>
      <i />
      <button className="float-search">
        <Icon name={icon} size={20} />
        {label}
      </button>
    </div>
  );
}

export function WatchlistPage() {
  return (
    <main className="page">
      <h1 className="page-title">Watchlist</h1>

      <div className="chip-row page-chips">
        <button className="chip active">My Lists</button>
        <button className="chip">
          <i className="live-dot" />
          Stock Scanners
        </button>
        <button className="chip">Recently viewed</button>
        <button className="chip">Holdings</button>
      </div>

      <Tabs
        items={[{ label: "Trending", menu: true }]}
        trailing={
          <div className="tabs-actions">
            <button aria-label="Add a list">
              <Icon name="plus" size={24} />
            </button>
            <button className="bubble" aria-label="List settings">
              <Icon name="funnel-simple" size={24} />
            </button>
          </div>
        }
      />

      <div className="view-toggle" role="group" aria-label="View">
        <button className="active" aria-label="List">
          <Icon name="list-bullets" size={20} />
        </button>
        <button aria-label="Chart">
          <Icon name="chart-line" size={20} />
        </button>
        <button aria-label="Columns">
          <Icon name="columns" size={20} />
        </button>
      </div>

      <ul className="row-list">
        <li>
          <button className="list-row">
            <span className="row-main">
              <b>Nifty Energy</b>
              <small>NSE</small>
            </span>
            <span className="row-side">
              <b>35786.50</b>
              <small className="down">-601.65 (1.65%)</small>
            </span>
          </button>
        </li>
      </ul>

      <FloatingSearch label="Search & Add" icon="magnifying-glass" />
    </main>
  );
}

export function OrdersPage({ mfOnly = false }: { mfOnly?: boolean }) {
  const { jump, clearJump } = useMf();
  const [seg, setSeg] = useState<"stocks" | "mf">(mfOnly || jump === "orders-mf" ? "mf" : "stocks");
  useEffect(() => {
    if (jump === "orders-mf") clearJump();
  }, [jump, clearJump]);

  if (seg === "mf") {
    return (
      <main className="page">
        <MfOrdersPage segments={!mfOnly && <SegmentChips value="mf" onChange={(v) => setSeg(v === "mf" ? "mf" : "stocks")} />} />
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="page-title">Orders</h1>
      <SegmentChips value="stocks" onChange={(v) => setSeg(v === "mf" ? "mf" : "stocks")} />

      <Tabs
        items={[
          { label: "Open (3)", menu: true },
          { label: "Completed (0)" },
          { label: "Cancelled (4)" },
        ]}
      />

      <ul className="order-list">
        {orders.map((order, index) => (
          <li key={index}>
            <button className="order-row">
              <span className="order-top">
                <small>
                  {order.venue} • {order.kind}
                </small>
                {order.amo && <em className="amo">AMO</em>}
              </span>
              <span className="order-mid">
                <b>{order.name}</b>
                <span className="order-qty">
                  <i className={order.side === "S" ? "sell" : "buy"}>{order.side}</i>
                  {order.qty}
                </span>
              </span>
              <span className="order-bot">
                <span>
                  LTP: <b>{order.ltp}</b>
                </span>
                <span>
                  {order.detail.map(([label, value], i) => (
                    <span key={label}>
                      {i > 0 && " • "}
                      {label}: <b>{value}</b>
                    </span>
                  ))}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <FloatingSearch label="Search orders" />
    </main>
  );
}

type HoldingRow = (typeof holdings)[number];
type HoldingSort = "cur_hi" | "cur_lo" | "inv_hi" | "inv_lo" | "pl_hi" | "pl_lo" | "pct_hi" | "pct_lo" | "az" | "za";
const num = (text: string) => Number(text.replace(/[^0-9.\-]/g, ""));
// The app's own holdings sort options; there is nothing else to filter, so the sheet is sort only.
const HOLDING_SORTS: { key: HoldingSort; label: string }[] = [
  { key: "cur_hi", label: "Current value (High to low)" },
  { key: "cur_lo", label: "Current value (Low to high)" },
  { key: "inv_hi", label: "Invested value (High to low)" },
  { key: "inv_lo", label: "Invested value (Low to high)" },
  { key: "pl_hi", label: "Total P&L (High to low)" },
  { key: "pl_lo", label: "Total P&L (Low to high)" },
  { key: "pct_hi", label: "Total P&L % (High to low)" },
  { key: "pct_lo", label: "Total P&L % (Low to high)" },
  { key: "az", label: "A to Z" },
  { key: "za", label: "Z to A" },
];
// The Holdings / Positions tabs sit above the Mutual funds | Stocks chips, so their counts cover the whole portfolio and
// never change with the chip: every holding (stocks and funds) and every open position (mutual funds have none).
const STOCK_POSITIONS = 6;

// The button at the right of the controls row switches what each holding shows: its total P&L or today's. Day figures
// add up to the card's -₹511.
type PlMode = "total" | "day";
const DAY_PL: Record<string, { pl: string; pct: string }> = {
  "Vodafone Idea": { pl: "+₹0.10", pct: "(0.19%)" },
  "Yes Bank": { pl: "-₹3.10", pct: "(-4.80%)" },
  "Titan Company": { pl: "-₹479", pct: "(-2.13%)" },
  "Lemon Tree Hotels": { pl: "-₹29", pct: "(-4.19%)" },
};

export function PortfolioPage({ mfOnly = false }: { mfOnly?: boolean }) {
  const [seg, setSeg] = useState<"stocks" | "mf">("mf");
  const { holdings: mfHoldings, push } = useMf();
  const [sort, setSort] = useState<HoldingSort>("cur_hi");
  const [filtering, setFiltering] = useState(false);
  const [viewMore, setViewMore] = useState(false);
  const [plMode, setPlMode] = useState<PlMode>("total");
  const shownHoldings = useMemo(() => {
    const list = holdings;
    const by: Record<HoldingSort, (a: HoldingRow, b: HoldingRow) => number> = {
      cur_hi: (a, b) => num(b.current) - num(a.current),
      cur_lo: (a, b) => num(a.current) - num(b.current),
      inv_hi: (a, b) => num(b.invested) - num(a.invested),
      inv_lo: (a, b) => num(a.invested) - num(b.invested),
      pl_hi: (a, b) => num(b.pl) - num(a.pl),
      pl_lo: (a, b) => num(a.pl) - num(b.pl),
      pct_hi: (a, b) => num(b.plPct) - num(a.plPct),
      pct_lo: (a, b) => num(a.plPct) - num(b.plPct),
      az: (a, b) => a.name.localeCompare(b.name),
      za: (a, b) => b.name.localeCompare(a.name),
    };
    return [...list].sort(by[sort]);
  }, [sort]);

  return (
    <main className="page">
      <div className="pf-head">
        <h1 className="page-title">Portfolio</h1>
        <button className="pf-search" aria-label="Search holdings" onClick={() => push({ name: "holdingsearch" })}>
          <Icon name="magnifying-glass" size={24} />
        </button>
      </div>

      <div className="pf-topbar">
        <div className="pf-chips" role="tablist" aria-label="Holdings and positions">
          <button role="tab" aria-selected="true" className="chip active">
            {`Holdings · ${holdings.length + mfHoldings.length}`}
            <Icon name="check" size={16} />
          </button>
          <button role="tab" aria-selected="false" className="chip">
            {`Positions · ${STOCK_POSITIONS}`}
          </button>
        </div>
        <button className="pf-more" aria-label="More">
          <Icon name="dots-three-vertical" size={16} />
        </button>
      </div>

      <div className="tabs-row pf-subtabs">
        <div className="tabs-list" role="tablist" aria-label="Asset type">
          {(["mf", "stocks"] as const).map((k) => (
            <DlsTab key={k} active={seg === k} onClick={() => setSeg(k)}>
              {k === "stocks" ? "Stocks" : "Mutual funds"}
            </DlsTab>
          ))}
        </div>
      </div>

      {seg === "mf" ? (
        <MfPortfolio hideSips showBaskets={false} />
      ) : (
        <>
      <PfSummary
        tone="negative"
        hero="₹22,826"
        stats={[
          ["Total P&L", <PfDelta key="t" amount={-6930} pctValue={-43.59} />],
          ["Invested", <b key="i"><RollText text={inrShort(15897)} /></b>],
          ["Day’s P&L", <PfDelta key="d" amount={-511} pctValue={-3.22} />],
        ]}
      />

      <div className="pf-sheet">
      <div className="portfolio-controls">
        <div className="portfolio-controls-left">
          <button
            className={`dls-chip mf-orders-typechip${sort !== "cur_hi" ? " on" : ""}`}
            onClick={() => setFiltering(true)}
            aria-label="Filter and sort holdings"
          >
            <Icon name="funnel-simple" size={16} />
          </button>
          <button className="switch-row" role="switch" aria-checked={viewMore} onClick={() => setViewMore((v) => !v)}>
            View more
            <span className={`switch${viewMore ? " on" : ""}`} aria-hidden="true">
              <i />
            </span>
          </button>
        </div>
        <button
          className="sort-button"
          aria-label={`Showing ${plMode === "total" ? "total" : "today’s"} P&L. Switch`}
          onClick={() => setPlMode((m) => (m === "total" ? "day" : "total"))}
        >
          {plMode === "total" ? "Total P&L" : "Day’s P&L"} <Icon name="caret-up-down" size={16} />
        </button>
      </div>
      <ul className="holding-list">
        {shownHoldings.map((holding) => (
          <li key={holding.name}>
            <button className="holding-row">
              <span className="holding-top">
                <b>
                  {holding.name}
                  {holding.tag && <em className="tag-chip">{holding.tag}</em>}
                  {holding.ai && <SparkleBadge />}
                </b>
                {(() => {
                  const pl = plMode === "total" ? holding.pl : DAY_PL[holding.name].pl;
                  const pctText = plMode === "total" ? holding.plPct : DAY_PL[holding.name].pct;
                  return (
                    <span className={`holding-pl ${toneOf(pl)}`}>
                      {pl} <em>{pctText}</em>
                    </span>
                  );
                })()}
              </span>
              <span className="holding-bot">
                <small>
                  Invested: <b>{holding.invested}</b>
                </small>
                <small>
                  Current: <b>{holding.current}</b>
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      </div>

      {filtering && (
        <FilterSortSheet
          groups={[]}
          sorts={HOLDING_SORTS}
          picks={{}}
          sort={sort}
          defaultSort="cur_hi"
          onApply={(_picks, nextSort) => setSort(nextSort)}
          onClose={() => setFiltering(false)}
        />
      )}


        </>
      )}
    </main>
  );
}

// There was no Trade screen in the references, so this is built from the
// prototype's own trading shortcuts and actions.
export function TradePage() {
  const shortcuts = [
    ["Scalper", "fe3ec.svg"],
    ["Chain", "49b23.svg"],
    ["Seller", "1970b.svg"],
    ["Futures", "229e6.svg"],
  ];
  const actions = [
    ["Option\nScalper", "db701.png"],
    ["Intraday\nScanner", "0664e.png"],
  ];

  return (
    <main className="page">
      <h1 className="page-title">Trade</h1>

      <Block title="Shortcuts" divided={false}>
        <section className="shortcut-grid">
          {shortcuts.map(([label, icon]) => (
            <button className="shortcut" key={label}>
              <span>
                <img src={asset(icon)} alt="" />
              </span>
              {label}
            </button>
          ))}
        </section>
      </Block>

      <Block title="Quick Actions">
        <div className="action-grid">
          {actions.map(([label, image]) => (
            <button className="action-card" key={label}>
              <span>{label}</span>
              <Icon name="caret-right" size={20} />
              <img src={asset(image)} alt="" />
            </button>
          ))}
        </div>
      </Block>

      <Block title="Index Scalper">
        <CardGrid items={indexScalper} />
      </Block>
    </main>
  );
}
