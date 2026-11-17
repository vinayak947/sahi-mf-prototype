import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { fundById } from "./data";
import { inr } from "./format";
import { FundMark } from "./parts";
import { kindLabel } from "./screens";
import { StatusBadge } from "./OrderStatusDetail";
import { FNO, STOCKS, type Row } from "./MarketOrders";
import { useMf } from "./store";

// Orders search: its own page, like the watchlist's. Back sits inside the field; one query runs across mutual funds,
// stocks and F&O, and results are grouped by market.
export function OrderSearchScreen() {
  const { pop, push, orders } = useMf();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const term = q.trim().toLowerCase();
  const mf = term ? orders.filter((o) => fundById(o.fundId).name.toLowerCase().includes(term)) : [];
  const market = (rows: Row[]) => (term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : []);
  const stocks = market(STOCKS);
  const fno = market(FNO);
  const none = term && mf.length + stocks.length + fno.length === 0;

  const marketRow = (o: Row, i: number) => (
    <li key={`${o.name}-${i}`}>
      <div className="order-row">
        <span className="order-top">
          <small>
            {o.venue} • {o.kind}
          </small>
          {o.amo && <em className="amo">AMO</em>}
        </span>
        <span className="order-mid">
          <b>{o.name}</b>
          <span className="order-qty">
            <i className={o.side === "S" ? "sell" : "buy"}>{o.side}</i>
            {o.qty}
          </span>
        </span>
      </div>
    </li>
  );

  return (
    <div className="mf-screen">
      <header className="mf-head mf-ordersearch-head">
        <label className="mf-ordersearch-field">
          <button type="button" className="mf-ordersearch-back" onClick={pop} aria-label="Back">
            <Icon name="back" size={24} />
          </button>
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for fund, stock or contract"
            aria-label="Search orders"
            autoComplete="off"
          />
        </label>
      </header>
      <div className="mf-body">
        {mf.length > 0 && (
          <>
            <p className="mf-ordersearch-label">Mutual funds</p>
            <ul className="os-list">
              {mf.map((order) => {
                const fund = fundById(order.fundId);
                return (
                  <li key={order.id}>
                    <button className="os-row" onClick={() => push({ name: "orderdetail", orderId: order.id })}>
                      <FundMark fund={fund} size={40} />
                      <span className="os-mid">
                        <b>{fund.name}</b>
                        <small>{kindLabel(order.kind)}</small>
                      </span>
                      <span className="os-end">
                        <span className="os-amt">{inr(order.amount)}</span>
                        <StatusBadge order={order} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {stocks.length > 0 && (
          <>
            <p className="mf-ordersearch-label">Stocks</p>
            <ul className="order-list">{stocks.map(marketRow)}</ul>
          </>
        )}
        {fno.length > 0 && (
          <>
            <p className="mf-ordersearch-label">F&amp;O</p>
            <ul className="order-list">{fno.map(marketRow)}</ul>
          </>
        )}
        {none && <p className="mf-empty">No orders found for “{q.trim()}”.</p>}
      </div>
    </div>
  );
}
