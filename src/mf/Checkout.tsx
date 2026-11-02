import lottie from "lottie-web/build/player/lottie_light";
import { useEffect, useRef, useState } from "react";
import { asset } from "../assets";
import checking from "../lottie/pay-checking.json";
import { inr } from "./format";
import { ProtoLink, Screen, Sheet } from "./parts";
import { accountLabel, DEFAULT_METHOD, mandateAccount, methodView, type PayMethod } from "./payData";
import { useMf, type Route } from "./store";

// Pay and come back, as in the payment-method prototype (payment-method.apk):
// Invest hands off to the chosen UPI app (or bank), and on return the app
// checks the payment status before showing the order. A SIP (`day` set) does the
// same for UPI AutoPay; once AutoPay is approved, later SIPs skip the app. Its two animations,
// getting_details.json and tick.json, are in src/lottie as pay-checking / pay-tick.

const CHECK_MS = 2600;

export function PlayLottie({
  data,
  loop = false,
  className,
}: {
  data: object;
  loop?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // lottie-web mutates the data it is given, so hand it a copy.
    const instance = lottie.loadAnimation({
      container: box.current,
      renderer: "svg",
      loop: loop && !reduceMotion,
      autoplay: !reduceMotion,
      animationData: JSON.parse(JSON.stringify(data)),
    });
    if (reduceMotion) instance.addEventListener("DOMLoaded", () => instance.goToAndStop(instance.totalFrames - 1, true));
    return () => instance.destroy();
  }, [data, loop]);
  return <span aria-hidden="true" className={className} ref={box} />;
}

// Where the person goes to approve, in their words.
function handoff(m: PayMethod): { where: string; line: string; cta: string } {
  if (m.kind === "upi") {
    const view = methodView(m);
    return { where: view.title, line: `From ${view.sub}`, cta: "Approve with UPI PIN" };
  }
  if (m.kind === "id") return { where: "Your UPI app", line: `Request sent to ${m.vpa}`, cta: "Approve with UPI PIN" };
  return { where: methodView(m).sub, line: "Net banking", cta: "Log in and pay" };
}

export function CheckoutScreen({
  fundId,
  amount,
  day,
  payFirst = false,
  fail = false,
  back,
}: {
  fundId: string;
  amount: number;
  day?: number; // set for a SIP: the monthly debit date
  payFirst?: boolean; // SIP: also pay the first instalment now
  fail?: boolean;
  back?: Route;
}) {
  const { pop, replace, placeLump, placeSip, payMethod, mandateLimit } = useMf();
  const sip = day !== undefined;
  // An approved AutoPay covers this SIP only up to the amount it was approved for.
  const covered = sip && mandateLimit >= amount;
  // Nothing to approve: AutoPay already covers it and nothing is paid today.
  const silent = covered && !payFirst;
  // AutoPay is approved in a UPI app; with a UPI ID or net banking picked, the default app does it.
  const method = sip && payMethod.kind !== "upi" ? DEFAULT_METHOD : payMethod;
  const [phase, setPhase] = useState<"away" | "checking">(silent && !fail ? "checking" : "away");
  // "pending": the bank sent no word back, so the order waits on it.
  const [outcome, setOutcome] = useState<"ok" | "fail" | "pending">(fail ? "fail" : "ok");
  // Backing out leaves a live request in the UPI app (or an open bank page): confirm, then withdraw it.
  const [leaving, setLeaving] = useState(false);
  const view = methodView(method);
  const away = !sip
    ? handoff(method)
    : covered
      ? { ...handoff(method), line: `First SIP instalment from ${accountLabel(mandateAccount(payMethod))}` }
      : {
          ...handoff(method),
          line: `Up to ${inr(amount)} a month from ${accountLabel(mandateAccount(payMethod))}${payFirst ? `. First ${inr(amount)} paid now` : ""}`,
          cta: "Approve AutoPay with UPI PIN",
        };
  const approvingMandate = sip && !covered;

  useEffect(() => {
    if (phase !== "checking") return;
    const timer = window.setTimeout(() => {
      if (outcome === "fail") {
        replace({
          name: "failed",
          kind: approvingMandate ? "mandate" : "payment",
          fundId,
          amount,
          back: back ?? { name: "checkout", fundId, amount, day, payFirst },
        });
      } else if (sip) {
        replace({ name: "done", done: placeSip(fundId, amount, day, payFirst, outcome === "pending") });
      } else {
        replace({ name: "done", done: placeLump(fundId, amount, outcome === "pending") });
      }
    }, CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, outcome, sip, day, payFirst, approvingMandate, fundId, amount, back, replace, placeLump, placeSip]);

  function comeBack(next: "ok" | "fail" | "pending") {
    setOutcome(fail ? "fail" : next);
    setPhase("checking");
  }

  if (phase === "checking")
    return (
      <Screen onBack={() => {}} className="pay-check">
        <div className="pay-checking" role="status">
          <PlayLottie data={checking} loop className="pay-checking-art" />
          <b>{silent ? "Starting your SIP" : approvingMandate ? "Checking AutoPay status" : "Checking payment status"}</b>
          <small>This takes a few seconds. Please don&rsquo;t close the app.</small>
        </div>
      </Screen>
    );

  // Stand-in for the UPI app (or bank page) the phone switches to.
  return (
    <div className="pay-away">
      <p className="pay-away-tag">Prototype · {away.where} opens here</p>
      <div className="pay-away-card">
        <span className={`mf-paywith-logo${view.filled ? " filled" : ""}`}>
          <img src={asset(view.logo)} alt="" />
        </span>
        <small>{approvingMandate ? "AutoPay for SAHI Mutual Funds" : "Paying SAHI Mutual Funds"}</small>
        <b>{inr(amount, amount % 1 ? 2 : 0)}</b>
        <small>{away.line}</small>
      </div>
      <div className="pay-away-foot">
        <button className="mf-btn solid wide" onClick={() => comeBack("ok")}>
          {away.cta}
        </button>
        <button className="mf-btn ghost wide" onClick={() => setLeaving(true)}>
          Cancel and go back
        </button>
        <ProtoLink onClick={() => comeBack("fail")}>simulate a {approvingMandate ? "rejected AutoPay" : "failed payment"}</ProtoLink>
        <ProtoLink onClick={() => comeBack("pending")}>simulate no word from the bank</ProtoLink>
      </div>
      {leaving && (
        <Sheet
          title={approvingMandate ? "Stop setting up AutoPay?" : "Cancel this payment?"}
          action="Yes, cancel"
          onAction={pop}
          onClose={() => setLeaving(false)}
        >
          <p className="mf-small">
            We&rsquo;ll withdraw the request in {away.where}, so it can&rsquo;t be approved later.{" "}
            {approvingMandate
              ? "If you already approved it, we revoke the AutoPay and nothing is debited."
              : "If you already paid, we won\u2019t place an order and the money goes back to your account in 3 to 5 working days."}
          </p>
        </Sheet>
      )}
    </div>
  );
}
