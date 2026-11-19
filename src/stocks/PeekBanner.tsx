import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
// Option B: the facts below carry the "why", so the body only has to say when and what to do, in one line.
const BODY_SHORT = "Coming soon. Activate now to invest on day one.";

// one fund per fund house, for the belt
const HOUSES: Fund[] = funds.filter((f, i, all) => all.findIndex((g) => g.amc === f.amc) === i);
// three well-known houses whose logos are square marks (wordmarks like Quant's crop badly at 24 px), for the strip
const STRIP_HOUSES: Fund[] = ["HDFC", "PPFAS", "Bandhan"].map((amc) => HOUSES.find((f) => f.amc === amc)).filter((f): f is Fund => !!f);

/* Two versions, shown one under the other on the Stocks home for review:
   - "hold" (A): hold the belt and the three features rise out of it.
   - "listed" (B): no hidden layer. The belt is only the picture (shorter, not interactive) and the three features are
     written into the card as a row of facts between the copy and Activate, so the card reads: what's coming, what you
     get, act. Nothing to discover, nothing missed by people who never press and hold.
   - "tiles" (C): no belt at all. The three features are the hero, as tiles, and they carry the motion (see Tiles). */
export type BannerVariant = "hold" | "listed" | "tiles";

export function PeekBanner({ onActivate, onMinimise, variant = "hold" }: { onActivate: () => void; onMinimise?: () => void; variant?: BannerVariant }) {
  if (variant === "tiles") return <TilesCard onActivate={onActivate} onMinimise={onMinimise} />;
  return <Flow onActivate={onActivate} onMinimise={onMinimise} variant={variant} />
}

/* ---- Minimised: the slim strip ------------------------------------------------------------------------------------ */

/* "Not now" folds the card into this one-line strip (56 px, about a quarter of the card). It stays at the top of the
   Stocks home until the person activates: the consent is needed before launch day, so the banner never goes away, it
   only gets out of the way. Tapping the strip opens the card again; Activate goes straight to the consent sheet. */
export function MfStrip({ onActivate, onExpand }: { onActivate: () => void; onExpand: () => void }) {
  return (
    <section className="pk-strip" aria-label={TITLE}>
      <button className="pk-strip-open" onClick={onExpand} aria-expanded="false" aria-label={`${TITLE}. Show more`}>
        <span className="pk-strip-logos" aria-hidden="true">
          {STRIP_HOUSES.map((f) => (
            <FundMark key={f.id} fund={f} size={24} />
          ))}
        </span>
        <span className="pk-strip-text">Mutual Funds coming soon</span>
        <Icon name="chevron-down" size={16} />
      </button>
      <button className="pk-btn pk-strip-cta" onClick={onActivate}>
        Activate
      </button>
    </section>
  );
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

// Option B's one-line facts, each read as a phrase: [icon, text before the value, value, text after]
const FACTS: [IconName, string, string, string][] = [
  ["tag", "", "₹0", " commission"],
  ["repeat", "SIPs from ", "₹100", ""],
  ["wallet", "Withdraw ", "anytime", ""],
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
function Flow({ onActivate, onMinimise, variant }: { onActivate: () => void; onMinimise?: () => void; variant: BannerVariant }) {
  const list = [...HOUSES, ...HOUSES]; // twice, so the loop has no seam
  const belt = (
    <div className="pk-conv-mask" aria-hidden="true">
      <div className="pk-conv-track">
        {list.map((f, i) => (
          <Row key={`${f.id}-${i}`} fund={f} />
        ))}
      </div>
    </div>
  );
  return (
    <section className={`pk-flow ${variant}`} aria-label={TITLE}>
      {variant === "hold" ? (
        <HoldReveal className="pk-conv pk-flow-belt">{belt}</HoldReveal>
      ) : (
        <div className="pk-conv pk-flow-belt pk-belt-still">{belt}</div>
      )}
      <div className="pk-flow-copy">
        <h3>{TITLE}</h3>
        <p>{variant === "listed" ? BODY_SHORT : BODY}</p>
        {variant === "listed" && (
          // the same three facts the hold reveals, as three soft pills: a shape of their own, so they read as tags and
          // not as more sentence. No icons; the pill does that job and saves the width. Value in medium weight.
          <ul className="pk-facts" aria-label="What you get">
            {FACTS.map(([icon, before, value, after]) => (
              <li key={icon}>
                {before}
                <b>{value}</b>
                {after}
              </li>
            ))}
          </ul>
        )}
        <button className="pk-btn wide" onClick={onActivate}>
          Activate
        </button>
        {onMinimise && (
          <button className="pk-notnow" onClick={onMinimise}>
            Not now
          </button>
        )}
      </div>
    </section>
  );
}

/* ---- Option C: feature tiles, no belt ------------------------------------------------------------------------------

   Order of information, each line answering the next question:
     1. What is this?        a quiet line: three fund-house logos + "Coming soon to SAHI" (the belt's job, in one line)
     2. What's coming?       the headline
     3. Why should I care?   three feature tiles, the hero: icon, the value in the display serif, a short label
     4. When / what to do?   one line: activate now in one tap, invest from day one
     5. Act                  Activate, Not now
   Motion is spent where it earns attention and then stops (no loops): the tiles rise one after another the first time
   the card is seen, each icon makes one small gesture as its tile lands (the tag swings, the arrows turn, the wallet
   hops), and a tap turns a tile over to a one-line detail, a reason to touch it. The cue is a folded corner (dog-ear)
   on each tile: the real-world sign for "this has another side". Once, after the icons, the first tile's corner lifts
   a little to show it moves. */
const TILES: { icon: IconName; value: string; label: string; detail: string }[] = [
  // Backs, 4 short lines at most (~50 characters): the plain meaning of the front, and the one catch if there is one.
  // ₹0: SAHI offers Direct and Regular plans, and Regular plans carry a distributor commission inside their yearly cost,
  // so the back says what SAHI itself charges (nothing), not that the fund has no commission.
  { icon: "tag", value: "₹0", label: "Commission", detail: "SAHI charges no fee to buy, sell or start a SIP" },
  { icon: "repeat", value: "₹100", label: "SIPs from", detail: "Invest a set amount every month, automatically" },
  { icon: "wallet", value: "Anytime", label: "Withdraw", detail: "Sell any day. Tax-saver funds lock in for 3\u00a0years" },
];

let tilesIntroDone = false; // the rise plays once per page load, not on every return to the tab

function TilesCard({ onActivate, onMinimise }: { onActivate: () => void; onMinimise?: () => void }) {
  const [intro] = useState(() => !tilesIntroDone);
  useEffect(() => {
    tilesIntroDone = true;
  }, []);
  const [flipped, setFlipped] = useState<number | null>(null); // one tile over at a time
  return (
    <section className={`pk-flow tiles${intro ? " intro" : ""}`} aria-label={TITLE}>
      <div className="pk-flow-copy pk-tiles-copy">
        <p className="pk-eyebrow">
          <span className="pk-strip-logos" aria-hidden="true">
            {STRIP_HOUSES.map((f) => (
              <FundMark key={f.id} fund={f} size={20} />
            ))}
          </span>
          Coming soon to SAHI
        </p>
        <h3>{TITLE}</h3>
        <ul className="pk-tiles" aria-label="What you get">
          {TILES.map((t, i) => {
            const on = flipped === i;
            return (
              <li key={t.label} style={{ "--i": i } as CSSProperties}>
                <button
                  className={`pk-tile${on ? " flipped" : ""}`}
                  aria-pressed={on}
                  aria-label={on ? `${t.detail}. Tap to turn back` : `${t.value} ${t.label.toLowerCase()}. Tap to turn over`}
                  onClick={() => {
                    haptic("tick");
                    setFlipped(on ? null : i);
                  }}
                >
                  <span className="pk-tile-inner">
                    <span className="pk-tile-face front" aria-hidden="true">
                      <span className={`pk-tile-icon ${t.icon}`}>
                        <Icon name={t.icon} size={20} />
                      </span>
                      <b>{t.value}</b>
                      <small>{t.label}</small>
                    </span>
                    <span className="pk-tile-face back" aria-hidden="true">
                      <small>{t.detail}</small>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p>Activate now in one tap to invest from day one.</p>
        <button className="pk-btn wide" onClick={onActivate}>
          Activate
        </button>
        {onMinimise && (
          <button className="pk-notnow" onClick={onMinimise}>
            Not now
          </button>
        )}
      </div>
    </section>
  );
}
