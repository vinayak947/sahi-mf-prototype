import { useState } from "react";
import { Icon } from "../ui/Icon";
import { fundById } from "./data";
import { inr, nextSipDate, ordinal } from "./format";
import { FundMark, Screen, Sheet } from "./parts";
import { accountLabel, mandateAccount } from "./payData";
import { CANCEL_REASONS, isOpen, statusClass, statusLabel } from "./screens";
import { useMf } from "./store";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "20 Oct 2026" from an ISO date (yyyy-mm-dd, local).
const fmtFull = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

// Stable short mandate id from the fund id: "UPI-3c693ae3".
const mandateId = (fundId: string) => {
  let h = 2166136261;
  for (const c of fundId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return "UPI-" + h.toString(16).padStart(8, "0");
};

export function SipDetail2({ fundId }: { fundId: string }) {
  const { pop, push, replace, sips, orders, cancelSip, payMethod } = useMf();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const fund = fundById(fundId);
  const sip = sips.find((s) => s.fundId === fundId);
  if (!sip) {
    return (
      <Screen onBack={pop} title="SIP">
        <p className="mf-empty">This SIP is no longer active.</p>
      </Screen>
    );
  }

  const mine = orders
    .filter((o) => o.kind === "SIP" && o.fundId === fundId)
    .sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
  const done = mine.filter((o) => o.status === "completed");
  const invested = done.reduce((s, o) => s + o.amount, 0);
  const inProgress = mine.filter(isOpen).length;
  const next = nextSipDate(sip.day);

  let bank = "HDFC Bank ****4417";
  try {
    bank = accountLabel(mandateAccount(payMethod));
  } catch {
    /* keep the fallback */
  }
  const active = done.length > 0;

  const confirm = () => {
    cancelSip(fundId);
    replace({ name: "sipcancelled", fundId, amount: sip.amount, day: sip.day, reason: reason!, inProgress });
  };

  return (
    <Screen
      onBack={pop}
      title="SIP details"
      right={
        <button className="mf-head-link" onClick={() => setAsking(true)}>
          Cancel SIP
        </button>
      }
    >
      <button className="mf-fundline link" onClick={() => push({ name: "fund", fundId })}>
        <FundMark fund={fund} size={40} />
        <span>
          <b>{fund.name}</b>
          <small>{fund.catLabel} · Direct</small>
        </span>
        <Icon name="caret-right" size={16} />
      </button>

      <div className="summary-card summary-card-lg sd-card">
        <div className="summary-grid">
          <span>
            <small>SIP amount</small>
            <strong>{inr(sip.amount)}</strong>
          </span>
          <span className="summary-right">
            <small>Invested so far</small>
            <strong>{inr(invested)}</strong>
          </span>
        </div>
        <div className="summary-grid">
          <span>
            <small>SIP date</small>
            <strong>{ordinal(sip.day)} of every month</strong>
          </span>
          <span className="summary-right">
            <small>Frequency</small>
            <strong>Monthly</strong>
          </span>
        </div>
        <div className="summary-grid">
          <span>
            <small>Mandate ID</small>
            <strong>{mandateId(fundId)}</strong>
          </span>
          <span className="summary-right">
            <small>Mandate status</small>
            <em className={`amo ${active ? "st-completed" : "st-inprogress"}`}>{active ? "Active" : "Processing"}</em>
          </span>
        </div>
        <hr className="sd-divider" />
        <div className="summary-grid">
          <span>
            <small>Bank account</small>
            <strong>{bank}</strong>
          </span>
        </div>
      </div>

      <div className="sd-next">
        <Icon name="calendar" size={20} />
        <span>
          Next SIP: <b>{`${next.getDate()} ${MONTHS[next.getMonth()]} ${next.getFullYear()}`}</b>
        </span>
      </div>

      <section className="mf-section sd-txns">
        <h3>All transactions</h3>
        {mine.length === 0 ? (
          <p className="mf-empty sd-empty">No instalments yet. The first one shows here once it is placed.</p>
        ) : (
          <ul className="row-list">
            {mine.map((o) => (
              <li key={o.id}>
                <button className="sd-row" onClick={() => push({ name: "orderdetail", orderId: o.id })}>
                  <span className="sd-left">
                    <em className={`amo ${statusClass(o)}`}>{statusLabel(o)}</em>
                    <small>{fmtFull(o.on)}</small>
                  </span>
                  <span className="sd-right">
                    <b>{inr(o.amount, 2)}</b>
                    {o.allotment ? (
                      <small>
                        NAV {inr(o.allotment.nav, 2)} · {o.allotment.units.toFixed(3)} units
                      </small>
                    ) : o.debitOn ? (
                      <small>Debit on {o.debitOn}</small>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {asking && (
        <Sheet
          title="Why are you cancelling?"
          action="Cancel SIP"
          disabled={!reason}
          onAction={confirm}
          onClose={() => {
            setAsking(false);
            setReason(null);
          }}
        >
          <div className="mf-options" role="radiogroup">
            {CANCEL_REASONS.map((r) => (
              <label key={r} className={`mf-option${reason === r ? " on" : ""}`}>
                <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} />
                <span className="radio" />
                <span>
                  <b>{r}</b>
                </span>
              </label>
            ))}
          </div>
          <p className="mf-small mf-cancel-note">
            {inProgress > 0
              ? "No new debits after this. The instalment already in progress still completes, and your units stay invested."
              : "No new debits after this. Your units stay invested."}
          </p>
        </Sheet>
      )}
    </Screen>
  );
}
