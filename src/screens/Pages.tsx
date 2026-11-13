import { useEffect, useState } from "react";
import { asset } from "../assets";
import { holdings, indexScalper, orders } from "../data";
import { Icon, type IconName } from "../ui/Icon";
import { MfOrdersPage, MfPortfolio, MfPortfolioPage, PortfolioOverview, SegmentChips } from "../mf/MfPages";
import { useMf } from "../mf/store";
import {
  Block,
  CardGrid,
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

export function PortfolioPage({ mfOnly = false }: { mfOnly?: boolean }) {
  const [seg, setSeg] = useState<"overview" | "stocks" | "mf">(mfOnly ? "mf" : "stocks");

  if (mfOnly) {
    return (
      <main className="page">
        <MfPortfolioPage />
      </main>
    );
  }

  if (seg !== "stocks") {
    return (
      <main className="page">
        <h1 className="page-title">Portfolio</h1>
        <SegmentChips value={seg} onChange={setSeg} withOverview />
        {seg === "overview" ? <PortfolioOverview onOpen={setSeg} /> : <MfPortfolio />}
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="page-title">Portfolio</h1>
      <SegmentChips value="stocks" onChange={setSeg} withOverview />

      <Tabs
        items={[{ label: "Holdings (4)" }, { label: "Positions (0)" }]}
        trailing={
          <button className="tabs-menu" aria-label="More">
            <Icon name="dots-three-vertical" size={20} />
          </button>
        }
      />

      <div className="summary-card summary-card-lg">
        <div className="summary-grid">
          <span>
            <small>Current value</small>
            <strong>₹22,826</strong>
          </span>
          <span className="summary-right">
            <small>Total P&amp;L</small>
            <strong className="up">
              +₹6,930 <em>(43.59%)</em>
            </strong>
          </span>
        </div>
        <div className="summary-grid">
          <span>
            <small>Invested amount</small>
            <strong>₹15,897</strong>
          </span>
          <span className="summary-right">
            <small>Day&rsquo;s P&amp;L</small>
            <strong className="down">
              -₹511 <em>(-3.22%)</em>
            </strong>
          </span>
        </div>
      </div>

      <div className="portfolio-controls">
        <label className="switch-row">
          View more
          <span className="switch" aria-hidden="true">
            <i />
          </span>
        </label>
        <button className="sort-button">
          Total P&amp;L <Icon name="caret-up-down" size={16} />
        </button>
      </div>

      <ul className="holding-list">
        {holdings.map((holding) => (
          <li key={holding.name}>
            <button className="holding-row">
              <span className="holding-top">
                <b>
                  {holding.name}
                  {holding.tag && <em className="tag-chip">{holding.tag}</em>}
                  {holding.ai && <SparkleBadge />}
                </b>
                <span className={`holding-pl ${toneOf(holding.pl)}`}>
                  {holding.pl} <em>{holding.plPct}</em>
                </span>
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

      <FloatingSearch label="Search holdings" />
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
