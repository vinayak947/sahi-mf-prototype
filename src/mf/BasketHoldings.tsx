// Order 2.0 portfolio: what the investor holds through baskets. The "Baskets" tab lists them; a basket
// opens the same kind of view as a single fund (value, returns, what's inside) plus its rebalance dates.
import { Icon } from "../ui/Icon";
import {
  basketById,
  basketFundId,
  positionFunds,
  positionValue,
  REBALANCES,
  type BasketPosition,
} from "./baskets-data";
import { BasketLine } from "./Baskets";
import { blendSeries, inr, pct, type Range } from "./format";
import { FundMark, Screen } from "./parts";
import { RangeChart } from "./screens";
import { useMf } from "./store";

// The value line over a range, from the funds inside (each weighted by what it is worth now).
const valueSeries = (positions: BasketPosition[]) => (range: Range) =>
  blendSeries(
    positions.flatMap((p) =>
      positionFunds(p).map(({ fund, current }) => ({ weight: current, id: fund.id, r1: fund.r1, r3: fund.r3, r5: fund.r5 })),
    ),
    range,
  );

const gainClass = (gain: number) => (gain >= 0 ? "up" : "down");
const signed = (gain: number) => `${gain >= 0 ? "+" : ""}${inr(gain)}`;

// The Baskets tab: the total across baskets, then each basket held.
export function BasketHoldingsTab() {
  const { basketPositions, push } = useMf();

  if (basketPositions.length === 0) {
    return (
      <div className="mf-empty-card tall">
        <b>No baskets yet</b>
        <p>Pick a researcher backed basket and invest in all its funds at once. It will show up here.</p>
        <button className="mf-btn solid" onClick={() => push({ name: "baskets" })}>
          Browse baskets
        </button>
      </div>
    );
  }

  const rows = basketPositions.map((position) => ({ position, ...positionValue(position) }));
  const current = rows.reduce((sum, r) => sum + r.current, 0);
  const invested = rows.reduce((sum, r) => sum + r.invested, 0);
  const gain = current - invested;

  return (
    <>
      <div className="mf-pf-card flat">
        <small>Holdings</small>
        <div className="mf-pf-total">
          <strong>{inr(current)}</strong>
        </div>
        <RangeChart initial="1M" seriesFor={valueSeries(basketPositions)} showChange={false} />
        <dl className="mf-pf-stats">
          <div>
            <dt>Total Returns</dt>
            <dd>{inr(gain)}</dd>
          </div>
          <div>
            <dt>Invested</dt>
            <dd>{inr(invested)}</dd>
          </div>
        </dl>
      </div>

      <div className="mf-pf-bar">
        <span>
          {rows.length} {rows.length === 1 ? "basket" : "baskets"}
        </span>
      </div>

      <ul className="holding-list">
        {rows.map(({ position, current: value, gain: g, invested: put }) => {
          const basket = basketById(position.basketId);
          return (
            <li key={position.basketId}>
              <button
                className="holding-row"
                onClick={() => push({ name: "basketholding", basketId: position.basketId })}
              >
                <span className="holding-top">
                  <b>
                    <BasketLogos position={position} />
                    <span className="mf-pf-name">
                      {basket.name}
                      <small>
                        {basket.funds.length} funds
                        {position.sip && ` · SIP ${inr(position.sip.amount)}/mo`}
                      </small>
                    </span>
                  </b>
                  <span className="mf-pf-value">
                    <b>{inr(value)}</b>
                    <small className={gainClass(g)}>
                      {signed(g)} ({pct((g / put) * 100, 2)})
                    </small>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function BasketLogos({ position }: { position: BasketPosition }) {
  const rows = positionFunds(position).slice(0, 2);
  return (
    <span className="bk-stack" aria-hidden="true">
      {rows.map(({ fund }) => (
        <FundMark key={fund.id} fund={fund} size={32} />
      ))}
    </span>
  );
}

// One basket held: the same layout as a single fund's "Your investment", then the funds inside and the rebalance dates.
export function BasketHoldingScreen({ basketId }: { basketId: string }) {
  const { pop, push, basketPositions } = useMf();
  const basket = basketById(basketId);
  const position = basketPositions.find((p) => p.basketId === basketId);

  if (!position) {
    return (
      <Screen onBack={pop} title={basket.name}>
        <p className="mf-empty">You don&rsquo;t hold this basket any more.</p>
      </Screen>
    );
  }

  const { current, invested, gain, rows } = positionValue(position);
  const fundId = basketFundId(basketId);

  return (
    <Screen
      onBack={pop}
      title="Your investment"
      footer={
        position.sip ? (
          <button className="mf-btn solid wide" onClick={() => push({ name: "amount", fundId, mode: "lump" })}>
            Invest more
          </button>
        ) : (
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={() => push({ name: "amount", fundId, mode: "lump" })}>
              Invest more
            </button>
            <button className="mf-btn solid" onClick={() => push({ name: "amount", fundId, mode: "sip" })}>
              Start a SIP
            </button>
          </div>
        )
      }
    >
      <button className="mf-fundline link" onClick={() => push({ name: "basket", basketId })}>
        <BasketLine basket={basket} note={`${basket.funds.length} funds · Direct plans`} />
        <Icon name="caret-right" size={16} />
      </button>

      <RangeChart initial="1M" seriesFor={valueSeries([position])} showChange={false} />

      <div className="summary-card summary-card-lg">
        <div className="summary-grid">
          <span>
            <small>Current value</small>
            <strong>{inr(current)}</strong>
          </span>
          <span className="summary-right">
            <small>Total returns</small>
            <strong className={gainClass(gain)}>
              {signed(gain)} <em>({pct((gain / invested) * 100, 2)})</em>
            </strong>
          </span>
        </div>
        <div className="summary-grid">
          <span>
            <small>Invested</small>
            <strong>{inr(invested)}</strong>
          </span>
          {position.sip && (
            <span className="summary-right">
              <small>SIP</small>
              <strong>{inr(position.sip.amount)} a month</strong>
            </span>
          )}
        </div>
      </div>

      <p className="mf-label">What&rsquo;s inside</p>
      <ul className="holding-list">
        {rows.map(({ fund, weight, invested: put, current: value }) => {
          const g = value - put;
          return (
            <li key={fund.id}>
              <div className="holding-row">
                <span className="holding-top">
                  <b>
                    <FundMark fund={fund} size={32} />
                    <span className="mf-pf-name">
                      {fund.name}
                      <small>{weight}% of the basket</small>
                    </span>
                  </b>
                  <span className="mf-pf-value">
                    <b>{inr(value)}</b>
                    <small className={gainClass(g)}>
                      {signed(g)} ({pct((g / put) * 100, 2)})
                    </small>
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mf-label">Rebalancing</p>
      <ol className="mf-timeline">
        {REBALANCES.map((step) => (
          <li key={step.when} className={step.state === "done" ? "done" : undefined}>
            <b>{step.when}</b>
            <small>{step.line}</small>
          </li>
        ))}
      </ol>
    </Screen>
  );
}
