// Researcher backed baskets: sample data and the arithmetic behind the basket screens.
// A basket is a fixed set of funds at fixed weights. Every figure shown for a basket is built
// from its funds' own (sample) figures, weighted by share, so nothing here is a second source of truth.

import { extraFunds, fundById, riskLevels, type Fund, type Risk } from "./data";
import { smoothPath } from "./format";

export const REVIEWED = "Oct 2026";
export const NEXT_REVIEW = "Jan 2027";

export type BasketFund = { id: string; weight: number; why: string };

export type Basket = {
  id: string;
  name: string;
  who: string; // one line on the card: who it is for
  whoShort: string;
  whyShort: string;
  seeking: string; // "Investors <seeking>, with <risk> risk."
  years: number; // suggested holding period
  funds: BasketFund[]; // weights add up to 100
  how: string[]; // why the research team built it this way
};

export const baskets: Basket[] = [
  {
    id: "starter-mix",
    name: "Starter mix",
    who: "For your first investment. Give it 3 years or more.",
    whoShort: "First-time investors",
    whyShort: "Low cost, softer dips",
    seeking: "starting out and seeking equity growth",
    years: 3,
    funds: [
      { id: "uti-nifty50", weight: 50, why: "Owns India's 50 biggest companies, at a low cost." },
      { id: "hdfc-flexi", weight: 30, why: "A manager who picks across company sizes." },
      { id: "hdfc-short-debt", weight: 20, why: "Loans of a few years. Moves less than shares." },
    ],
    how: [
      "Half follows the Nifty 50: India's biggest companies, at a low cost.",
      "A debt fund at 20% softens the dips, so a fall is easier to sit through.",
      "Three funds and no small companies, so there is little to track.",
    ],
  },
  {
    id: "steady-core",
    name: "Steady core",
    who: "For money you won't need for 5 years or more.",
    whoShort: "Long-term savers",
    whyShort: "Large companies only",
    seeking: "seeking steady growth from large companies",
    years: 5,
    funds: [
      { id: "hdfc-nifty50", weight: 40, why: "Owns India's 50 biggest companies, at a low cost." },
      { id: "icici-bluechip", weight: 30, why: "Large, long-established companies." },
      { id: "pp-flexi", weight: 30, why: "A manager who picks across company sizes." },
    ],
    how: [
      "Large companies form the base. Smaller ones are left out on purpose.",
      "Each fund owns large companies in a different way, so they don't repeat each other.",
      "Every fund has a record of 5 years or more.",
    ],
  },
  {
    id: "growth-mix",
    name: "Growth mix",
    who: "For goals 7 years or more away. Expect big ups and downs.",
    whoShort: "Growth seekers",
    whyShort: "Three company sizes",
    seeking: "seeking high growth from companies of every size",
    years: 7,
    funds: [
      { id: "jm-flexi", weight: 40, why: "The base: a manager who can move across company sizes." },
      { id: "mo-mid", weight: 30, why: "Mid-sized companies, which can grow faster than the biggest." },
      { id: "bandhan-small", weight: 30, why: "Smaller companies: the biggest swings, up and down." },
    ],
    how: [
      "Three company sizes, so no single bet decides the result.",
      "Smaller companies are kept to 30%, so one bad year doesn't sink the mix.",
      "Every fund has a record of 5 years or more.",
    ],
  },
  {
    id: "gold-cushion",
    name: "Shares with a gold cushion",
    who: "For 5 years or more. Gold often moves differently from shares.",
    whoShort: "Share + gold investors",
    whyShort: "Gold balances shares",
    seeking: "seeking growth from shares, with gold alongside",
    years: 5,
    funds: [
      { id: "hdfc-nifty50", weight: 50, why: "India's 50 biggest companies, at a low cost." },
      { id: "hdfc-flexi", weight: 30, why: "A manager who picks across company sizes." },
      { id: "sbi-gold", weight: 20, why: "Follows the gold price. Pays no interest or dividends." },
    ],
    how: [
      "Shares drive the growth. Gold, at 20%, gives the mix something else to lean on.",
      "Gold is held through a fund, so you don't buy or store the metal.",
      "Every fund has a record of 5 years or more.",
    ],
  },
  {
    id: "calm-money",
    name: "Calm money",
    who: "For money you may need in a year or two.",
    whoShort: "Short-term savers",
    whyShort: "Debt funds, calmer",
    seeking: "seeking a calmer place for money they may need soon",
    years: 1,
    funds: [
      { id: "hdfc-liquid", weight: 50, why: "Very short-term loans. Usually paid out by the next working day." },
      { id: "hdfc-short-debt", weight: 50, why: "Loans of a few years. Pays a bit more, and moves a bit more." },
    ],
    how: [
      "Two debt funds that lend for different lengths of time.",
      "Calmer, not risk-free: values can still dip.",
      "Every fund has a record of 5 years or more.",
    ],
  },
];

export const basketById = (id: string): Basket => baskets.find((b) => b.id === id) ?? baskets[0];

export type Researcher = {
  name: string;
  photo: string; // file in public/assets
  role: string;
  years: number;
  education: string[];
  background: string;
};

export const researchers: Researcher[] = [
  {
    name: "Mohit Kumar",
    photo: "researchers/mohit-kumar.jpg",
    role: "SEBI qualified researcher",
    years: 9,
    education: ["MBA, Finance", "NISM Series XV, Research Analyst"],
    background:
      "Leads SAHI Research's work on index and broad equity baskets. Before SAHI he followed large companies as an equity analyst.",
  },
  {
    name: "Jeevanshu Narang",
    photo: "researchers/jeevanshu-narang.jpg",
    role: "SEBI qualified researcher",
    years: 7,
    education: ["PGDM, Finance", "NISM Series XV, Research Analyst"],
    background:
      "Looks after the debt and hybrid funds at SAHI Research, and the risk checks on every basket. Earlier he worked on fixed income research.",
  },
];

// The index a basket is compared with (sample figures, annualised, dividends added back).
export const NIFTY_50 = { name: "Nifty 50", r1: 8.3, r3: 10.8, r5: 15.4 };

// ---- What a basket is made of ---------------------------------------------------------

export function basketFunds(basket: Basket): { fund: Fund; weight: number; why: string }[] {
  return basket.funds.map((f) => ({ fund: fundById(f.id), weight: f.weight, why: f.why }));
}

// Can it be started? One fund that has stopped taking money pauses the basket; one that only takes SIPs makes it SIP-only.
export type BasketAvailability = { state: "open" } | { state: "paused" | "sip-only"; fund: Fund };

export function basketAvailability(basket: Basket): BasketAvailability {
  const list = basketFunds(basket).map((f) => f.fund);
  const halted = list.find((f) => f.buy === "halted");
  if (halted) return { state: "paused", fund: halted };
  const sipOnly = list.find((f) => f.buy === "sip-only");
  return sipOnly ? { state: "sip-only", fund: sipOnly } : { state: "open" };
}

// Weighted 1Y / 3Y / 5Y return of the funds, and the same for their category averages.
export function basketReturns(basket: Basket): { mine: [number, number, number]; avg: [number, number, number] } {
  const list = basketFunds(basket);
  const blend = (pick: (f: Fund) => number[]) =>
    [0, 1, 2].map((i) => list.reduce((sum, x) => sum + (pick(x.fund)[i] * x.weight) / 100, 0)) as [number, number, number];
  return { mine: blend((f) => [f.r1, f.r3, f.r5]), avg: blend((f) => f.avg) };
}

export const basketReturn3Y = (basket: Basket) => basketReturns(basket).mine[1];

// A mix is as risky as its riskiest fund.
export function basketRisk(basket: Basket): Risk {
  return riskLevels[Math.max(...basketFunds(basket).map((f) => riskLevels.indexOf(f.fund.risk)))];
}

export const riskLabel = (risk: Risk) => `${risk.charAt(0)}${risk.slice(1).toLowerCase()} risk`;

// The smallest amount that meets every fund's own minimum at its share, rounded up to ₹100.
export function basketMinimum(basket: Basket, mode: "sip" | "lump"): number {
  const need = Math.max(
    ...basketFunds(basket).map((f) => ((mode === "sip" ? f.fund.minSip : f.fund.minLump) * 100) / f.weight),
  );
  return Math.ceil(need / 100) * 100;
}

// Weighted yearly cost, in per cent.
export const basketExpense = (basket: Basket) =>
  basketFunds(basket).reduce((sum, f) => sum + (f.fund.expense * f.weight) / 100, 0);

// Whole rupees per fund; any rounding left over goes to the first fund so the parts add up.
export function splitAmount(basket: Basket, amount: number): number[] {
  const parts = basket.funds.map((f) => Math.floor((amount * f.weight) / 100));
  parts[0] += amount - parts.reduce((a, b) => a + b, 0);
  return parts;
}

// The basket seen as one fund, for pieces that take a Fund (the return calculator).
export function basketAsFund(basket: Basket): Fund {
  const { mine } = basketReturns(basket);
  return {
    ...basketFunds(basket)[0].fund,
    name: basket.name,
    r1: mine[0],
    r3: mine[1],
    r5: mine[2],
    minSip: basketMinimum(basket, "sip"),
    minLump: basketMinimum(basket, "lump"),
  };
}

// "MBA, Finance" stays whole; "Certificate (Level 2), Research Analyst" splits after the bracket.
export function splitQualification(text: string): [string, string | null] {
  const m = text.match(/^(.*?\))\s*,\s*(.+)$/) ?? text.match(/^([^,]+),\s*(.+)$/);
  return m ? [m[1], m[2]] : [text, null];
}

// ---- Returns as a monthly SIP would have earned them ------------------------------------

// Yearly return as the funds' lumpsum figures say it, turned into what a monthly SIP over the same
// 1, 3 and 5 years would have earned (annualised). The lumpsum curve is interpolated between 1, 3 and 5 years.
const CURVE_YEARS = [0, 1, 3, 5];

function growthFactor(month: number, logs: number[]): number {
  const years = month / 12;
  for (let i = 1; i < CURVE_YEARS.length; i++) {
    if (years <= CURVE_YEARS[i]) {
      const t = (years - CURVE_YEARS[i - 1]) / (CURVE_YEARS[i] - CURVE_YEARS[i - 1]);
      return Math.exp(logs[i - 1] + (logs[i] - logs[i - 1]) * t);
    }
  }
  return Math.exp(logs[logs.length - 1]);
}

export function sipReturns([r1, r3, r5]: [number, number, number]): [number, number, number] {
  const logs = [0, -Math.log(1 + r1 / 100) * 1, -Math.log(1 + r3 / 100) * 3, -Math.log(1 + r5 / 100) * 5];
  return [1, 3, 5].map((years) => {
    const months = years * 12;
    let target = 0;
    for (let m = 1; m <= months; m++) target += 1 / growthFactor(m, logs);
    const worth = (rate: number) => {
      let sum = 0;
      for (let m = 1; m <= months; m++) sum += (1 + rate) ** (m / 12);
      return sum;
    };
    let lo = -0.95;
    let hi = 10;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (worth(mid) < target) lo = mid;
      else hi = mid;
    }
    return ((lo + hi) / 2) * 100;
  }) as [number, number, number];
}

// ---- Compare chart ---------------------------------------------------------------------

export type CompareRange = "1Y" | "3Y" | "5Y";
export const COMPARE_YEARS: Record<CompareRange, number> = { "1Y": 1, "3Y": 3, "5Y": 5 };
export const COMPARE_INDEX: Record<CompareRange, 0 | 1 | 2> = { "1Y": 0, "3Y": 1, "5Y": 2 };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// A believable path that ends where the annualised figure says it should (per cent change, 48 points).
function walkValues(id: string, range: CompareRange, r1: number, r3: number, r5: number): number[] {
  const target = range === "1Y" ? r1 : range === "3Y" ? ((1 + r3 / 100) ** 3 - 1) * 100 : ((1 + r5 / 100) ** 5 - 1) * 100;
  const rand = rng([...id].reduce((a, c) => a + c.charCodeAt(0) * 31, 7) + range.length * 97 + range.charCodeAt(0));
  const volatility = Math.max(1.2, Math.abs(target) * 0.12);
  const n = 48;
  const values: number[] = [];
  let walk = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    walk += (rand() - 0.5) * volatility * 0.5;
    values.push(target * t + walk - walk * t); // the noise comes back to 0 at the end
  }
  return values;
}

// Both lines drawn on one shared scale, as SVG paths in a 100 x 100 box.
export function comparePaths(basket: Basket, range: CompareRange): { basket: string; nifty: string } {
  const [b1, b3, b5] = basketReturns(basket).mine;
  const mine = walkValues(`basket-${basket.id}`, range, b1, b3, b5);
  const index = walkValues("nifty-50", range, NIFTY_50.r1, NIFTY_50.r3, NIFTY_50.r5);
  const low = Math.min(...mine, ...index);
  const span = Math.max(...mine, ...index) - low || 1;
  const toPoints = (values: number[]) =>
    values.map((v, i) => [i / (values.length - 1), 0.06 + ((v - low) / span) * 0.88] as [number, number]);
  return { basket: smoothPath(toPoints(mine)), nifty: smoothPath(toPoints(index)) };
}

// Each basket is also registered as one virtual fund ("basket:<id>"), so the ordinary amount pad,
// payment screens and checkout run on it unchanged. Only placing the order splits it across the funds.
export const basketFundId = (id: string) => `basket:${id}`;
export const basketOfFundId = (fundId: string): Basket | undefined =>
  fundId.startsWith("basket:") ? baskets.find((b) => basketFundId(b.id) === fundId) : undefined;
extraFunds.push(...baskets.map((b) => ({ ...basketAsFund(b), id: basketFundId(b.id) })));

// ---- What the investor holds in baskets (Order 2.0 portfolio, "Baskets" tab) ------------------------------------------

export type BasketPosition = {
  basketId: string;
  invested: number;
  since: string; // ISO date of the first buy
  sip?: { amount: number; day: number };
};

export const sampleBasketPositions: BasketPosition[] = [
  { basketId: "starter-mix", invested: 60000, since: "2026-02-10", sip: { amount: 2000, day: 5 } },
  { basketId: "gold-cushion", invested: 40000, since: "2026-06-18" },
];

// Each fund holds its share of what was put in, grown at its own one-year return for the time held (sample figures).
export function positionFunds(position: BasketPosition) {
  const years = Math.max((Date.now() - new Date(position.since).getTime()) / (365.25 * 24 * 3600 * 1000), 0.05);
  const basket = basketById(position.basketId);
  return basketFunds(basket).map(({ fund, weight }) => {
    const invested = (position.invested * weight) / 100;
    const current = Math.round(invested * (1 + (fund.r1 / 100) * years));
    return { fund, weight, invested, current };
  });
}

export function positionValue(position: BasketPosition) {
  const rows = positionFunds(position);
  const current = rows.reduce((sum, r) => sum + r.current, 0);
  return { current, invested: position.invested, gain: current - position.invested, rows };
}

// The research team looks at every basket each quarter; the last two reviews left it as it was (sample history).
export const REBALANCES: { when: string; state: "done" | "next"; line: string }[] = [
  { when: NEXT_REVIEW, state: "next", line: "Next review. If a fund or a share changes, we tell you first." },
  { when: REVIEWED, state: "done", line: "Reviewed. No change to the funds or their shares." },
  { when: "Jul 2026", state: "done", line: "Reviewed. No change to the funds or their shares." },
];
