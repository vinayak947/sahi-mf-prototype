import { useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import { fundById } from "./data";
import { fmtDay, inr, nextSipDate } from "./format";
import { MfHomeNext } from "./MfHomeNext";
import { useMf } from "./store";

// Things that need the person's attention, shown above the feed once they hold funds:
// a SIP instalment that didn't go through, and SIPs debiting in the next week.
// Nothing to say, nothing shown. Holdings live on Portfolio.
export function Alerts() {
  const { push, sips, orders } = useMf();
  const missed = orders.filter((o) => o.kind === "SIP" && o.status === "failed");
  const today = new Date();
  const dueSoon = sips
    .map((s) => ({ ...s, next: nextSipDate(s.day, today) }))
    .filter((s) => (s.next.getTime() - today.getTime()) / 864e5 <= 7)
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  if (missed.length === 0 && dueSoon.length === 0) return null;

  const cards = [
    ...missed.map((o) => {
      const fund = fundById(o.fundId);
      return (
        <div key={o.id} role="listitem" className="mf-alert bad">
          <Icon name="warning-circle" size={20} />
          <span className="mf-alert-main">
            <b>Missed SIP · {fund.name}</b>
            <small>
              Your {inr(o.amount)} instalment on {o.navDate} didn&rsquo;t go through. Not enough balance in the bank.
            </small>
            <span className="mf-alert-actions">
              {/* Paid as a one-time buy, so the fund's one-time minimum applies (SBI Large Cap: ₹1,000). */}
              {!fund.buy && (
                <button
                  className="mf-btn solid sm"
                  onClick={() =>
                    push({ name: "amount", fundId: o.fundId, mode: "lump", preset: Math.max(o.amount, fund.minAdd) })
                  }
                >
                  Invest {inr(Math.max(o.amount, fund.minAdd))} now
                </button>
              )}
              <button className="text-link" onClick={() => push({ name: "orderdetail", orderId: o.id })}>
                Details
              </button>
            </span>
          </span>
        </div>
      );
    }),
    ...dueSoon.map((s) => {
      const fund = fundById(s.fundId);
      return (
        <div key={s.fundId} role="listitem">
          <button className="mf-alert" onClick={() => push({ name: "sipdetail", fundId: s.fundId })}>
            <Icon name="calendar" size={20} />
            <span className="mf-alert-main">
              <b>
                SIP on {fmtDay(s.next)} · {inr(s.amount)}
              </b>
              <small>{fund.name}. Keep the money in your bank so it goes through.</small>
            </span>
            <Icon name="caret-right" size={16} />
          </button>
        </div>
      );
    }),
  ];

  return (
    <Block title="Needs your attention">
      {cards.length > 1 ? <AlertCarousel cards={cards} /> : <div className="mf-alerts" role="list">{cards}</div>}
    </Block>
  );
}

// Two or more alerts: one card at a time, swiped sideways, with the next one peeking in.
function AlertCarousel({ cards }: { cards: ReactNode[] }) {
  const [at, setAt] = useState(0);
  return (
    <>
      <HScroll
        className="mf-alerts carousel"
        role="list"
        onScroll={(el) => {
          const card = el.firstElementChild as HTMLElement | null;
          if (card) setAt(Math.round(el.scrollLeft / (card.offsetWidth + 8)));
        }}
      >
        {cards}
      </HScroll>
      <div className="mf-alert-dots" aria-hidden="true">
        {cards.map((_, i) => (
          <i key={i} className={i === at ? "on" : undefined} />
        ))}
      </div>
    </>
  );
}

export function MfHome() {
  return <MfHomeNext />;
}
