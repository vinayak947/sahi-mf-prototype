import { useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import tickData from "../lottie/pay-tick.json";
import { PlayLottie } from "./Checkout";
import { fundById } from "./data";
import { fmtDay, inr, ordinal } from "./format";
import { Disclaimer, Sheet } from "./parts";
import { accountLabel, methodView } from "./payData";
import { useMf, type Done, type Route } from "./store";

// Order status, in the layout of the payment-method prototype (payment-method.apk):
// a coloured top with falling lines and one big mark, then a white sheet with the
// headline, a "View details" row and a button at the bottom. Three states share it:
// placed (green), didn't go through (red) and no word from the bank yet (amber).

type Tone = "ok" | "bad" | "wait";

// The lottie draws a green disc with a white tick; on the coloured top it reads as
// a white disc with a green tick, as in the APK.
type Anim = { layers: { shapes: { it?: { c?: { k: number[] } }[]; c?: { k: number[] } }[] }[] };
const TICK = (() => {
  const d = JSON.parse(JSON.stringify(tickData)) as Anim;
  d.layers[0].shapes[0].it![1].c!.k = [0.0667, 0.4157, 0.251, 1]; // the tick
  d.layers[1].shapes[1].it![1].c!.k = [1, 1, 1, 1]; // the disc
  d.layers[2].shapes[1].c!.k = [1, 1, 1, 1]; // the burst
  return d;
})();

// Lines fall at their own pace; negative delays put them mid-fall on the first frame.
const RAIN = Array.from({ length: 17 }, (_, i) => ({
  i,
  len: 28 + ((i * 37) % 48),
  dur: 3.2 + ((i * 53) % 30) / 10,
  delay: -(((i * 29) % 40) / 10),
})).filter((r) => r.i % 3 !== 2);

function Hero({ tone }: { tone: Tone }) {
  return (
    <div className="st-hero" aria-hidden="true">
      <div className="st-rain">
        {RAIN.map((r) => (
          <i key={r.i} style={{ "--i": r.i, "--len": `${r.len}px`, "--dur": `${r.dur}s`, "--delay": `${r.delay}s` } as CSSProperties} />
        ))}
      </div>
      {tone === "ok" && <PlayLottie data={TICK} className="st-tick" />}
      {tone === "bad" && (
        <span className="st-disc">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" strokeWidth="4.5" strokeLinecap="round">
            <path pathLength="1" className="st-draw" style={{ animationDelay: "180ms" }} d="M15 15 33 33" />
            <path pathLength="1" className="st-draw" style={{ animationDelay: "340ms" }} d="M33 15 15 33" />
          </svg>
        </span>
      )}
      {tone === "wait" && (
        <span className="st-disc">
          <svg viewBox="0 0 48 48" width="52" height="52" fill="none" strokeWidth="4" strokeLinecap="round">
            <circle cx="24" cy="24" r="17" />
            <path className="st-hand slow" d="M24 24 24 15" />
            <path className="st-hand" d="M24 24 24 11" />
          </svg>
        </span>
      )}
    </div>
  );
}

function StatusScreen({
  tone,
  title,
  text,
  detailsTitle,
  details,
  footer,
}: {
  tone: Tone;
  title: string;
  text: string;
  detailsTitle: string;
  details: ReactNode;
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mf-screen st ${tone}`}>
      <Hero tone={tone} />
      <div className="st-sheet">
        <div className="st-copy" role="status">
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <button className="st-more" onClick={() => setOpen(true)} aria-haspopup="dialog">
          View details
          <Icon name="chevron-right" size={16} />
        </button>
        <footer className="st-foot">{footer}</footer>
      </div>
      {open && (
        <Sheet title={detailsTitle} action="Close" onClose={() => setOpen(false)}>
          <div className="st-detail">{details}</div>
        </Sheet>
      )}
    </div>
  );
}

function Line({ label, hint, value }: { label: string; hint?: string; value: ReactNode }) {
  return (
    <div className="st-kv">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <b>{value}</b>
    </div>
  );
}

function PaidWith() {
  const { payMethod } = useMf();
  const via = methodView(payMethod);
  return <Line label="Paid with" value={`${via.title} · ${via.sub}`} />;
}

// ---- Placed, or waiting on the bank ------------------------------------------------

export function DoneScreen({ done }: { done: Done }) {
  const { viewOrders, viewSips, closeAll } = useMf();
  const fund = fundById(done.fundId);
  const sip = done.kind === "SIP";
  const sell = done.kind === "Redeem";
  // A SIP with nothing paid yet has no order, so its details are on the SIP tab.
  const track = sip && !done.paidNow ? viewSips : viewOrders;

  if (done.pending)
    return (
      <StatusScreen
        tone="wait"
        title="Waiting for confirmation"
        text={
          sip
            ? `We haven't heard back from your bank about AutoPay for ${fund.name}. Your SIP starts once it confirms.`
            : `We haven't heard back from your bank about ${inr(done.amount)} for ${fund.name}. Please don't pay again.`
        }
        detailsTitle="Order details"
        details={
          <>
            <Line label="Fund" value={fund.name} />
            <Line label={sip ? "SIP amount" : "Amount"} value={sip ? `${inr(done.amount)} a month` : inr(done.amount)} />
            <PaidWith />
            <Line label="Status" value="Waiting for your bank" />
            <p className="st-note">
              We&rsquo;ll update this order as soon as the bank confirms. If the payment fails, any money debited goes
              back to your account in 3 to 5 working days.
            </p>
          </>
        }
        footer={
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={track}>
              View order
            </button>
            <button className="mf-btn solid" onClick={closeAll}>
              Done
            </button>
          </div>
        }
      />
    );

  return (
    <StatusScreen
      tone="ok"
      title={sip ? "SIP started" : sell ? "Redeem order placed" : "Order placed"}
      text={
        sip
          ? done.paidNow
            ? `Your first instalment of ${inr(done.amount)} is paid.`
            : `Your first debit of ${inr(done.amount)} is on ${done.firstDebit}.`
          : sell
            ? `${inr(done.amount)} will be sold from ${fund.name}.`
            : `${inr(done.amount)} is on its way to ${fund.name}.`
      }
      detailsTitle="Order details"
      details={
        <>
          <Line label="Fund" value={fund.name} />
          <Line label={sip ? "SIP amount" : "Amount"} value={sip ? `${inr(done.amount)} a month` : inr(done.amount)} />
          {!sell && <PaidWith />}
          {sell && done.units !== undefined && <Line label="Units" value={done.units.toFixed(3)} />}
          {(!sip || done.paidNow) && (
            <Line label={sell ? "Sold at NAV of" : "Units priced at NAV of"} value={done.navDate} />
          )}
          {done.stampDuty !== undefined && (
            <Line label="Stamp duty" hint="0.005%, set by law" value={inr(done.stampDuty, 2)} />
          )}
          {sip && !done.paidNow && <Line label="First debit" value={done.firstDebit ?? ""} />}
          <Line
            label={sell ? "Money in your bank by" : "Units by"}
            hint={sell ? "After the sale" : undefined}
            value={sell ? done.unitsBy : sip && !done.paidNow ? "After your first debit" : done.unitsBy}
          />
          {done.afterCutoff && !sip && (
            <p className="st-note">This was after the day&rsquo;s cut-off, so the price is set at the {done.navDate} NAV.</p>
          )}
          <button className="st-link" onClick={track}>
            {sip && !done.paidNow ? "See in SIPs" : "See in Orders"}
          </button>
          <Disclaimer />
        </>
      }
      footer={
        <button className="mf-btn solid wide" onClick={closeAll}>
          Done
        </button>
      }
    />
  );
}

// ---- Didn't go through ----------------------------------------------------------------

export function FailedScreen({
  kind,
  fundId,
  amount,
  back,
}: {
  kind: "payment" | "mandate";
  fundId: string;
  amount: number;
  back: Route;
}) {
  const { replace, pop, payMethod } = useMf();
  const fund = fundById(fundId);
  const pay = kind === "payment";
  // The account they chose on the pad, so the reason names the one they actually paid from.
  const wrongBank =
    payMethod.kind === "id"
      ? `You approved from an account not linked to ${payMethod.vpa}.`
      : `You paid from a bank other than ${accountLabel(payMethod.account)}.`;
  return (
    <StatusScreen
      tone="bad"
      title={pay ? "Payment didn't go through" : "AutoPay was rejected"}
      text={
        pay
          ? `We couldn't collect ${inr(amount)} for ${fund.name}. No money has left your account.`
          : `Your bank didn't approve AutoPay for ${fund.name}. Your SIP has not started.`
      }
      detailsTitle="What happened"
      details={
        <>
          <Line label="Fund" value={fund.name} />
          <Line label={pay ? "Amount" : "SIP amount"} value={pay ? inr(amount) : `${inr(amount)} a month`} />
          <PaidWith />
          <Line label="Status" value={pay ? "Payment failed" : "AutoPay rejected"} />
          <p className="st-note strong">Common reasons</p>
          <ul className="st-reasons">
            {pay ? (
              <>
                <li>{wrongBank}</li>
                <li>The UPI request timed out before you approved it.</li>
                <li>The bank declined it. Check your balance and daily UPI limit.</li>
              </>
            ) : (
              <>
                <li>The UPI PIN was entered wrongly or the request timed out.</li>
                <li>Your bank&rsquo;s AutoPay limit is lower than the SIP amount.</li>
                <li>The account doesn&rsquo;t support UPI AutoPay.</li>
              </>
            )}
          </ul>
          <p className="st-note">If any money was debited, it goes back to your account automatically.</p>
        </>
      }
      footer={
        <div className="mf-actions">
          <button className="mf-btn ghost" onClick={pop}>
            Change {pay ? "payment method" : "amount"}
          </button>
          <button className="mf-btn solid" onClick={() => replace(back)}>
            Try again
          </button>
        </div>
      }
    />
  );
}

// ---- SIP cancelled ------------------------------------------------------------------------

export function SipCancelledScreen({
  fundId,
  amount,
  day,
  reason,
  inProgress,
}: {
  fundId: string;
  amount: number;
  day: number;
  reason: string;
  inProgress: number;
}) {
  const { closeAll } = useMf();
  const fund = fundById(fundId);
  return (
    <StatusScreen
      tone="ok"
      title="SIP cancelled"
      text={
        inProgress > 0
          ? `No more debits for ${fund.name}. The instalment already in progress will still complete.`
          : `No more debits for ${fund.name}. Your units stay invested.`
      }
      detailsTitle="SIP details"
      details={
        <>
          <Line label="Fund" value={fund.name} />
          <Line label="SIP amount" value={`${inr(amount)} a month`} />
          <Line label="SIP date" value={`${ordinal(day)} of every month`} />
          <Line label="Cancelled on" value={fmtDay(new Date())} />
          <Line label="Reason" value={reason} />
          <p className="st-note">Your units stay invested. You can start a new SIP in this fund anytime.</p>
        </>
      }
      footer={
        <button className="mf-btn solid wide" onClick={closeAll}>
          Done
        </button>
      }
    />
  );
}
