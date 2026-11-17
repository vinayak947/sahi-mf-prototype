// Researcher backed baskets: the home carousel, the "View all" page, and the amount, review and done screens.
// A basket's own page (the IDP) lives in basketidp/. All sample data lives in baskets-data.ts.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

// Folder outline (Base Design System node 6813:75725): a grey back sheet with a tab on the left rises 17px above
// a white front sheet whose sides taper in ~3px towards the bottom. The paths are the Figma ones, re-drawn for the
// card's actual size so the corners keep their shape on the full-width "View all" list.
const TAB = 17; // how far the back sheet's tab rises above the front sheet

function frontPath(w: number, h: number) {
  return `M0 16.37C-.2 7.39 7.02 0 16 0H${w - 16}C${w - 7.02} 0 ${w + 0.2} 7.39 ${w - 0.005} 16.37`
    + `L${w - 3.27} ${h - 15.63}C${w - 3.47} ${h - 6.94} ${w - 10.57} ${h} ${w - 19.26} ${h}`
    + `H19.26C10.57 ${h} 3.47 ${h - 6.94} 3.26 ${h - 15.63}Z`;
}

function backPath(w: number, h: number) {
  return `M0 16.34C-.19 7.37 7.03 0 16 0H76.83C80.75 0 84.53 1.44 87.46 4.04L89.61 5.96C92.54 8.56 96.32 10 100.24 10`
    + `H${w - 16}C${w - 7.02} 10 ${w + 0.2} 17.38 ${w} 26.36L${w - 3.29} ${h - 15.65}C${w - 3.49} ${h - 6.95} ${w - 10.59} ${h} ${w - 19.29} ${h}`
    + `H19.33C10.62 ${h} 3.51 ${h - 6.96} 3.33 ${h - 15.66}Z`;
}

function FolderShape() {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  return (
    <svg ref={ref} className="bk-folder" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {size && (
        <>
          <path className="bk-folder-back" transform="translate(4 0)" d={backPath(w - 8, h)} />
          <path className="bk-folder-front" transform={`translate(0 ${TAB})`} d={frontPath(w, h - TAB)} />
        </>
      )}
    </svg>
  );
}

function BasketCard({ basket, tint }: { basket: Basket; tint: number }) {
  const { push } = useMf();
  const ret = basketReturn3Y(basket);
  const minSip = basketMinimum(basket, "sip");
  const risk = riskLabel(basketRisk(basket));
  return (
    <button
      className="bk-card"
      data-tint={tint % 3}
      aria-label={`${basket.name}. ${basket.funds.length} funds. ${risk}. Minimum SIP ${inr(minSip)} a month. Reviewed by SAHI Research, ${REVIEWED}.`}
      onClick={() => push({ name: "basket", basketId: basket.id })}
    >
      <FolderShape />
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
