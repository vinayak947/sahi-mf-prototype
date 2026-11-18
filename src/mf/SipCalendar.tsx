import { Icon } from "../ui/Icon";
import { fundById } from "./data";
import { fmtDay, inr } from "./format";
import { FundMark } from "./parts";

// The SIP tab's hero card: a desk calendar. Two faint grey binder rings on top, a dog-eared bottom corner, and the
// basket card's wash, stacked logos and due-soon row.
// Custom piece: the DLS has no calendar card, so it is built from DLS tokens only.
type Sip = { fundId: string; amount: number; day: number };
type Upcoming = Sip & { next: Date };

export function SipCalendarCard({ sips, upcoming, today, onStart }: { sips: Sip[]; upcoming: Upcoming[]; today: Date; onStart: () => void }) {
  const first = upcoming[0];
  const monthly = sips.reduce((sum, s) => sum + s.amount, 0);
  const dueSoon = upcoming.filter((s) => (s.next.getTime() - today.getTime()) / 864e5 <= 2);
  const dueAmount = dueSoon.reduce((sum, s) => sum + s.amount, 0);
  const funds = [...new Set(sips.map((s) => s.fundId))].slice(0, 3).map(fundById);
  const empty = sips.length === 0;

  return (
    <section className="sc-card" aria-label={empty ? "SIP calendar, no SIPs running" : `SIP calendar, ${sips.length} SIPs, ${inr(monthly)} a month`}>
      <i className="sc-ring" style={{ left: "20%" }} aria-hidden="true" />
      <i className="sc-ring" style={{ left: "80%" }} aria-hidden="true" />

      <div className="sc-head">
        <span className="sc-top">
          <span className="bk-stack" aria-hidden="true">
            {funds.length ? funds.map((f) => <FundMark key={f.id} fund={f} size={28} />) : <span className="sc-cal-glyph"><Icon name="calendar" size={20} /></span>}
          </span>
          <span className="sc-count">{empty ? "No SIPs yet" : `${sips.length} ${sips.length === 1 ? "SIP" : "SIPs"}`}</span>
        </span>
        <small>Monthly SIP amount</small>
        <strong>{inr(monthly)}</strong>
      </div>

      {empty ? (
        <button className="sc-cta" onClick={onStart}>
          Start a new SIP
          <Icon name="chevron-right" size={20} />
        </button>
      ) : (
        <div className="sc-due">
          <Icon name="clock" size={24} />
          <span>
            {dueSoon.length > 0 ? (
              <>
                <b>{inr(dueAmount)} due in the next 2 days</b>
                <small>
                  {dueSoon.length === 1 ? fundById(dueSoon[0].fundId).name : `${dueSoon.length} SIPs`} · debits on {fmtDay(dueSoon[0].next)}
                </small>
              </>
            ) : (
              <>
                <b>Next debit on {fmtDay(first.next)}</b>
                <small>
                  {fundById(first.fundId).name} · {inr(first.amount)}
                </small>
              </>
            )}
          </span>
        </div>
      )}

      <i className="sc-fold" aria-hidden="true" />
    </section>
  );
}
