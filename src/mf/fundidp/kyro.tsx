import "./kyro.css";
import { useEffect, useRef, useState } from "react";
import { asset } from "../../assets";
import type { Fund } from "../data";
import { inr } from "./format";
import { DlsBadge, type BadgeTone } from "../../ui/dls";
import { BottomSheet } from "./Sheet";

/* Kyro on the fund page: a card with Kyro's one-paragraph read of this fund, and a row of chips. "Ask Kyro" opens the
   Kyro sheet empty; each suggestion chip opens it with that question already asked and answered. Everything Kyro says
   here is worked out from the fund's own published numbers (returns against the category, risk, costs, SIP minimum,
   tax), so it stays about mutual funds and never invents a figure. Card look: Base Design System, node 6722:77370. */

export const MARK = asset("kyro-mark-idp.svg");
const ARROW = asset("kyro-arrow-up-right.svg");
export const GLOW = asset("kyro-star-glow.svg");

// The ↗ as a mask, so it takes the text colour of whatever it sits in (dark on the light card, white on the dark one).
export const Arrow = () => <i className="kyro-arrow" style={{ WebkitMaskImage: `url("${ARROW}")`, maskImage: `url("${ARROW}")` }} aria-hidden="true" />;

const one = (n: number) => n.toFixed(1);
const cat = (f: Fund) => (f.catLabel.split("·").pop() ?? f.catLabel).trim(); // "Small Cap", "Defence", "Gold"
// Lower case for mid-sentence use, keeping acronyms ("ELSS", "IT", "AI") as they are.
// Theme names are proper names ("Defence", "Healthcare") and stay as written.
const catLow = (f: Fund) => (f.cat === "theme" ? cat(f) : cat(f).replace(/\b(?![A-Z]{2,}\b)\w+/g, (w) => w.toLowerCase()));
const an = (word: string) => (/^[AEIOU]/i.test(word) ? `an ${word}` : `a ${word}`); // "an IT fund", "a Defence fund"
// Funds that buy US shares: the rupee-dollar rate moves their returns too.
const abroad = (f: Fund) => /Nasdaq|Russell|S&P|U\.S\.|\bUS\b/.test(`${f.benchmark} ${f.name}`);
const catSentence = (f: Fund) => catLow(f).charAt(0).toUpperCase() + catLow(f).slice(1); // "Small cap", "ELSS"
const isEquity = (f: Fund) => f.catLabel.startsWith("Equity") || f.cat === "theme";
const lead1 = (f: Fund) => f.r1 - f.avg[0];
const lead3 = (f: Fund) => f.r3 - f.avg[1];
const ageYears = (f: Fund) => Math.floor((Date.now() - Date.parse(f.launched)) / (365.25 * 24 * 3600 * 1000));

// The situation a fund is in decides what Kyro talks about: a liquid fund is about parking cash, an ELSS about tax and
// the lock-in, a theme fund about concentration, an index fund about cost, a small cap about the swings.
type Kind = "smallmid" | "flexi" | "large" | "index" | "elss" | "theme" | "metal" | "liquid" | "debt";
function kindOf(f: Fund): Kind {
  switch (f.cat) {
    case "small":
    case "mid":
      return "smallmid";
    case "large":
      return "large";
    case "index":
      return "index";
    case "elss":
      return "elss";
    case "theme":
      return "theme";
    case "gold":
      return "metal";
    case "liquid":
      return "liquid";
    case "debt":
      return "debt";
    default:
      return "flexi";
  }
}

// How long money should stay in, by SEBI risk level.
function horizon(f: Fund): string {
  if (f.risk === "Very High" || f.risk === "High") return "7 years or more";
  if (f.risk === "Moderately High") return "5 years or more";
  if (f.risk === "Moderate") return "1 to 3 years";
  return "a few days to a few months";
}

function costWord(f: Fund): string {
  if (f.expense < 0.75) return "on the low side";
  if (f.expense < 1.25) return "about average";
  return "on the high side";
}

// "4.7 points a year ahead of the small cap average" / "in line with …" / "1.2 points a year behind …"
function standing(f: Fund): string {
  const lead = lead3(f);
  if (Math.abs(lead) < 0.5) return `in line with the ${catLow(f)} average`;
  return `${one(Math.abs(lead))} points a year ${lead > 0 ? "ahead of" : "behind"} the ${catLow(f)} average`;
}

// A turn in the last year worth flagging: ahead over 3 years but slower lately, or behind but picking up.
function momentum(f: Fund): string {
  if (lead3(f) > 0.5 && lead1(f) < -1) return ` The last year has been slower than peers, ${one(f.r1)}% against ${one(f.avg[0])}%.`;
  if (lead3(f) < -0.5 && lead1(f) > 1) return ` It has picked up in the last year, ${one(f.r1)}% against ${one(f.avg[0])}%.`;
  return "";
}

// Buying rules come first: they change what the person can do today.
function buyLine(f: Fund): string {
  if (f.buy === "halted") return "The fund house has paused new money here for now; SIPs already running carry on. ";
  if (f.buy === "sip-only") return "The fund house has closed one-time buys; you can still come in through a SIP. ";
  if (f.buy === "restricted") return `${f.buyNote ?? "This fund can't be bought here right now."} `;
  return "";
}

// One fact tag on the heading row, from the fund's own data (never a rating). The one that most sets this fund apart
// wins: where its 3-year return sits against the category (0.5 points or more either way), else its cost when that
// stands out (under 0.75% low, 1.25% and up high), else its SEBI risk level. Risk comes last because the header
// already states it and most equity funds share "Very High".
export function kyroTag(f: Fund): { label: string; tone: BadgeTone } {
  const lead = lead3(f);
  if (lead >= 0.5) return { label: "Beats Category", tone: "positive" };
  if (lead <= -0.5) return { label: "Trails Category", tone: "attentive" };
  if (f.expense < 0.75) return { label: "Low Cost", tone: "positive" };
  if (f.expense >= 1.25) return { label: "High Cost", tone: "attentive" };
  const tone: BadgeTone =
    f.risk === "Very High" || f.risk === "High" ? "negative" : f.risk === "Low" || f.risk === "Low to Moderate" ? "positive" : "attentive";
  return { label: `${f.risk} Risk`, tone }; // risk levels are already title case: "Very High", "Low to Moderate"
}

// Kyro's Insight: two or three sentences on what matters for THIS fund's situation, worked out from its own numbers.
export function kyroRead(f: Fund): string {
  const r3 = `${one(f.r3)}% a year over 3 years`;
  const young = ageYears(f) < 5 ? ` With ${ageYears(f)} years of history, there's no 5-year record yet.` : "";
  const body = (() => {
    switch (kindOf(f)) {
      case "smallmid":
        return `Returned ${r3}, ${standing(f)}.${momentum(f)} ${catSentence(f)} funds can fall sharply in a bad year and take time to recover, so this is money to leave for 7 years or more.`;
      case "flexi":
        return `Returned ${r3}, ${standing(f)}.${momentum(f)} The manager can move between large, mid and small companies, so it can work as the one core fund in a portfolio. Its ${f.expense}% cost is ${costWord(f)}.`;
      case "large":
        return `Returned ${r3}, ${standing(f)}.${momentum(f)} Large caps swing less than mid and small caps, but many struggle to beat a Nifty 50 index fund that costs far less; this one charges ${f.expense}% a year.`;
      case "index":
        return `Tracks the Nifty 50, so it aims to match the market, not beat it: ${r3}. With index funds the cost is what you choose on, and ${f.expense}% a year is ${f.expense <= 0.25 ? "about as low as it gets" : costWord(f)}.`;
      case "elss":
        return `Saves tax under Section 80C (old tax regime), with every investment locked in for 3 years. Returned ${r3}, ${standing(f)}.${momentum(f)} With a SIP, each instalment unlocks 3 years after it went in.`;
      case "theme":
        return `Puts all its money into one theme, ${f.theme ?? cat(f)}, so it swings harder than a diversified fund. Returned ${r3}, ${standing(f)}.${momentum(f)}${young}${
          abroad(f) ? " It buys US shares, so the rupee-dollar rate moves your returns too." : ""
        } Best kept as a small add-on next to a core fund.`;
      case "metal": {
        const metal = catLow(f);
        const rally = f.r1 > f.r3 + 5 ? ` Up ${one(f.r1)}% in the last year, far above its ${r3}, so don't plan on that repeating.` : ` Returned ${r3}.`;
        // Gold steadies a portfolio; silver is half precious metal, half industrial input, so it swings more.
        const nature =
          metal === "gold"
            ? "which doesn't grow like a business but tends to hold up when stocks fall"
            : `which moves with factory demand as well as with gold, so it swings more than gold does`;
        const role = metal === "gold" ? "It works as a small hedge, not a growth engine." : "Keep it a small slice, next to gold rather than in place of it.";
        return `Follows the price of ${metal}, ${nature}.${rally} ${role}`;
      }
      case "liquid":
        return `Built for parking cash you'll need soon: ${r3}, with ${f.risk.toLowerCase()} risk. Withdrawals usually reach your bank the next working day, and at ${f.expense}% a year it costs very little to hold.`;
      case "debt":
        return `Lends to the government and companies for short periods, so it's far steadier than equity: ${r3}. Suits money you'll need in 1 to 3 years. Gains are taxed at your income-tax slab.`;
    }
  })();
  return (buyLine(f) + body).replace(/\s+/g, " ").trim();
}

type Prompt = { id: string; q: string; a: string };

const sipAnswer = (f: Fund) =>
  f.buy === "halted"
    ? "The fund house has paused new money into this fund, so you can't start a SIP or buy one-time right now. SIPs that were already running carry on."
    : `A SIP suits this fund: the minimum is ${inr(f.minSip)} a month. ${
        f.risk === "Very High" || f.risk === "High"
          ? "It swings a lot, so buying a little every month evens out the price you pay across good and bad months."
          : "Buying every month also evens out the price you pay."
      } Plan to stay invested for ${horizon(f)}.`;

const compareAnswer = (f: Fund) => {
  const lead = lead3(f);
  return `Over 3 years it returned ${one(f.r3)}% a year against the ${catLow(f)} average of ${one(f.avg[1])}%, ${
    lead >= 0 ? `${one(lead)} points ahead` : `${one(-lead)} points behind`
  }.${ageYears(f) >= 5 ? ` Over 5 years: ${one(f.r5)}% against ${one(f.avg[2])}%.` : ""} Past returns don't promise future ones.`;
};

const compareQ = (f: Fund) => (lead3(f) >= 0 ? "Why is it ahead of its category?" : "Why is it behind its category?");

// The three chips, picked for the fund's situation. Each carries its own answer, so a tap answers exactly what it asked.
export function kyroPrompts(f: Fund): Prompt[] {
  const C = catSentence(f);
  switch (kindOf(f)) {
    case "smallmid":
      return [
        {
          id: "fall",
          q: "What if it falls 30% after I invest?",
          a: `${C} funds have fallen that much in bad years and taken a year or two to recover. If you're investing through a SIP, a fall means your instalments buy more units cheaply. What hurts is selling in the fall, so only put in money you can leave for 7 years or more.`,
        },
        {
          id: "vsflexi",
          q: `${C} or flexi cap for me?`,
          a: `A flexi cap fund spreads across large, mid and small companies and swings less, so it suits most people as the main fund. A ${catLow(f)} fund can grow faster but falls harder; it works best as a smaller part next to a flexi cap or index fund.`,
        },
        f.buy === "sip-only"
          ? { id: "siponly", q: "Why can I only invest by SIP?", a: `The fund house has stopped one-time buys, usually to slow money coming in when ${catLow(f)} stocks are hard to buy in size. A SIP from ${inr(f.minSip)} a month is still open.` }
          : { id: "sip", q: "Should I start a SIP here?", a: sipAnswer(f) },
      ];
    case "flexi":
      return [
        { id: "enough", q: "Is one flexi cap fund enough?", a: `For many people, yes: a flexi cap fund already spreads across large, mid and small companies, and its manager shifts between them. A second flexi cap fund mostly repeats the same stocks; if you want more, an index fund or a small slice of a mid or small cap fund adds something different.` },
        { id: "sip", q: "Should I start a SIP here?", a: sipAnswer(f) },
        { id: "compare", q: compareQ(f), a: compareAnswer(f) },
      ];
    case "large":
      return [
        { id: "vsindex", q: "Large cap fund or Nifty 50 index fund?", a: `A Nifty 50 index fund holds the same kind of companies for about 0.2% a year and simply matches the market. This fund charges ${f.expense}% and has to beat the market by more than the difference to be worth it. Over 3 years it was ${standing(f)}.` },
        { id: "sip", q: "Should I start a SIP here?", a: sipAnswer(f) },
        { id: "compare", q: compareQ(f), a: compareAnswer(f) },
      ];
    case "index":
      return [
        { id: "vsactive", q: "Index fund or active fund?", a: "An index fund copies the Nifty 50, so you get the market's return minus a small cost, with no risk of a manager getting it wrong. An active fund can beat the market, or lag it, and charges more. Many people keep an index fund as the core and add active funds around it." },
        { id: "pick", q: "Why this Nifty 50 fund over others?", a: `Every Nifty 50 fund holds the same 50 companies, so the differences are small: cost, and how closely it follows the index. This one costs ${f.expense}% a year and returned ${one(f.r3)}% a year over 3 years, against ${one(f.avg[1])}% for index funds on average.` },
        { id: "sip", q: "Should I start a SIP here?", a: sipAnswer(f) },
      ];
    case "elss":
      return [
        { id: "tax", q: "How much tax can I save?", a: "Under the old tax regime, up to ₹1.5 lakh a year in ELSS counts under Section 80C. In the 30% slab that saves up to ₹46,800 including cess. The new tax regime has no 80C deduction, so there it's just an equity fund with a lock-in." },
        { id: "lock", q: "How does the 3-year lock-in work with SIPs?", a: "Each instalment is locked for 3 years from the day it went in. So a SIP started in April unlocks month by month, three years later; the last instalment is the last to free up." },
        { id: "ppf", q: "ELSS or PPF?", a: "Both count under 80C. PPF pays a fixed, government-backed rate but locks money for 15 years. ELSS invests in shares, so it can grow more and can fall, and locks for only 3 years, the shortest of the 80C options." },
      ];
    case "theme": {
      const t = f.theme ?? C;
      return [
        { id: "howmuch", q: `How much should go into ${an(t)} fund?`, a: `Keep it a small slice of your equity money, after a diversified core fund like a flexi cap or index fund. ${an(t).charAt(0).toUpperCase() + an(t).slice(1)} fund rises and falls with one part of the economy, so if it's a big part of your money, one bad stretch for ${t} hurts everything.` },
        { id: "cools", q: `What if the ${t} theme cools off?`, a: `Themes run in cycles: ${an(t)} fund can lag the wider market for years after a strong run. It returned ${one(f.r3)}% a year over 3 years; if you invest, be ready to hold through a slow patch, ideally 7 years or more.` },
        { id: "vsdiversified", q: "Thematic or diversified fund?", a: "A diversified fund spreads across sectors, so one weak sector doesn't sink it; it suits most money. A thematic fund is a deliberate bet on one area. Start with the diversified fund, and add a theme only if you believe in it for the long run." },
      ];
    }
    case "metal": {
      const m = catLow(f);
      return [
        {
          id: "why",
          q: `Why invest in ${m}?`,
          a:
            m === "gold"
              ? "Gold doesn't earn profits like a company, so over long periods it grows slower than shares. People hold a little because it often holds up when stock markets fall, which steadies a portfolio."
              : "Silver is used in industry (solar panels, electronics) as well as held like gold, so it can run up fast when both kinds of demand rise, and fall just as fast. People who hold it keep it small, usually alongside gold.",
        },
        { id: "physical", q: `${C} fund or physical ${m}?`, a: `A fund has no making charges, purity or storage worries, and you can buy from ${inr(f.minSip)}. You pay ${f.expense}% a year to hold it. Physical ${m} has no yearly fee but costs more to buy and sell.` },
        f.buy === "halted"
          ? { id: "halted", q: "Can I still invest in this fund?", a: sipAnswer(f) }
          : { id: "late", q: "Is it too late after this rally?", a: `It returned ${one(f.r1)}% in the last year against ${one(f.r3)}% a year over 3 years, so prices have run up fast. Nobody can time it; if you want some ${m}, a SIP spreads your buying instead of putting it all in at today's price.` },
      ];
    }
    case "liquid":
      return [
        { id: "savings", q: "Is this better than a savings account?", a: `It usually earns more than a savings account (${one(f.r1)}% over the last year here), but the return isn't fixed and isn't covered by deposit insurance. It suits cash you want to keep handy but don't need every day.` },
        { id: "withdraw", q: "How fast can I take my money out?", a: `A withdrawal placed on a working day usually reaches your bank the next working day. Exit load: ${f.exitLoad}` },
        { id: "safe", q: "Is my money safe here?", a: `It lends only for up to 91 days to the government and large companies, which keeps the risk ${f.risk.toLowerCase()}. It isn't guaranteed, but its value rarely dips, even for a day.` },
      ];
    case "debt":
      return [
        { id: "fd", q: "Is this better than an FD?", a: `An FD's rate is fixed and insured up to ₹5 lakh. This fund isn't, but it returned ${one(f.r3)}% a year over 3 years and you can withdraw any time without breaking anything. Both are taxed at your slab rate.` },
        { id: "rates", q: "What happens if interest rates change?", a: "When rates rise, the bonds it holds lose a little value, so its NAV can dip for a while; when rates fall, it gains. Because it lends for short periods, these moves are small." },
        { id: "tax", q: "How is this taxed?", a: "Gains are added to your income and taxed at your slab rate, however long you hold it." },
      ];
  }
}

// A typed question: a chip's own question gets its answer; otherwise the topic decides (SIP, risk, returns, cost, tax),
// and anything else gets the insight.
function answerFor(f: Fund, q: string): string {
  const chip = kyroPrompts(f).find((p) => p.q === q);
  if (chip) return chip.a;
  const t = q.toLowerCase();
  if (t.includes("sip") || t.includes("invest")) return sipAnswer(f);
  if (t.includes("risk") || t.includes("safe") || t.includes("lose") || t.includes("fall")) {
    return `SEBI rates it ${f.risk} risk. ${
      isEquity(f)
        ? `${catSentence(f)} funds can fall sharply in a bad year and take a while to recover.`
        : "Its value moves less than an equity fund's, but it can still dip."
    } Only put in money you won't need for ${horizon(f)}.`;
  }
  if (t.includes("categor") || t.includes("ahead") || t.includes("behind") || t.includes("compare") || t.includes("return")) return compareAnswer(f);
  if (t.includes("expense") || t.includes("cost") || t.includes("fee") || t.includes("charge") || t.includes("exit")) {
    return `It costs ${f.expense}% a year, taken from the fund's value, which is ${costWord(f)} for a ${catLow(f)} fund. Exit load: ${f.exitLoad}`;
  }
  if (t.includes("tax")) {
    return isEquity(f)
      ? "Sell within a year and gains are taxed at 20%. After a year, gains above ₹1.25 lakh in a financial year are taxed at 12.5%."
      : "Gains are added to your income and taxed at your slab rate.";
  }
  return kyroRead(f);
}

// The insight prints in, word by word, when the page opens: a short beat while the chart draws, then about 45 ms a
// word with a blinking cursor at the end. Every word holds its place from the start (hidden, not absent), so the card
// never changes height while it prints. Reduced motion: the whole text at once.
const PRINT_DELAY = 500;
const PRINT_STEP = 45;

export function PrintedRead({ text, onDone }: { text: string; onDone: () => void }) {
  const words = text.split(" ");
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(still ? words.length : 0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (still) {
      setShown(words.length);
      done.current();
      return;
    }
    setShown(0);
    let n = 0;
    let tick: number | undefined;
    const start = window.setTimeout(() => {
      tick = window.setInterval(() => {
        n += 1;
        setShown(n);
        if (n >= words.length) {
          window.clearInterval(tick);
          done.current();
        }
      }, PRINT_STEP);
    }, PRINT_DELAY);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, [text, still, words.length]);
  const printing = shown < words.length;
  return (
    <p className="kyro-read">
      <span className="kyro-sr">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i}>
            <span className={i < shown ? "kyro-w on" : "kyro-w"}>{w}</span>
            {printing && i === Math.max(shown - 1, 0) && <i className="kyro-cursor" />}{" "}
          </span>
        ))}
      </span>
    </p>
  );
}

export function KyroCard({ fund, onAsk }: { fund: Fund; onAsk: (question?: string) => void }) {
  const [printed, setPrinted] = useState(false);
  return (
    <section className={`kyro-card${printed ? " printed" : ""}`} aria-labelledby="kyro-take">
      <img className="kyro-glow a" src={GLOW} alt="" aria-hidden="true" draggable={false} />
      <img className="kyro-glow b" src={GLOW} alt="" aria-hidden="true" draggable={false} />
      {/* Heading: "Kyro's Insight" (an insight, not a verdict or a suggestion, so it never reads as advice), plain text;
          the one Kyro mark is on the Ask Kyro chip. The fact tag sits top right. The tag and chips arrive once the
          insight has printed. */}
      <div className="kyro-head">
        <h3 id="kyro-take" className="kyro-title">
          Kyro&rsquo;s Insight
        </h3>
        <DlsBadge {...kyroTag(fund)} />
      </div>
      <PrintedRead text={kyroRead(fund)} onDone={() => setPrinted(true)} />
      <div className="kyro-chips" inert={!printed}>
        <button className="kyro-chip" onClick={() => onAsk()}>
          <img src={MARK} alt="" width={16} height={16} draggable={false} />
          Ask Kyro
        </button>
        {kyroPrompts(fund).map((p) => (
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

export function KyroSheet({ fund, question, onClose }: { fund: Fund; question?: string; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>(() => (question ? [{ q: question, a: answerFor(fund, question) }] : []));
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const asked = new Set(turns.map((t) => t.q));
  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setTurns((list) => [...list, { q: text, a: answerFor(fund, text) }]);
    setDraft("");
  };
  // After a new question, scroll the sheet's own body to the answer. Not scrollIntoView: that also scrolls every
  // ancestor, the app frame included, and can push the whole page out of view.
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
    <BottomSheet title="Ask Kyro" sub={fund.name} onClose={onClose}>
      <div className="kyro-sheet">
        {turns.length === 0 && (
          <div className="kyro-turn">
            <span className="kyro-by">
              <img src={MARK} alt="Kyro" width={20} height={20} draggable={false} />
            </span>
            <p>Ask me about this fund: its returns, risk, costs, SIP or tax. I answer from the fund&rsquo;s own numbers.</p>
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
          {kyroPrompts(fund)
            .filter((p) => !asked.has(p.q))
            .map((p) => (
              <button key={p.id} className="kyro-sheet-chip" onClick={() => ask(p.q)}>
                {p.q}
              </button>
            ))}
        </div>
        <p className="kyro-note">Kyro explains this fund&rsquo;s published numbers. It isn&rsquo;t investment advice.</p>
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
          placeholder="Ask about this fund"
          aria-label="Ask Kyro about this fund"
          autoComplete="off"
        />
        <button type="submit" className="kyro-send" disabled={!draft.trim()} aria-label="Send">
          <Arrow />
        </button>
      </form>
    </BottomSheet>
  );
}
