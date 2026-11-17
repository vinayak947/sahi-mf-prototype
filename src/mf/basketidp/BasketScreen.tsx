import "../fundidp/fundidp.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { asset } from "../../assets";
import { Icon } from "../fundidp/Icon";
import { Block, HScroll } from "../../ui/widgets";
import { baskets, basketById, basketCost, basketFunds, basketMin, basketRisk, basketAsFund, basketBuyState, blended3Y, blendedReturns, NIFTY50, RESEARCHERS, NEXT_REVIEW, REVIEWED, riskLabel, basketFundId, type Basket } from "./data";
import { inr, navSeries, pct, smoothPath } from "../fundidp/format";
import { Ticker } from "../fundidp/calc/core";
import { riskLevels } from "../data";
import { Disclaimer, Fold, FundMark, fundCategory, ManagerAvatar, Notice, Riskometer, Row, Screen, SegmentSwitcher, Stars, VerifiedBadge } from "../fundidp/parts";
import { ResearcherSheet } from "./ResearcherSheet";
import { ReturnCalculator } from "../fundidp/ReturnCalculator";
import { sipReturns } from "../fundidp/sip";
import { useMf } from "../store";


// Bar segments and row markers share these, in order, so the bar explains the rows. Three different hues from the palette (plum, amber, green);
// red is left out because it means a loss everywhere else, and a fourth fund would start again with the first.
const SHADES = ["var(--bk-c1)", "var(--bk-c2)", "var(--bk-c3)"];

// The funds of a basket as overlapping logos, three at most and a "+n" for the rest.
export function LogoStack({ basket, size }: { basket: Basket; size: number }) {
  const list = basketFunds(basket);
  const shown = list.slice(0, 3);
  return (
    <span className="bk-stack-idp" aria-hidden="true">
      {shown.map(({ fund }, i) => (
        <FundMark key={`${fund.id}-${i}`} fund={fund} size={size} />
      ))}
      {list.length > shown.length && (
        <span className="bk-more-idp" style={{ width: size, height: size }}>
          +{list.length - shown.length}
        </span>
      )}
    </span>
  );
}

// The mark of the team that picked it. No people yet: the team is the author.
function TeamMark({ size = 24 }: { size?: number }) {
  return (
    <span className="bk-team-mark-idp" style={{ width: size, height: size }} aria-hidden="true">
      <img src={asset("37c13.svg")} alt="" draggable={false} style={{ width: size * 0.58, height: size * 0.58 }} />
    </span>
  );
}


function ReviewedBy({ className, action }: { className?: string; action?: ReactNode }) {
  return (
    <div className={className ?? "bk-sub-idp"}>
      <Icon name="shield-check" size={14} />
      <span>{REVIEWED}</span>
      {action}
    </div>
  );
}

// Home widget. The card makes the claim (who, reviewed when); the page behind it holds the proof.
// The "who and when" line sits above the title like a label, and View all goes with the title.

// The basket next to the Nifty 50: what ₹10,000 became over 1, 3 or 5 years, drawn as two lines from the same start.
// The paths are sample series that end where each side's own annual return says they should (see navSeries).
type CmpRange = "1Y" | "3Y" | "5Y";
const CMP_YEARS: Record<CmpRange, number> = { "1Y": 1, "3Y": 3, "5Y": 5 };
const CMP_AT: Record<CmpRange, 0 | 1 | 2> = { "1Y": 0, "3Y": 1, "5Y": 2 };

function BasketCompare({ basket, range, onRange }: { basket: Basket; range: CmpRange; onRange: (r: CmpRange) => void }) {
  const mine = blendedReturns(basket).mine;
  const nifty: [number, number, number] = [NIFTY50.r1, NIFTY50.r3, NIFTY50.r5];
  const at = CMP_AT[range];
  const years = CMP_YEARS[range];
  const grown = (rate: number) => 10000 * (1 + rate / 100) ** years;
  const a = mine[at];
  const b = nifty[at];
  const ahead = a - b;

  const paths = useMemo(() => {
    const A = navSeries(`basket-${basket.id}`, range, mine[0], mine[1], mine[2]).values;
    const B = navSeries("nifty-50", range, nifty[0], nifty[1], nifty[2]).values;
    const lo = Math.min(...A, ...B);
    const hi = Math.max(...A, ...B);
    const span = hi - lo || 1;
    const toPts = (v: number[]) => v.map((x, i) => [i / (v.length - 1), 0.06 + ((x - lo) / span) * 0.88] as [number, number]);
    return { basket: smoothPath(toPts(A)), nifty: smoothPath(toPts(B)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket.id, range]);

  return (
    <>
      <SegmentSwitcher
        wide
        className="seg-returns"
        label="How far back to compare"
        value={range}
        onChange={onRange}
        options={[
          ["1Y", "1Y"],
          ["3Y", "3Y"],
          ["5Y", "5Y"],
        ]}
      />
      <div className="bkc-chart-idp">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="bkc-nifty-idp" d={paths.nifty} vectorEffect="non-scaling-stroke" />
          <path className="bkc-basket-idp" d={paths.basket} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="bkc-legend-idp">
        <span>
          <i className="b" />
          {basket.name}
        </span>
        <span>
          <i className="n" />
          {NIFTY50.name}
        </span>
      </div>
      <table className="mf-table-idp bkc-table-idp">
        <thead>
          <tr>
            <th />
            <th>This basket</th>
            <th>{NIFTY50.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A year over {years === 1 ? "1 year" : `${years} years`}</td>
            <td className={a >= 0 ? "up" : "down"}>
              <b>{pct(a, 1)}</b>
            </td>
            <td className={b >= 0 ? "up" : "down"}>{pct(b, 1)}</td>
          </tr>
          <tr>
            <td>₹10,000 became</td>
            <td>
              <b>{inr(Math.round(grown(a)))}</b>
            </td>
            <td>{inr(Math.round(grown(b)))}</td>
          </tr>
        </tbody>
      </table>
      <p className="bkc-verdict-idp">
        <b className={ahead >= 0 ? "up" : "down"}>{pct(Math.abs(ahead), 1).replace("+", "")} a year {ahead >= 0 ? "ahead of" : "behind"}</b> the {NIFTY50.name} over {years === 1 ? "1 year" : `${years} years`}.
      </p>
      <p className="mf-small-idp">
        The {NIFTY50.name} is India&rsquo;s 50 biggest companies, with dividends added back. Annualised. A basket holds more than company shares, so it
        can move differently. Past performance does not predict future returns.
      </p>
    </>
  );
}

export function BasketScreen({ basketId }: { basketId: string }) {
  const { pop, push } = useMf();
  const basket = basketById(basketId);
  const list = basketFunds(basket);
  const r3 = blended3Y(basket);
  const [shared, setShared] = useState(false);

  // Same behaviour as the goal pages: the phone's share sheet when there is one, else the text goes to the clipboard and the icon says "Copied" for a moment.
  async function share() {
    const text = `${basket.name} on SAHI: ${basket.who} ${basket.funds.length} funds, ${pct(r3, 1).replace("+", "")} a year over the past 3 years, from ${inr(basketMin(basket, "sip"))} a month. Reviewed by SAHI Research, ${REVIEWED}.`;
    try {
      if (navigator.share) await navigator.share({ title: basket.name, text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // the person closed the share sheet
    }
  }

  const risk = basketRisk(basket);
  // the gauge takes the colour family of the basket's risk level (green, amber or red, as on the riskometer)
  const riskColour = `var(--${["positive", "warning", "negative"][Math.floor(riskLevels.indexOf(risk) / 2)]}-surface)`;
  const lockIn = list.find((f) => f.fund.lockIn)?.fund.lockIn; // none of the sample baskets has a locked-in fund
  const buy = basketBuyState(basket);
  const riskiest = list.reduce((top, f) => (riskLevels.indexOf(f.fund.risk) > riskLevels.indexOf(top.fund.risk) ? f : top));
  const [counting, setCounting] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setCounting(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [sheetFor, setSheetFor] = useState<string | null>(null); // the researcher whose sheet is open
  const [cmpRange, setCmpRange] = useState<CmpRange>("3Y");

  // Returns, as on a fund page: what a lumpsum earned, or what a monthly SIP earned, for the mix against its funds' category averages.
  const [retMode, setRetMode] = useState<"lump" | "sip">("lump");
  const blend = blendedReturns(basket);
  const mine: [number, number, number] = retMode === "lump" ? blend.mine : sipReturns(blend.mine);
  const avg: [number, number, number] = retMode === "lump" ? blend.avg : sipReturns(blend.avg);
  const retRows: [string, number, number][] = [
    ["1Y", mine[0], avg[0]],
    ["3Y", mine[1], avg[1]],
    ["5Y", mine[2], avg[2]],
  ];

  // Built like a fund page: docked title, hero, the one big figure, three facts, then folds, and the same two buttons at the bottom.
  // No chart: a basket has no price history of its own. The order is placed as one order per fund (see BasketOrder.tsx).
  return (
    <Screen
      onBack={pop}
      plainBack
      footer={
        buy.state === "paused" ? (
          <button className="mf-btn solid wide" disabled>
            New investments paused
          </button>
        ) : buy.state === "sip-only" ? (
          <button className="mf-btn solid wide" onClick={() => push({ name: "amount", fundId: basketFundId(basketId), mode: "sip" })}>
            Start SIP
          </button>
        ) : (
          <div className="mf-actions">
            <button className="mf-btn ghost" onClick={() => push({ name: "amount", fundId: basketFundId(basketId), mode: "lump" })}>
              Invest One-time
            </button>
            <button className="mf-btn solid" onClick={() => push({ name: "amount", fundId: basketFundId(basketId), mode: "sip" })}>
              Start SIP
            </button>
          </div>
        )
      }
      right={
        <button className="mf-share-icon" onClick={share} aria-label={shared ? "Copied" : "Share this basket"}>
          {shared ? <small>Copied</small> : <Icon name="share-02" size={20} />}
        </button>
      }
      dockTitle={
        <>
          <LogoStack basket={basket} size={24} />
          <span className="dock-name">{basket.name}</span>
        </>
      }
    >
      <div className="fund-hero">
        <LogoStack basket={basket} size={48} />
        <h2 data-dock-anchor>{basket.name}</h2>
        <p className="fund-meta-idp">{basket.who}</p>
      </div>
      {buy.fund && buy.state === "paused" && (
        <Notice tone="warn">{buy.fund.name} is not taking new money right now, so this basket can't be started until it reopens.</Notice>
      )}
      {buy.fund && buy.state === "sip-only" && (
        <Notice tone="warn">{buy.fund.name} has stopped one-time investments, so this basket can only be started as a SIP.</Notice>
      )}

      <div className="fund-figures-idp">
        <div className="fund-main">
          <strong className={r3 >= 0 ? "up" : "down"}>
            <Ticker value={r3} format={(v) => pct(v, 1).replace("+", "")} armed={counting} ms={700} />
          </strong>
          <small>a year over 3 years</small>
        </div>
        <div className="fund-day">
          <b>{riskLabel(risk).replace(" risk", "")}</b>
          <small>Risk</small>
        </div>
      </div>

      <dl className="fund-stats bk-stats-page-idp">
        <div>
          <dt>Funds</dt>
          <dd>{basket.funds.length}</dd>
        </div>
        <div>
          <dt>Min. SIP</dt>
          <dd>{inr(basketMin(basket, "sip"))}</dd>
        </div>
        <div>
          <dt>Cost a year</dt>
          <dd>{basketCost(basket).toFixed(2)}%</dd>
        </div>
      </dl>

      <Fold title="What&rsquo;s inside" summary={`${basket.funds.length} funds`} defaultOpen>
        <div className="bk-bar-idp" aria-hidden="true">
          {list.map((f, i) => (
            <i key={`${f.fund.id}-${i}`} style={{ flexGrow: f.weight, background: SHADES[i % SHADES.length] }} />
          ))}
        </div>
        <ul className="bk-rows-idp">
          {list.map(({ fund, weight }, i) => (
            <li key={`${fund.id}-${i}`}>
              <button className="bk-row-idp" onClick={() => push({ name: "fund", fundId: fund.id })}>
                <FundMark fund={fund} size={40} />
                <span className="bk-row-text-idp">
                  <b>{fund.name}</b>
                  <small>
                    {fundCategory(fund)} • <Stars n={fund.stars} />
                  </small>
                </span>
                <span className="bk-weight-idp">
                  <i style={{ background: SHADES[i % SHADES.length] }} />
                  {weight}%
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mf-small-idp">Tap a fund to see it. Direct plans, with no commission on any fund here.</p>
      </Fold>

      <Fold title="Why this basket?" summary={basket.whyShort} defaultOpen={false}>
        <div className="bk-pick-head-idp">
          <TeamMark size={32} />
          <span>
            <b>SAHI Research</b>
            <small>
              Reviewed {REVIEWED} · Next review {NEXT_REVIEW}
            </small>
          </span>
        </div>
        <ul className="bk-how-idp">
          {basket.how.map((line) => (
            <li key={line}>
              <Icon name="check-circle" size={16} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Fold>

      {/* Suitability, after why it was picked. The title is a question, so the closed header is its one-line answer (whoShort), like "Why this basket?" above. */}
      <Fold title="Who is this for" summary={basket.whoShort} defaultOpen={false}>
        <ul className="bk-fit-list-idp">
          <li>
            <span className="bk-fit-icon-idp" style={{ color: riskColour }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 16.5a8.5 8.5 0 1 1 15 0" />
                <path d="M12 14.5l3.2-4.2" />
                <circle cx="12" cy="15.2" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <p>
              Investors {basket.seeking}, with {riskLabel(risk).toLowerCase()}.
            </p>
          </li>
          <li>
            <span className="bk-fit-icon-idp" style={{ color: "var(--accent-text)" }}>
              <Icon name="clock" size={22} />
            </span>
            <p>
              Suggested holding period: {basket.years}+ {basket.years === 1 ? "year" : "years"}
              <span className="bk-fit-note-idp"> · {lockIn ? `${lockIn} lock-in` : "No lock-in period"}</span>
            </p>
          </li>
        </ul>
      </Fold>

      <Fold
        title="Returns"
        defaultOpen={false}
        summary={
          <>
            <b className={mine[1] >= 0 ? "up" : "down"}>{pct(mine[1], 1)}</b> a year over 3 years
          </>
        }
      >
        <SegmentSwitcher
          wide
          className="seg-returns"
          label="How the returns are measured"
          value={retMode}
          onChange={setRetMode}
          options={[
            ["lump", "Lumpsum"],
            ["sip", "SIP"],
          ]}
        />
        <table className="mf-table-idp">
          <thead>
            <tr>
              <th />
              <th>1Y</th>
              <th>3Y</th>
              <th>5Y</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>This basket</td>
              {retRows.map(([k, v]) => (
                <td key={k} className={v >= 0 ? "up" : "down"}>
                  <b>{pct(v, 1)}</b>
                </td>
              ))}
            </tr>
            <tr>
              <td>Category average</td>
              {retRows.map(([k, , a]) => (
                <td key={k}>{pct(a, 1)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mf-small-idp">
          {retMode === "lump" ? "Annualised, for a lumpsum held the whole period." : "Annualised (XIRR), for a monthly SIP over the period."} Each figure is the
          funds&rsquo; own, weighted by their share. Past performance does not predict future returns.
        </p>
      </Fold>

      <Fold
        title="Compare with Nifty 50"
        defaultOpen={false}
        summary={
          <>
            <b className={blend.mine[1] - NIFTY50.r3 >= 0 ? "up" : "down"}>{pct(blend.mine[1] - NIFTY50.r3, 1)}</b> a year over 3 years
          </>
        }
      >
        <BasketCompare basket={basket} range={cmpRange} onRange={setCmpRange} />
      </Fold>

      <ReturnCalculator fund={basketAsFund(basket)} subject="basket" />

      {/* Who made it: the same rows a fund page uses for its managers; a tap opens the researcher's sheet. */}
      <Fold title="Researchers" summary={`${RESEARCHERS.length} at SAHI Research`} defaultOpen={false}>
        <div className="mgr-list">
          <small>Picked by</small>
          {RESEARCHERS.map((r) => (
            <button key={r.name} className="mgr-row" onClick={() => setSheetFor(r.name)}>
              <ManagerAvatar name={r.name} photo={r.photo} />
              <span className="mgr-text">
                <b>{r.name}</b>
                <small className="vb-line">
                  <VerifiedBadge size={14} animate />
                  {r.role}
                </small>
              </span>
              <Icon name="caret-right" size={16} />
            </button>
          ))}
        </div>
        {sheetFor && (
          <ResearcherSheet
            start={sheetFor}
            onClose={() => setSheetFor(null)}
            renderOthers={() => (
              <ul className="ms-baskets">
                {baskets
                  .filter((other) => other.id !== basket.id)
                  .map((other) => {
                    const o3 = blended3Y(other);
                    return (
                      <li key={other.id}>
                        <button
                          className="ms-bk"
                          onClick={() => {
                            setSheetFor(null);
                            push({ name: "basket", basketId: other.id });
                          }}
                        >
                          <LogoStack basket={other} size={28} />
                          <span className="ms-bk-text">
                            <b>{other.name}</b>
                            <small>
                              <span className={o3 >= 0 ? "up" : "down"}>{pct(o3, 1).replace("+", "")}</span> a year over 3 years
                            </small>
                          </span>
                          <Icon name="caret-right" size={16} />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          />
        )}
        <p className="mf-small-idp">
          Reviewed {REVIEWED}, next review {NEXT_REVIEW}. A basket is the research team&rsquo;s view, not advice made for you.
        </p>
      </Fold>

      <Fold title="Charges" summary={`${basketCost(basket).toFixed(2)}% a year`} defaultOpen={false}>
        <div className="mf-facts-idp">
          <Row label="Minimum one-time" value={inr(basketMin(basket, "lump"))} />
          <Row label="Cost a year" value={`${basketCost(basket).toFixed(2)}%, each fund's own cost weighted by its share. Charged daily from each fund's NAV.`} />
          {list.map(({ fund }, i) => (
            <Row key={`${fund.id}-${i}`} label={`Exit load, ${fund.name}`} value={fund.exitLoad} />
          ))}
        </div>
        <p className="mf-small-idp">The minimum is the smallest amount that meets every fund&rsquo;s own minimum at these shares.</p>
      </Fold>

      <Fold title="Riskometer" summary={risk} defaultOpen={false}>
        <div className="risk-top bk-risk-idp">
          <Riskometer risk={risk} compact />
          <div className="risk-text">
            <b>{risk}</b>
          </div>
        </div>
        <p className="risk-why">
          A mix is as risky as its riskiest fund. Here that is {riskiest.fund.name}, at {riskiest.fund.risk.toLowerCase()} risk.
        </p>
      </Fold>

      <p className="mf-small-idp mf-source-idp">Star ratings by Value Research.</p>
      <p className="mf-small-idp bk-limits-idp">
        A basket is a set of funds our research team chose to sit together. It isn&rsquo;t advice made for you, so check that it fits your goal and how much
        risk you can take. Past returns aren&rsquo;t a promise. The past 3 years is each fund&rsquo;s own figure, weighted by its share.
      </p>
      <Disclaimer />
    </Screen>
  );
}
