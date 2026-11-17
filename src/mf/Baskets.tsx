// Researcher backed baskets: the home carousel, the "View all" page, and the amount, review and done screens.
// A basket's own page (the IDP) lives in basketidp/. All sample data lives in baskets-data.ts.
import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Block, HScroll } from "../ui/widgets";
import {
  basketFunds,
  basketMinimum,
  basketReturn3Y,
  baskets,
  REVIEWED,
  researchers,
  riskLabel,
  basketRisk,
  type Basket,
} from "./baskets-data";
import { type Risk } from "./data";
import { inr, pct } from "./format";
import { FundMark, Screen } from "./parts";
import { useMf } from "./store";

// Per cent without the plus sign: "12.4%".
const plain = (value: number, decimals = 1) => pct(value, decimals).replace("+", "");

// ---- Small shared pieces --------------------------------------------------------------------

// The first three funds' marks, overlapping, and "+N" for the rest.
function FundStack({ basket, size }: { basket: Basket; size: number }) {
  const list = basketFunds(basket);
  const shown = list.slice(0, 3);
  return (
    <span className="bk-stack" aria-hidden="true">
      {shown.map(({ fund }, i) => (
        <FundMark key={`${fund.id}-${i}`} fund={fund} size={size} />
      ))}
      {list.length > shown.length && (
        <span className="bk-more" style={{ width: size, height: size }}>
          +{list.length - shown.length}
        </span>
      )}
    </span>
  );
}

/* A basket is drawn as a small pile of cards: the card in front, and one card behind it for each further fund, two at
   most, peeking out above its top edge. Fan, Folder and Basket looks were tried too; they are in
   Mutual Funds/archive/basket-card-looks. */
function BasketCard({ basket, tint }: { basket: Basket; tint: number }) {
  const { push } = useMf();
  const ret = basketReturn3Y(basket);
  const minSip = basketMinimum(basket, "sip");
  const risk = riskLabel(basketRisk(basket));
  const behind = Math.min(2, basket.funds.length - 1);
  return (
    <div className="bk-pile">
      {Array.from({ length: behind }, (_, i) => (
        <i key={i} className={`bk-layer l${i + 1}`} aria-hidden="true" />
      ))}
      <button
        className="bk-card"
        data-tint={tint % 3}
        aria-label={`${basket.name}. ${basket.funds.length} funds. ${risk}. Minimum SIP ${inr(minSip)} a month. Reviewed by SAHI Research, ${REVIEWED}.`}
        onClick={() => push({ name: "basket", basketId: basket.id })}
      >
        <span className="bk-top">
          <FundStack basket={basket} size={28} />
          <span className="bk-count">
            {basket.funds.length} funds
            <Icon name="caret-right" size={16} />
          </span>
        </span>
        <b className="bk-name">{basket.name}</b>
        <span className="bk-who">{basket.who}</span>
        <span className="bk-stats">
          <span>
            <small>3Y return</small>
            <strong className={ret >= 0 ? "up" : "down"}>{plain(ret)}</strong>
          </span>
          <span>
            <small>Min. SIP</small>
            <strong>{inr(minSip)}</strong>
          </span>
          <span>
            <small>Risk</small>
            <strong>{risk.replace(" risk", "")}</strong>
          </span>
        </span>
      </button>
    </div>
  );
}

// "Reviewed by SAHI Research" month line under the title.
function ReviewedLine({ className = "bk-sub", action }: { className?: string; action?: ReactNode }) {
  return (
    <div className={className}>
      <Icon name="shield-check" size={14} />
      <span>{REVIEWED}</span>
      {action}
    </div>
  );
}

// ---- Home carousel and "View all" page --------------------------------------------------------

// The home widget: a title, "View all", and one card per basket.
export function BasketsSection() {
  const { push } = useMf();
  return (
    <Block>
      <ReviewedLine className="bk-sub bk-eyebrow" />
      <div className="block-head">
        <h2>Researcher backed baskets</h2>
        <button className="text-link" onClick={() => push({ name: "baskets" })}>
          View all
        </button>
      </div>
      <HScroll>
        {baskets.map((basket, i) => (
          <BasketCard key={basket.id} basket={basket} tint={i} />
        ))}
      </HScroll>
    </Block>
  );
}

const BASKET_LIMITS =
  "A basket is a set of funds our research team chose to sit together. It isn’t advice made for you. Past returns aren’t a promise.";

export function BasketsScreen() {
  const { pop } = useMf();
  return (
    <Screen title="Researcher backed baskets" onBack={pop}>
      <ReviewedLine className="bk-sub bk-sub-page" />
      <div className="bk-list">
        {baskets.map((basket, i) => (
          <BasketCard key={basket.id} basket={basket} tint={i} />
        ))}
      </div>
      <p className="mf-small bk-limits">{BASKET_LIMITS}</p>
    </Screen>
  );
}

export function BasketLine({ basket, note }: { basket: Basket; note: string }) {
  return (
    <div className="mf-fundline">
      <div className="bk-line-logos">
        <FundStack basket={basket} size={32} />
      </div>
      <span>
        <b>{basket.name}</b>
        <small>{note}</small>
      </span>
    </div>
  );
}
