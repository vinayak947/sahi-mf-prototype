import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { FundMark } from "../mf/parts";
import { funds, fundById, type Fund } from "../mf/data";
import { haptic } from "../ui/haptics";
import { Icon, type IconName } from "../ui/Icon";
import "./peekbanner.css";

/* Mutual Funds pre-launch banner on the Stocks home: a glimpse of what's coming, then Activate (opens the consent sheet).
   Two Peek directions are behind a switch. Each keeps one idea: you can see Mutual Funds are real and close, but not
   reach them yet. The delight is always something you can do with the glimpse, never motion for its own sake, and
   nothing loops loudly on a page people open every day.

   Flow      · funds glide slowly up across the card, edge to edge, and dissolve into "Mutual Funds launching soon".
               Hold the belt: it stops and three feature cards rise through it.
   Spotlight · a dark stage of fund-house logos, dimmed; a soft light drifts over them and follows your finger.

   Copy is shared, and answers "why now?": activating today means nothing to set up on launch day.
   Other banner directions are in Mutual Funds/archive/mf-banner-looks; Current, Deck and Phone are in
   Mutual Funds/archive/mf-peek-looks, and Glass, Conveyor and the edge-to-edge Flow in its round2 folder. */

type Look = "flow" | "spotlight";
const LOOKS: [Look, string][] = [
  ["flow", "Flow v2"],
  ["spotlight", "Spotlight"],
];
const KEY = "sahi.mfPeek.look";


const readLook = (): Look => {
  try {
    const v = localStorage.getItem(KEY) as Look | null;
    return v && LOOKS.some(([k]) => k === v) ? v : "flow";
  } catch {
    return "flow";
  }
};

// one fund per fund house that has a logo, for the belt and the spotlight
const HOUSES: Fund[] = funds.filter((f, i, all) => all.findIndex((g) => g.amc === f.amc) === i);

export function PeekBanner({ onActivate }: { onActivate: () => void }) {
  const [look, setLook] = useState<Look>(readLook);
  const pick = (l: Look) => {
    setLook(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // the pick just isn't remembered
    }
  };
  return (
    <>
      {/* Prototype control, not part of the design. */}
      <div className="pk-switch" role="radiogroup" aria-label="Peek look">
        {LOOKS.map(([k, label]) => (
          <button key={k} role="radio" aria-checked={look === k} className={look === k ? "on" : ""} onClick={() => pick(k)}>
            {label}
          </button>
        ))}
      </div>
      <div key={look} className="pk-stage">
        {look === "flow" && <Flow onActivate={onActivate} />}
        {look === "spotlight" && <Spotlight onActivate={onActivate} />}
      </div>
    </>
  );
}

/* ---- shared pieces ------------------------------------------------------------------------------------------------ */

// One headline for both looks: says what it is and when, so no extra "Coming soon" chip is needed.
const TITLE = "Mutual Funds launching soon";

// dark: the inverse chip floating over a preview; onDark: a light chip for the dark Spotlight card
const Soon = ({ dark, onDark }: { dark?: boolean; onDark?: boolean }) => (
  <span className={`pk-soon${dark ? " dark" : ""}${onDark ? " ondark" : ""}`}>
    <i aria-hidden="true" />
    Coming soon
  </span>
);

function Copy({
  onActivate,
  wide = true,
  chip = false,
  dark = false,
  title = TITLE,
}: {
  onActivate: () => void;
  wide?: boolean;
  chip?: boolean;
  dark?: boolean;
  title?: string;
}) {
  return (
    <>
      {chip && <Soon onDark={dark} />}
      <h3>{title}</h3>
      <p>Coming soon to SAHI. Activate today, and there&rsquo;s nothing to set up on launch day.</p>
      <button className={`pk-btn${wide ? " wide" : ""}${dark ? " light" : ""}`} onClick={onActivate}>
        Activate
      </button>
    </>
  );
}

function Row({ fund, blur = true }: { fund: Fund; blur?: boolean }) {
  return (
    <div className={`pk-row${blur ? " blur" : ""}`}>
      <FundMark fund={fund} size={28} />
      <span className="pk-name">{fund.name}</span>
      <span className="pk-bar" />
    </div>
  );
}

function Card({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  return (
    <section className={`pk-card ${className}`} aria-label={label}>
      {children}
    </section>
  );
}

/* ---- 1 · Flow v2: the belt in a card; hold to stop it and see what's coming ------------------------------------- */

/* Hold the belt and what Mutual Funds will offer comes out of it: three cards rise through the frost, one after
   another, and land fanned. Let go and they tuck back in, faster than they came (the hold is a choice, the release
   isn't). The value leads each card in the display serif, so it reads in a glance. */
// [icon, label, value]: read as one line, label first ("Commission ₹0"), the value carrying the weight
const FEATURES: [IconName, string, string][] = [
  ["sparkle-fill", "Commission", "\u20b90"],
  ["calendar", "Start a SIP from", "\u20b9100"],
  ["lightning", "Withdraw", "Anytime"],
];

/* The hold: press and hold the belt and the feature cards rise through it (the belt pauses); let go and they tuck back. */
function HoldReveal({ className, children, chip = true }: { className: string; children: ReactNode; chip?: boolean }) {
  const [peek, setPeek] = useState(false);
  const off = () => setPeek(false);
  return (
    <div
      className={`pk-hold ${className}${peek ? " peeking" : ""}`}
      onPointerDown={() => {
        setPeek(true);
        haptic("tick");
      }}
      onPointerUp={off}
      onPointerLeave={off}
      onPointerCancel={off}
      onContextMenu={(e) => e.preventDefault()}
      role="img"
      aria-label={`Mutual Funds, coming soon: ${FEATURES.map(([, l, v]) => `${l} ${v}`).join(", ")}`}
    >
      {children}
      <div className="pk-frost" aria-hidden="true" />
      <span className="pk-center" aria-hidden="true">
        {chip && <Soon dark />}
        <small className="pk-hint">Hold to see what&rsquo;s coming</small>
      </span>
      <div className="pk-feats" aria-hidden="true">
        {FEATURES.map(([icon, label, value], i) => (
          <span key={label} className={`pk-feat f${i}`}>
            <span className="pk-feat-icon">
              <Icon name={icon} size={18} />
            </span>
            <span className="pk-feat-text">
              <small>{label}</small>
              <b>{value}</b>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* An outlined card. The funds glide up across its full width (no inner box or padding) and fade out at the top and
   into the headline at the bottom, so the list and the text read as one piece; only the text keeps 16 px padding. The
   only thing on the belt is "Hold to see what's coming"; the headline carries "launching soon". */
function Flow({ onActivate }: { onActivate: () => void }) {
  const list = [...HOUSES, ...HOUSES];
  return (
    <section className="pk-flow" aria-label="Mutual Funds launching soon">
      <HoldReveal className="pk-conv pk-flow-belt" chip={false}>
        <div className="pk-conv-mask" aria-hidden="true">
          <div className="pk-conv-track">
            {list.map((f, i) => (
              <Row key={`${f.id}-${i}`} fund={f} />
            ))}
          </div>
        </div>
      </HoldReveal>
      <div className="pk-flow-copy">
        <Copy onActivate={onActivate} title={TITLE} />
      </div>
    </section>
  );
}

/* ---- 2 · Spotlight: a light over the fund houses ------------------------------------------------------------------- */

/* Built for touch first (there is no hover on a phone):
   - Untouched, the light drifts slowly on its own, so the card is alive with no interaction at all.
   - Tap: the light glides to your finger (280 ms). Drag: it follows 1:1. Sideways drags stay with the light; a vertical
     swipe still scrolls the page (touch-action: pan-y), so the card never traps the scroll.
   - Let go: the light rests where you left it, then after 2.5 s glides back to the start of its drift and carries on.
   - No hint: it's a quiet extra for whoever touches it, the drift alone carries the card. On a desktop, the light also
     follows the mouse. */
const IDLE_MS = 2500;
const GLIDE_MS = 600;

function Spotlight({ onActivate }: { onActivate: () => void }) {
  const lit = useRef<HTMLDivElement>(null);
  const pressed = useRef(false);
  const idle = useRef(0);
  const [driving, setDriving] = useState(false); // the drift is paused while someone steers
  const [glide, setGlide] = useState(false); // ease to the next position instead of jumping

  const place = (x: string, y: string) => {
    // set on the masked layer itself, so only it recalculates
    lit.current?.style.setProperty("--sx", x);
    lit.current?.style.setProperty("--sy", y);
  };
  const toPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    place(`${((e.clientX - r.left) / r.width) * 100}%`, `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const steer = () => {
    window.clearTimeout(idle.current);
    setDriving(true);
  };
  // after a pause, glide back to where the drift starts, then hand back to it: no jump
  const rest = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      setGlide(true);
      place("18%", "40%");
      idle.current = window.setTimeout(() => {
        lit.current?.style.removeProperty("--sx");
        lit.current?.style.removeProperty("--sy");
        setGlide(false);
        setDriving(false);
      }, GLIDE_MS);
    }, IDLE_MS);
  };
  useEffect(() => () => window.clearTimeout(idle.current), []);

  const move = toPointer;
  const grid = HOUSES.slice(0, 10);
  const Grid = () => (
    <div className="pk-spot-grid">
      {grid.map((f) => (
        <FundMark key={f.id} fund={f} size={36} />
      ))}
    </div>
  );
  return (
    <Card className="pk-spot-card" label={TITLE}>
      <div
        className={`pk-spot${driving ? " driving" : ""}${glide ? " glide" : ""}`}
        aria-hidden="true"
        onPointerDown={(e) => {
          pressed.current = true;
          steer();
          setGlide(true); // a tap eases to the finger
          move(e);
        }}
        onPointerMove={(e) => {
          if (!pressed.current && e.pointerType !== "mouse") return;
          steer();
          setGlide(false); // a drag follows 1:1
          move(e);
        }}
        onPointerUp={() => {
          pressed.current = false;
          rest();
        }}
        onPointerCancel={() => {
          pressed.current = false; // the page took the gesture (a vertical scroll)
          rest();
        }}
        onPointerLeave={(e) => e.pointerType === "mouse" && rest()}
      >
        <div className="pk-spot-dim">
          <Grid />
        </div>
        <div ref={lit} className="pk-spot-lit">
          <Grid />
        </div>
      </div>
      <Copy onActivate={onActivate} title={TITLE} />
    </Card>
  );
}
