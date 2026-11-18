import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { PeekBanner } from "./PeekBanner";
import { haptic } from "../ui/haptics";
import "../ui/dls.css";
import "./mfconsent.css";

/* MF early consent (design brief "MF Early Consent", 18 Nov 2026).

   People who joined SAHI before 1 Oct must give a one-time consent before they can invest in Mutual Funds. It is collected
   now, a month before MF launches, from a slim banner on the Stocks home: Activate → consent (a bottom sheet) → done.
   Consenting unlocks nothing; it only records the consent, and the person is never asked again.

   UX choices
   - Banner, not a pop-up: it waits on the home page and costs nothing to ignore.
   - Bottom sheet, not a new screen: the step is small and the person keeps their place; scrim, ✕, Escape and the system
     back all just close it (= Back returns home). Closing before consenting changes nothing; the banner stays.
   - The T&C is legal text and fixed: shown in full, as given, in a scrolling box with a fade at the bottom so it reads as
     "there is more". The tick does not wait for the person to scroll to the end: friction without value.
   - Give consent stays disabled until the box is ticked, then shows a short "Giving consent…" while it is recorded.
   - Done replaces the sheet's content in place (the sheet resizes to it) instead of opening another screen. On Back to
     Home (or any close) the banner folds away for good, so a late launch never leaves a stale card behind.
   - No timestamps, consent IDs, exchange names or technical words outside the legal text.

   Prototype only: consent is remembered for this page load only (in memory). Switching tabs keeps the banner gone;
   a refresh brings it back, so the flow can be demoed again and again. In the real app the backend remembers it for
   good. (It used to be saved in localStorage, which hid the banner on every later visit.) */

let consentedThisLoad = false;

// clear what the earlier localStorage version saved, so older visits don't keep the banner hidden
try {
  localStorage.removeItem("sahi.mfConsent.v1");
} catch {
  // storage unavailable: nothing to clear
}

const readConsent = (): boolean => consentedThisLoad;

function saveConsent() {
  consentedThisLoad = true;
}

// The Terms & Conditions, verbatim from the approved consent screen. Legal text: do not edit.
const TERMS = [
  "I/We am/are interested in availing the BSE StAR and NSE MFSS/NMF Mutual Fund facility for the purpose of dealing in the units of Mutual Funds under Direct Schemes permitted to be dealt with on the BSE StAR and NSE MFSS/NMF platform. For the purpose of availing this, I state that “Know Your Client” details as submitted by me for the opening of Trading Account may be considered for the purpose of BSE StAR and NSE MFSS/NMF and I/we further confirm that the details contained in same remain unchanged as on date. I am willing to abide by the terms and conditions as has been specified and as may be specified by the Exchange from time to time in this regard. I shall ensure also compliance with the requirements as may be specified from time to time by Securities and Exchange Board of India and Association of Mutual Funds of India (AMFI). I shall read and understand the contents of the Scheme Information Document and Key Information Memorandum, addenda issued regarding each Mutual Fund Schemes with respect to which I choose to subscribe/redeem. I further agree to abide by the terms and conditions, rules and regulations of the respective Mutual Fund Schemes subscribed by me.",
  "The client agree and acknowledge that Mutual Funds transactions done through Aaritya will be tagged with the SEBI Registration Code INZ000317632 will be treated as Direct and the same are being provided under “execution-only” transactions without any interaction or advice by the employee/relationship manager/sales person of the Aaritya or notwithstanding the advice of inappropriateness, if any, provided by the employee/relationship manager/sales person of Aaritya.",
  "The Client hereby give his/her consent to share/provide the transactions data feed/portfolio holdings/ NAV etc. in respect of my/our investments under Direct Plan of all Schemes.",
  "Since Mutual funds are held in Demat form maintained with Aaritya DP, the nomination applicable for client’s Demat account will be applicable for clients’s mutual fund holdings as well.",
  "The Client agrees and understands that Aaritya is only a facilitator for the client for applying in the Mutual Fund units. Allotment of units shall be at the sole discretion of the respective Asset Management Company (“AMC”) and the Aaritya shall not be held liable or responsible for any act/ deed / non-action of the AMC.",
  "The Transaction Instruction shall be processed subject to availability of sufficient and clear funds/securities in the client Bank/Demat Account.",
  "Any Transactions Instructions placed on a Non-Business Day or after cut off time will be processed on the next business day and NAV would be applicable NAV on the day on which it is processed. Transaction request once placed by the client through this mode cannot be cancelled. The client has read and understood the cut off timings for placing normal order/ L0/L1 orders, the details of which are clearly explained on Aaritya Website/Mobile Application and the client agree to the same.",
  "Investments from residents in the United States of America and Canada are not permitted for certain mutual funds. Aaritya shall not be liable for rejections of such applications by Mutual Funds, where investor is an US and Canada resident, all such US/Canada residents are required to do their own diligence with respect to eligibility in investing into such mutual funds/instruments.",
];

const RECORD_MS = 700; // the short "Giving consent…" while it is recorded

export function MfConsentBanner() {
  const [consented] = useState(readConsent);
  const [gone, setGone] = useState(consented); // unmounted for good
  const [folding, setFolding] = useState(false);
  const [open, setOpen] = useState(false);
  const done = useRef(false);

  if (gone) return null;

  const closeSheet = () => {
    setOpen(false);
    if (done.current) {
      // fold the banner away once the sheet is down
      setFolding(true);
      window.setTimeout(() => setGone(true), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320);
    }
  };

  return (
    <>
      <div className={`mfc-fold${folding ? " folding" : ""}`}>
        <div className="mfc-fold-inner">
          <PeekBanner onActivate={() => setOpen(true)} />
        </div>
      </div>
      {open && (
        <ConsentSheet
          onConsent={() => {
            done.current = true;
            saveConsent();
          }}
          onClose={closeSheet}
        />
      )}
    </>
  );
}

type Step = "agree" | "recording" | "done";

function ConsentSheet({ onConsent, onClose }: { onConsent: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<"enter" | "open" | "exit">("enter");
  const [step, setStep] = useState<Step>("agree");
  const [agreed, setAgreed] = useState(false);
  const [moreBelow, setMoreBelow] = useState(true);
  const sheet = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
    sheet.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(id);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, []);

  const close = () => {
    if (step === "recording") return; // let the save finish
    setPhase("exit");
    window.setTimeout(onClose, matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 280);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const give = () => {
    setStep("recording");
    window.setTimeout(() => {
      onConsent();
      haptic("major");
      setStep("done");
    }, RECORD_MS);
  };

  // Over the whole phone (the .device frame), not inside the home page, so page styles don't reach it.
  return createPortal(
    <div className={`mfc-layer ${phase}`}>
      <button className="mfc-scrim" aria-label="Close" tabIndex={-1} onClick={close} />
      <div
        ref={sheet}
        className={`mfc-sheet ${step === "done" ? "is-done" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={step === "done" ? "Ready for Mutual Funds launch day" : "Get ready for Mutual Funds"}
        tabIndex={-1}
      >
        <button className="mfc-x" aria-label="Close" onClick={close} disabled={step === "recording"}>
          <Icon name="x" size={20} />
        </button>

        {step !== "done" ? (
          <div className="mfc-step" key="agree">
            {/* MF launches about a month later: only the consent happens now; investing is always "on launch day". */}
            <h2>Get ready for Mutual Funds</h2>
            <p className="mfc-intro">
              Mutual Funds aren&rsquo;t available yet. Give your consent now and you can start investing on launch day.
              We&rsquo;ll use the details you gave when you joined, so there&rsquo;s nothing to fill in.
            </p>

            <div className={`mfc-terms${moreBelow ? " more" : ""}`}>
              <h3>Terms &amp; Conditions</h3>
              <div
                className="mfc-terms-scroll"
                tabIndex={0}
                aria-label="Terms and Conditions"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
                }}
              >
                <ol>
                  {TERMS.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>
            </div>

            <label className="mfc-check">
              <input type="checkbox" checked={agreed} disabled={step === "recording"} onChange={(e) => setAgreed(e.target.checked)} />
              <span className="mfc-box" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              </span>
              <span>I have read and agree to the Terms &amp; Conditions</span>
            </label>

            <button className="dls-btn primary large fill mfc-cta" disabled={!agreed || step === "recording"} onClick={give}>
              <span className="dls-btn-label">
                {step === "recording" ? (
                  <>
                    <span className="mfc-spin" aria-hidden="true" /> Giving consent&hellip;
                  </>
                ) : (
                  "Give consent"
                )}
              </span>
            </button>
          </div>
        ) : (
          <div className="mfc-step mfc-done" key="done" aria-live="polite">
            <span className="mfc-tick" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 12.5l4 4 8-9" />
              </svg>
            </span>
            {/* Answers, in order: what happened (you're ready), what will happen and when (not available yet; we'll tell
                you at launch; you invest then), and where they go (Back to Home). Never "now" or
                "right away": investing only opens on launch day, about a month later. */}
            <h2>You&rsquo;re ready for launch day</h2>
            <p className="mfc-intro">
              Mutual Funds aren&rsquo;t available yet. We&rsquo;ll let you know when they launch, and you can start investing then.
            </p>
            <button className="dls-btn primary large fill mfc-cta" onClick={close}>
              <span className="dls-btn-label">Back to Home</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.querySelector(".device") ?? document.body,
  );
}
