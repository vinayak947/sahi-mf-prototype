import { useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import { fundById } from "./data";
import { FundMark } from "./parts";
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

  // Each card is built like the other Home cards (outlined, 16 inside): the fund's logo and name with a small status
  // line under it, one line of what happened, then what to do. Red is kept to the status line, not the whole card.
  const cards = [
    ...missed.map((o) => {
      const fund = fundById(o.fundId);
      return (
        <div key={o.id} role="listitem" className="mf-alert">
          <span className="mf-alert-head">
            <FundMark fund={fund} size={32} />
            <span className="mf-alert-who">
              <b>{fund.name}</b>
              <span className="mf-alert-tag bad">
                <Icon name="warning-circle" size={14} />
                Missed SIP
              </span>
            </span>
          </span>
          <p className="mf-alert-text">
            Your {inr(o.amount)} instalment on {o.navDate} didn&rsquo;t go through, as the bank balance was low.
          </p>
          <span className="mf-alert-actions">
            {/* Paid as a one-time buy, so the fund's one-time minimum applies (SBI Large Cap: ₹1,000). */}
            {!fund.buy && (
              <button
                className="mf-btn solid sm"
                onClick={() => push({ name: "amount", fundId: o.fundId, mode: "lump", preset: Math.max(o.amount, fund.minAdd) })}
              >
                Invest {inr(Math.max(o.amount, fund.minAdd))} now
              </button>
            )}
            <button className="text-link" onClick={() => push({ name: "orderdetail", orderId: o.id })}>
              Details
            </button>
          </span>
        </div>
      );
    }),
    ...dueSoon.map((s) => {
      const fund = fundById(s.fundId);
      return (
        <div key={s.fundId} role="listitem">
          <button className="mf-alert" onClick={() => push({ name: "sipdetail", fundId: s.fundId })}>
            <span className="mf-alert-head">
              <FundMark fund={fund} size={32} />
              <span className="mf-alert-who">
                <b>{fund.name}</b>
                <span className="mf-alert-tag">
                  <Icon name="calendar" size={14} />
                  SIP on {fmtDay(s.next)} · {inr(s.amount)}
                </span>
              </span>
            </span>
            <p className="mf-alert-text">Keep {inr(s.amount)} in your bank so the SIP goes through.</p>
            {/* The whole card opens the SIP; this row only names where it goes, and keeps the card's bottom in line with the others. */}
            <span className="mf-alert-actions">
              <span className="text-link">View SIP</span>
            </span>
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
