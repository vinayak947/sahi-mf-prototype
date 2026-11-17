import { useEffect, useRef, useState } from "react";
import { holdings as stockHoldings } from "../data";
import { Icon } from "../ui/Icon";
import { toneOf } from "../ui/widgets";
import { fundById } from "./data";
import { inr, pct } from "./format";
import { FundMark } from "./parts";
import { useMf } from "./store";

// Portfolio search: its own page, like the Orders one. Back sits inside the field; one query runs across stock and
// mutual fund holdings, results are grouped by market.
export function HoldingsSearchScreen() {
  const { pop, push, holdings } = useMf();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const term = q.trim().toLowerCase();
  const stocks = term ? stockHoldings.filter((h) => h.name.toLowerCase().includes(term)) : [];
  const funds = term ? holdings.filter((h) => fundById(h.fundId).name.toLowerCase().includes(term)) : [];
  const none = term && stocks.length + funds.length === 0;

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
            placeholder="Search holdings"
            aria-label="Search holdings"
            autoComplete="off"
          />
        </label>
      </header>
      <div className="mf-body">
        {stocks.length > 0 && (
          <>
            <p className="mf-ordersearch-label">Stocks</p>
            <ul className="holding-list">
              {stocks.map((h) => (
                <li key={h.name}>
                  <div className="holding-row">
                    <span className="holding-top">
                      <b>{h.name}</b>
                      <span className={`holding-pl ${toneOf(h.pl)}`}>
                        {h.pl} <em>{h.plPct}</em>
                      </span>
                    </span>
                    <span className="holding-bot">
                      <small>
                        Invested: <b>{h.invested}</b>
                      </small>
                      <small>
                        Current: <b>{h.current}</b>
                      </small>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {funds.length > 0 && (
          <>
            <p className="mf-ordersearch-label">Mutual funds</p>
            <ul className="holding-list">
              {funds.map((h) => {
                const fund = fundById(h.fundId);
                const g = h.current - h.invested;
                return (
                  <li key={h.fundId}>
                    <button className="holding-row" onClick={() => push({ name: "holding", fundId: h.fundId })}>
                      <span className="holding-top">
                        <b>
                          <FundMark fund={fund} size={32} />
                          <span className="mf-pf-name">{fund.name}</span>
                        </b>
                        <span className="mf-pf-value">
                          <b>{inr(h.current)}</b>
                          <small className={g >= 0 ? "up" : "down"}>
                            {g >= 0 ? "+" : ""}
                            {inr(g)} ({pct((g / h.invested) * 100, 2)})
                          </small>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {none && <p className="mf-empty">No holdings found for “{q.trim()}”.</p>}
      </div>
    </div>
  );
}
