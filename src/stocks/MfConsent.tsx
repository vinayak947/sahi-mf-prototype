import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Icon } from "../ui/Icon";
import { MfStrip, PeekBanner, type BannerVariant } from "./PeekBanner";
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
// The banner lands (rises in) the first time the Stocks tab is opened in a page load; after that, coming back to the tab
// shows it in place. In the real app this would be "first time ever", kept with the consent.
let landedThisLoad = false;
// "Not now" folds the banner into a slim strip; it stays a strip on later visits to the tab (this page load, like the
// consent; in the real app it would be remembered with it) until the person opens it again or activates.
const minimisedThisLoad: Record<BannerVariant, boolean> = { hold: false, listed: false, tiles: false }; // each version on its own

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

const MORPH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)"; // card ↔ strip; keep in step with .mfc-shape in mfconsent.css
const RECORD_MS = 700; // the short "Giving consent…" while it is recorded

export function MfConsentBanner({ variant = "hold", label }: { variant?: BannerVariant; label?: string }) {
  const [consented] = useState(readConsent);
  const [gone, setGone] = useState(consented); // unmounted for good
  const [folding, setFolding] = useState(false);
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const [landing] = useState(() => !landedThisLoad); // read only: the flag is set in an effect, so Strict Mode's double call agrees
  useEffect(() => {
    landedThisLoad = true;
  }, []);
  const [mini, setMini] = useState(() => minimisedThisLoad[variant]);
  const [swapped, setSwapped] = useState(false); // after the first change of size, the new content fades in
  const [leaving, setLeaving] = useState<"card" | "strip" | null>(null); // the view fading out during a morph
  const box = useRef<HTMLDivElement>(null);
  const morph = useRef<Animation | null>(null);
  const settle = useRef(0);
  useEffect(() => () => window.clearTimeout(settle.current), []);

  if (gone) return null;

  /* Card ↔ strip, as ONE shape changing (Emil: morph, don't swap). The outline, corners and fill belong to the box
     (.mfc-shape), so it is the card's own border that shrinks into the strip, instead of a new strip appearing while an
     empty box collapses under it. Inside, the old view stays where it was, pinned to the top, and fades out fast (it
     isn't remounted, so the fund belt doesn't jump); the new view fades in a beat later. The height eases in and out
     (Emil: a shape changing on screen is ease-in-out), 440ms: it starts gently and settles softly, where the old strong
     ease-out dropped half the height in the first 60ms and read as a snap. Height is animated on purpose (it is what moves the page below) and it
     happens rarely. A second tap mid-way restarts from where the box is. Reduced motion: an instant swap. */
  const resize = (next: boolean) => {
    minimisedThisLoad[variant] = next;
    const el = box.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMini(next);
      return;
    }
    const from = el.getBoundingClientRect().height;
    morph.current?.cancel();
    window.clearTimeout(settle.current);
    flushSync(() => {
      setMini(next);
      setLeaving(next ? "card" : "strip");
      setSwapped(true);
    });
    const to = el.getBoundingClientRect().height;
    morph.current = el.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 440, easing: MORPH_EASE });
    settle.current = window.setTimeout(() => setLeaving(null), 440);
  };
  const view = (which: "card" | "strip") =>
    which === "strip" ? (
      <MfStrip onActivate={() => setOpen(true)} onExpand={() => resize(false)} />
    ) : (
      <PeekBanner variant={variant} onActivate={() => setOpen(true)} onMinimise={() => resize(true)} />
    );
  const current = mini ? "strip" : "card";

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
      <div className={`mfc-fold${folding ? " folding" : ""}${landing ? " landing" : ""}`}>
        <div className="mfc-fold-inner">
          {label && <p className="mfc-option">{label}</p>}
          <div className={`mfc-shape ${current}`} ref={box}>
            {/* stable keys and a fixed order: the leaving view keeps its DOM (and its belt position) while it fades */}
            {(["card", "strip"] as const).map((which) =>
              which === current ? (
                <div key={which} className={swapped ? "mfc-swap-in" : undefined}>
                  {view(which)}
                </div>
              ) : which === leaving ? (
                <div key={which} className="mfc-swap-out" aria-hidden="true" inert>
                  {view(which)}
                </div>
              ) : null,
            )}
          </div>
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
