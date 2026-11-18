// Kyro on the basket page: the same card as on the fund page (Kyro's Insight, a fact tag, a printed read and question
// chips) and the same "Ask Kyro" sheet, with everything worked out from the basket's own numbers: its funds and their
// shares, the blended 3-year return against the Nifty 50, how much sits in shares versus debt or gold, its cost,
// minimum SIP and suggested holding period. It never invents a figure.
import { useEffect, useRef, useState } from "react";
import "../fundidp/kyro.css";
import { DlsBadge, type BadgeTone } from "../../ui/dls";
import { Arrow, GLOW, MARK, PrintedRead } from "../fundidp/kyro";
import { BottomSheet } from "../fundidp/Sheet";
import { inr } from "../fundidp/format";
import { basketBuyState, basketCost, basketFunds, basketMin, basketRisk, blended3Y, NIFTY50, riskLabel, type Basket } from "./data";

const one = (n: number) => n.toFixed(1);
const short = (name: string) => name.replace(/ Fund$/, "");

// Share of the basket in each kind of holding, from each fund's category.
function mix(basket: Basket) {
  let shares = 0;
  let debt = 0;
  let metal = 0;
  for (const { fund, weight } of basketFunds(basket)) {
    if (fund.cat === "debt" || fund.cat === "liquid") debt += weight;
    else if (fund.cat === "gold") metal += weight;
    else shares += weight;
  }
  return { shares, debt, metal };
}

const lead = (b: Basket) => blended3Y(b) - NIFTY50.r3;

// "4.2 points a year ahead of the Nifty 50" / "in line with …" / "1.1 points a year behind …"
function standing(b: Basket): string {
  const l = lead(b);
  if (Math.abs(l) < 0.5) return `in line with the ${NIFTY50.name}`;
  return `${one(Math.abs(l))} points a year ${l > 0 ? "ahead of" : "behind"} the ${NIFTY50.name}`;
}

// The cushion: what in the basket isn't company shares.
function cushion(b: Basket): string {
  const { shares, debt, metal } = mix(b);
  const parts = [debt ? `${debt}% in debt` : "", metal ? `${metal}% in gold` : ""].filter(Boolean).join(" and ");
  return parts
    ? `${shares}% is in company shares and ${parts}, which tends to soften the falls.`
    : "All of it is in company shares, so expect big ups and downs along the way.";
}

export function basketTag(b: Basket): { label: string; tone: BadgeTone } {
  const l = lead(b);
  if (l >= 0.5) return { label: "Beats Nifty 50", tone: "positive" };
  if (l <= -0.5) return { label: "Trails Nifty 50", tone: "attentive" };
  if (basketCost(b) < 0.75) return { label: "Low Cost", tone: "positive" };
  return { label: riskLabel(basketRisk(b)).replace(/\b\w/g, (c) => c.toUpperCase()), tone: "attentive" };
}

function buyLine(b: Basket): string {
  const buy = basketBuyState(b);
  if (buy.state === "paused") return `${buy.fund?.name ?? "One of its funds"} isn't taking new money right now, so this basket can't be started until it reopens. `;
  if (buy.state === "sip-only") return `${buy.fund?.name ?? "One of its funds"} has stopped one-time buys, so this basket can only be started as a SIP. `;
  return "";
}

// Kyro's Insight, kept to three lines: how it has done against the Nifty 50, then what steadies it and how long to
// give it. The funds and their shares are listed right below in "What's inside", so they aren't repeated here.
export function basketRead(b: Basket): string {
  const buy = basketBuyState(b);
  const name = buy.fund ? short(buy.fund.name) : "One of its funds";
  if (buy.state === "paused") return `Can't be started right now: ${name} isn't taking new money. Give it ${b.years === 1 ? "a year" : `${b.years} years`} or more once it reopens.`;
  const l = lead(b);
  const vs = Math.abs(l) < 0.5 ? `in line with the ${NIFTY50.name}` : `${one(Math.abs(l))} points ${l > 0 ? "ahead of" : "behind"} the ${NIFTY50.name}`;
  const { shares, debt, metal } = mix(b);
  const steady =
    shares === 100
      ? "All in shares, so expect big swings"
      : shares === 0
        ? "No shares at all, so it moves far less"
        : `${[debt ? `${debt}% in debt` : "", metal ? `${metal}% in gold` : ""].filter(Boolean).join(" and ")} softens the falls`;
  const sipOnly = buy.state === "sip-only" ? " SIP only for now." : "";
  const hold = b.years === 1 ? "a year" : `${b.years} years`;
  return `Returned ${one(blended3Y(b))}% a year over 3 years, ${vs}. ${steady}; give it ${hold} or more.${sipOnly}`;
}

type Prompt = { id: string; q: string; a: string };

const sipAnswer = (b: Basket) => {
  const buy = basketBuyState(b);
  if (buy.state === "paused") return buyLine(b).trim();
  return `The minimum is ${inr(basketMin(b, "sip"))} a month, split across the ${b.funds.length} funds by their shares. ${
    mix(b).shares >= 70 ? "Most of it is in shares, so buying a little every month evens out the price you pay across good and bad months." : "Buying every month also evens out the price you pay."
  } Plan to stay invested for ${b.years} years or more.`;
};

export function basketPrompts(b: Basket): Prompt[] {
  const { shares } = mix(b);
  return [
    { id: "why", q: "Why these funds together?", a: b.how.join(" ") },
    {
      id: "fall",
      q: "What if markets fall 20%?",
      a: `${shares}% of this basket is in company shares, so as a rough guide a 20% fall in shares would pull it down by about ${Math.round(shares * 0.2)}%. ${
        shares < 100 ? "The rest moves far less, which is what softens the fall." : "Nothing in it is there to cushion the fall."
      } Falls like that have recovered in the past, but it can take a year or more; that is why this basket asks for ${b.years} years.`,
    },
    { id: "sip", q: "Should I start a SIP here?", a: sipAnswer(b) },
  ];
}

// A typed question: a chip's own question gets its answer, else the topic decides, else the insight.
function answerFor(b: Basket, q: string): string {
  const chip = basketPrompts(b).find((p) => p.q === q);
  if (chip) return chip.a;
  const t = q.toLowerCase();
  if (t.includes("sip") || t.includes("invest") || t.includes("start")) return sipAnswer(b);
  if (t.includes("fall") || t.includes("risk") || t.includes("safe") || t.includes("lose")) return basketPrompts(b)[1].a;
  if (t.includes("why") || t.includes("fund") || t.includes("together") || t.includes("pick")) return b.how.join(" ");
  if (t.includes("cost") || t.includes("expense") || t.includes("fee") || t.includes("charge")) {
    return `It costs ${basketCost(b).toFixed(2)}% a year: each fund's own cost, weighted by its share. It's taken from each fund's value, not charged separately.`;
  }
  if (t.includes("return") || t.includes("nifty") || t.includes("compare")) {
    return `Over 3 years it returned ${one(blended3Y(b))}% a year, ${standing(b)} (${one(NIFTY50.r3)}%). Past returns don't promise future ones.`;
  }
  return basketRead(b);
}

export function BasketKyroCard({ basket, onAsk }: { basket: Basket; onAsk: (question?: string) => void }) {
  const [printed, setPrinted] = useState(false);
  return (
    <section className={`kyro-card${printed ? " printed" : ""}`} aria-labelledby="kyro-take">
      <img className="kyro-glow a" src={GLOW} alt="" aria-hidden="true" draggable={false} />
      <img className="kyro-glow b" src={GLOW} alt="" aria-hidden="true" draggable={false} />
      <div className="kyro-head">
        <h3 id="kyro-take" className="kyro-title">
          Kyro&rsquo;s Insight
        </h3>
        <DlsBadge {...basketTag(basket)} />
      </div>
      <PrintedRead text={basketRead(basket)} onDone={() => setPrinted(true)} />
      <div className="kyro-chips" inert={!printed}>
        <button className="kyro-chip" onClick={() => onAsk()}>
          <img src={MARK} alt="" width={16} height={16} draggable={false} />
          Ask Kyro
        </button>
        {basketPrompts(basket).map((p) => (
          <button key={p.id} className="kyro-chip" onClick={() => onAsk(p.q)}>
            {p.q}
            <Arrow />
          </button>
        ))}
      </div>
    </section>
  );
}

type Turn = { q: string; a: string };

export function BasketKyroSheet({ basket, question, onClose }: { basket: Basket; question?: string; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>(() => (question ? [{ q: question, a: answerFor(basket, question) }] : []));
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const asked = new Set(turns.map((t) => t.q));
  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setTurns((list) => [...list, { q: text, a: answerFor(basket, text) }]);
    setDraft("");
  };
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const body = end.current?.closest(".sheet-body");
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <BottomSheet title="Ask Kyro" sub={basket.name} onClose={onClose}>
      <div className="kyro-sheet">
        {turns.length === 0 && (
          <div className="kyro-turn">
            <span className="kyro-by">
              <img src={MARK} alt="Kyro" width={20} height={20} draggable={false} />
            </span>
            <p>Ask me about this basket: its funds, returns, risk, cost or SIP. I answer from the basket&rsquo;s own numbers.</p>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="kyro-pair">
            <p className="kyro-q">{t.q}</p>
            <div className="kyro-turn">
              <span className="kyro-by">
                <img src={MARK} alt="Kyro" width={20} height={20} draggable={false} />
              </span>
              <p>{t.a}</p>
            </div>
          </div>
        ))}
        <div className="kyro-sheet-chips">
          {basketPrompts(basket)
            .filter((p) => !asked.has(p.q))
            .map((p) => (
              <button key={p.id} className="kyro-sheet-chip" onClick={() => ask(p.q)}>
                {p.q}
              </button>
            ))}
        </div>
        <p className="kyro-note">Kyro explains this basket&rsquo;s published numbers. It isn&rsquo;t investment advice.</p>
        <div ref={end} />
      </div>
      <form
        className="kyro-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          className="mf-text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this basket"
          aria-label="Ask Kyro about this basket"
          autoComplete="off"
        />
        <button type="submit" className="kyro-send" disabled={!draft.trim()} aria-label="Send">
          <Arrow />
        </button>
      </form>
    </BottomSheet>
  );
}
