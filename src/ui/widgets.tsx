import { useRef, type ReactNode } from "react";
import { asset } from "../assets";
import {
  heatLegend,
  scannerRows,
  sectors,
  type CommodityRowData,
  type Quote,
} from "../data";
import { Icon } from "./Icon";

export const toneOf = (change: string) =>
  change.trim().startsWith("-") ? "down" : "up";

// A titled section; every block after the first is set off by a hairline.
export function Block({
  title,
  action,
  divided = true,
  children,
}: {
  title?: string;
  action?: ReactNode;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`block${divided ? " block-divided" : ""}`}>
      {title && (
        <div className="block-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* Touch and trackpad scroll sideways natively; a mouse wheel only goes up and down, so a mouse can also drag the row. */
export function HScroll({
  className,
  role,
  onScroll,
  children,
}: {
  className?: string;
  role?: string;
  onScroll?: (el: HTMLDivElement) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, left: 0, down: false, moved: false });

  const end = () => {
    drag.current.down = false;
    ref.current?.classList.remove("dragging");
  };

  return (
    <div
      ref={ref}
      className={className ? `hscroll ${className}` : "hscroll"}
      role={role}
      onScroll={() => ref.current && onScroll?.(ref.current)}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
        drag.current = { x: e.clientX, left: ref.current.scrollLeft, down: true, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d.down || !ref.current) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) < 5) return;
        if (!d.moved) {
          d.moved = true;
          ref.current.classList.add("dragging");
          ref.current.setPointerCapture(e.pointerId);
        }
        ref.current.scrollLeft = d.left - dx;
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={(e) => {
        if (drag.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          drag.current.moved = false;
        }
      }}
    >
      {children}
    </div>
  );
}

export function QuoteCard({ name, value, exchange, change }: Quote) {
  return (
    <button className="quote-card">
      <span className="quote-name">{name}</span>
      <span className="quote-value">
        <strong>{value}</strong>
        {exchange && <em>{exchange}</em>}
      </span>
      <small className={toneOf(change)}>{change}</small>
    </button>
  );
}

export function GiftNifty() {
  return (
    <button className="gift-card">
      <span className="gift-main">
        <span className="quote-name">GIFT NIFTY</span>
        <strong>22575.50</strong>
      </span>
      <span className="gift-side">
        <b>50 pts below</b>
        <small>NIFTY Futures close</small>
      </span>
      <Icon name="caret-right" size={16} />
    </button>
  );
}

export function ToolPills() {
  return (
    <div className="tool-pills">
      <button>
        <Icon name="link" size={20} />
        Option Chain
      </button>
      <button>
        <Icon name="lightning" size={20} />
        Options Scalper
      </button>
    </div>
  );
}

export function AiSignals() {
  return (
    <div className="signal-card">
      <div>
        <strong>Identified by SAHI AI</strong>
        <h2>AI Stock Signals</h2>
        <p>Spot high-potential opportunities before the market moves.</p>
        <button>Check Signals</button>
      </div>
      <div className="signal-chart">
        <img src={asset("b6e71.svg")} alt="" />
        <span className="bullish">Bullish</span>
        <span className="bearish">Bearish</span>
      </div>
    </div>
  );
}

export function HoldingsSummary() {
  return (
    <div className="summary-card">
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
      <span className="summary-day">
        Day&rsquo;s P&amp;L: <b className="down">-₹511 (-3.22%)</b>
      </span>
    </div>
  );
}

export function Tabs({
  items,
  active = 0,
  trailing,
}: {
  items: { label: string; info?: boolean; menu?: boolean }[];
  active?: number;
  trailing?: ReactNode;
}) {
  return (
    <div className="tabs-row">
      <div className="tabs-list">
        {items.map((item, index) => (
          <button
            className={`tab-underlined${index === active ? " active" : ""}`}
            key={item.label}
          >
            {item.label}
            {item.info && <Icon name="info" size={16} />}
            {item.menu && <Icon name="dots-three-vertical" size={16} />}
          </button>
        ))}
      </div>
      {trailing}
    </div>
  );
}

export function SparkleBadge() {
  return (
    <span className="ai-badge" aria-label="SAHI AI pick">
      <Icon name="sparkle-fill" size={10} />
    </span>
  );
}

export function Scanners() {
  return (
    <div className="scanners">
      <Tabs
        items={[
          { label: "Stocks in news", info: true },
          { label: "Volume Shockers" },
          { label: "Daily Breakouts" },
        ]}
      />
      <div className="scanner-filter">
        <span>Index</span>
        <button className="select-chip">
          Nifty 500 <Icon name="caret-down" size={12} />
        </button>
      </div>
      <ul className="row-list">
        {scannerRows.map((row) => (
          <li key={row.name}>
            <button className="list-row">
              <span className="row-main">
                <b>
                  {row.name} <SparkleBadge />
                </b>
                <small>{row.exchange}</small>
              </span>
              <span className="row-side">
                <b>{row.value}</b>
                <small className={toneOf(row.change)}>{row.change}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className="view-all">
        View All <Icon name="caret-right" size={16} />
      </button>
    </div>
  );
}

export function CardGrid({
  items,
}: {
  items: { name: string; sub?: string; accent?: boolean }[];
}) {
  return (
    <div className="card-grid">
      {items.map((item, index) => (
        <button className="grid-card" key={`${item.name}-${item.sub}-${index}`}>
          <b>{item.name}</b>
          {item.sub && <small className={item.accent ? "accent" : ""}>{item.sub}</small>}
        </button>
      ))}
    </div>
  );
}

export function SectorHeatmap() {
  return (
    <>
      <div className="heatmap-map">
        {sectors.map((sector, index) => (
          <button
            className={`heat-tile heat-${sector.step}`}
            key={`${sector.name}-${index}`}
            style={{
              left: `${sector.x}%`,
              top: `${sector.y}%`,
              width: `${sector.w}%`,
              height: `${sector.h}%`,
            }}
          >
            {sector.name && <b>{sector.name}</b>}
            {sector.value && <small>{sector.value}</small>}
          </button>
        ))}
      </div>
      <div className="heat-legend">
        {heatLegend.map((item) => (
          <span className={`heat-${item.step}`} key={item.label}>
            {item.label}
          </span>
        ))}
      </div>
    </>
  );
}

export function CommodityRows({ rows }: { rows: CommodityRowData[] }) {
  return (
    <ul className="row-list">
      {rows.map((row) => (
        <li key={row.name}>
          <button className="list-row with-art">
            <img src={asset(row.icon)} alt="" />
            <span className="row-main">
              <b>{row.name}</b>
              <small>{row.exchange}</small>
            </span>
            <span className="row-side">
              <b>{row.value}</b>
              <small className={toneOf(row.change)}>{row.change}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CategoryGrid({
  items,
}: {
  items: { name: string; change: string; icon: string }[];
}) {
  return (
    <div className="category-grid">
      {items.map((item) => (
        <button key={item.name}>
          <img src={asset(item.icon)} alt="" />
          <b>{item.name}</b>
          <small className={toneOf(item.change)}>{item.change}</small>
        </button>
      ))}
    </div>
  );
}
