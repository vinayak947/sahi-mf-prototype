import { useState, type ReactNode } from "react";
import { FundMark } from "../mf/parts";
import { funds, type Fund } from "../mf/data";
import { haptic } from "../ui/haptics";
import { Icon, type IconName } from "../ui/Icon";
import "./peekbanner.css";

/* Mutual Funds pre-launch banner on the Stocks home (Flow v2): an outlined card where fund houses glide slowly up across
   its full width and dissolve into the headline. Hold the belt: it stops and three feature cards rise through it. Activate
   opens the consent sheet.

   The banner has one goal, getting the person to activate now. Its copy has to make three things clear: Mutual Funds
   are not here yet; activating is one tap; activating now means they can invest the day it launches.

   Other directions are archived in Mutual Funds/archive: mf-banner-looks (Story, Hero, Steps, Perks, Countdown…) and
   mf-peek-looks (Current, Deck, Phone; round2: Glass, Conveyor, edge-to-edge Flow; round3-spotlight: Spotlight). */

/* Copy (chosen from five options): "Get ready" frames the one tap as preparing for something on its way. The headline
   names the product and the action; the body says it isn't here yet, what it takes (one tap), and the payoff (invest
   from day one). Headline fits one line at 26 px (314 of 346 px). */
const TITLE = "Get ready for Mutual Funds";
const BODY = "They\u2019re coming to SAHI soon. Activate now in one tap to invest from day one.";

// one fund per fund house, for the belt
const HOUSES: Fund[] = funds.filter((f, i, all) => all.findIndex((g) => g.amc === f.amc) === i);

export function PeekBanner({ onActivate }: { onActivate: () => void }) {
  return <Flow onActivate={onActivate} />;
}

function Row({ fund }: { fund: Fund }) {
  return (
    <div className="pk-row blur">
      <FundMark fund={fund} size={28} />
      <span className="pk-name">{fund.name}</span>
      <span className="pk-bar" />
    </div>
  );
}

/* ---- Hold to see what's coming ----------------------------------------------------------------------------------- */

/* Hold the belt and what Mutual Funds will offer comes out of it: three cards rise through the frost, one after
   another, and land fanned. Let go and they tuck back in, faster than they came (the hold is a choice, the release
   isn't). Each reads as one line, label first ("Commission ₹0"), the value in the display serif. */
// icons say what each card is about: a price tag for fees, repeat arrows for a monthly SIP, a wallet for withdrawals
const FEATURES: [IconName, string, string][] = [
  ["tag", "Commission", "₹0"],
  ["repeat", "Start a SIP from", "₹100"],
  ["wallet", "Withdraw", "Anytime"],
];

function HoldReveal({ className, children }: { className: string; children: ReactNode }) {
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
        <small className="pk-hint">Hold to see what&rsquo;s coming</small>
      </span>
      <div className="pk-feats" aria-hidden="true">
        {FEATURES.map(([icon, label, value], i) => (
          <span key={label} className={`pk-feat f${i}`}>
            <span className="pk-feat-icon">
              <Icon name={icon} size={20} />
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

/* ---- Flow v2 ------------------------------------------------------------------------------------------------------ */

/* An outlined card. The funds glide up across its full width (no inner box or padding) and fade out at the top and
   into the headline at the bottom, so the list and the text read as one piece; only the text keeps 16 px padding. */
function Flow({ onActivate }: { onActivate: () => void }) {
  const list = [...HOUSES, ...HOUSES]; // twice, so the loop has no seam
  return (
    <section className="pk-flow" aria-label={TITLE}>
      <HoldReveal className="pk-conv pk-flow-belt">
        <div className="pk-conv-mask" aria-hidden="true">
          <div className="pk-conv-track">
            {list.map((f, i) => (
              <Row key={`${f.id}-${i}`} fund={f} />
            ))}
          </div>
        </div>
      </HoldReveal>
      <div className="pk-flow-copy">
        <h3>{TITLE}</h3>
        <p>{BODY}</p>
        <button className="pk-btn wide" onClick={onActivate}>
          Activate
        </button>
      </div>
    </section>
  );
}
