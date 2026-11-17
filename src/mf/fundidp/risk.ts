import { funds, riskLevels, type Fund, type Risk } from "../data";

/* What the Riskometer widget says. The LEVEL is the fund's own (data.ts). The wording per level is general plain-language copy.
   The "how it has behaved" figures (worst, typical and best 1-year and 5-year result, how often it lost money, the biggest fall
   and the months to recover) are SAMPLE numbers worked out from the fund's category and published returns, like the rest of the
   prototype's data: replace with rolling returns and drawdown history from the fund data provider. */

export const RISK_COPY: Record<Risk, { meaning: string; horizon: string; short: string }> = {
  Low: { meaning: "Very little chance of losing money. Returns stay modest.", horizon: "a few months or more", short: "Money stays safe, returns are small" },
  "Low to Moderate": { meaning: "Small ups and downs, usually steadier than shares.", horizon: "1 year or more", short: "Small ups and downs" },
  Moderate: { meaning: "Some ups and downs. A fall in a bad year is possible.", horizon: "3 years or more", short: "Some ups and downs" },
  "Moderately High": { meaning: "Noticeable ups and downs. It can stay down for a few months.", horizon: "3 years or more", short: "Noticeable ups and downs" },
  High: { meaning: "Big ups and downs. A fall of a fifth or more can happen.", horizon: "5 years or more", short: "Big ups and downs" },
  "Very High": { meaning: "Its value can swing a lot, and fall sharply in a bad year.", horizon: "5 years or more", short: "Biggest ups and downs" },
};

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* Sample: biggest fall in 5 years and months to get back to the old high, by category. */
const BASE: Record<Fund["cat"], [number, number]> = {
  small: [-27, 14],
  mid: [-24, 12],
  flexi: [-20, 9],
  elss: [-22, 10],
  large: [-17, 7],
  index: [-16, 7],
  gold: [-13, 9],
  theme: [-28, 14],
  debt: [-2.5, 3],
  liquid: [-0.2, 1],
};

export function roughPatch(fund: Fund) {
  const [fall, months] = BASE[fund.cat];
  const jitter = fund.cat === "debt" || fund.cat === "liquid" ? 0 : (hash(fund.id) % 5) - 2;
  const f = fall - jitter;
  return {
    fall: f, // negative %
    dipTo: Math.round(10000 * (1 + f / 100)), // what 10,000 fell to
    months: months + (hash(fund.id) % 3),
  };
}

const round = (v: number) => (Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v));

/* Sample: out of every 100 one-year and five-year periods, how many ended with a loss, by category. */
const LOSS: Record<Fund["cat"], [number, number]> = {
  small: [24, 3],
  mid: [21, 2],
  flexi: [17, 1],
  elss: [19, 2],
  large: [14, 0],
  index: [14, 0],
  gold: [22, 5],
  theme: [26, 4],
  debt: [5, 0],
  liquid: [0, 0],
};

export type Outcomes = {
  oneYear: { worst: number; typical: number; best: number; lossPer100: number }; // % over any 1 year
  fiveYear: { worst: number; typical: number; best: number; lossPer100: number }; // % a year over any 5 years
};

/* The whole spread, not only the bad end: worst, typical and best result over any 1 year and over any 5 years (as a % a year). */
export function outcomes(fund: Fund): Outcomes {
  const steady = fund.cat === "debt" || fund.cat === "liquid";
  const fall = roughPatch(fund).fall;
  const typical1 = round(fund.r3);
  const worst1 = steady ? round(fund.cat === "liquid" ? fund.r3 * 0.45 : fund.r3 - 6) : round(fall * 0.9);
  const best1 = steady ? round(fund.r3 * (fund.cat === "liquid" ? 1.25 : 1.5)) : round(typical1 + (typical1 - worst1) * 1.25);
  const typical5 = round(fund.r5);
  const worst5 = steady ? round(fund.r5 * 0.8) : round(Math.max(fund.r5 * 0.15, 1));
  const best5 = steady ? round(fund.r5 * 1.15) : round(fund.r5 * 1.2);
  const [l1, l5] = LOSS[fund.cat];
  const jitter = l1 === 0 ? 0 : (hash(fund.id) % 5) - 2;
  return {
    oneYear: tidy({ worst: worst1, typical: typical1, best: best1, lossPer100: Math.max(0, l1 + jitter) }),
    fiveYear: tidy({ worst: worst5, typical: typical5, best: best5, lossPer100: l5 }),
  };
}

/* Keep the two halves honest: if some periods lost money the worst result is below zero, and if none did it is not. */
function tidy(range: Outcomes["oneYear"]): Outcomes["oneYear"] {
  if (range.lossPer100 > 0 && range.worst >= 0) return { ...range, worst: -0.4 };
  if (range.lossPer100 === 0 && range.worst < 0) return { ...range, lossPer100: 1 };
  return range;
}

/* A plain category fact about how long funds at this level are usually held (not a personal suggestion). */
export const usualHorizon = (fund: Fund) => `Funds at this level are usually held for ${RISK_COPY[fund.risk].horizon}.`;

/* Why a fund of this kind carries the level it does, in plain words (general copy per category, not fund-specific). */
const RISK_WHY: Record<Fund["cat"], string> = {
  small: "It invests mostly in small companies. Their share prices move up and down more than big companies' do, and in a falling market they can be hard to sell.",
  mid: "It invests mostly in mid-sized companies. They can grow faster than big ones, but their prices swing more and can drop sharply in a weak market.",
  flexi: "It can put money in companies of any size, so it moves with the stock market. When shares fall, the fund falls too.",
  large: "It invests in India's biggest companies. They are steadier than smaller ones, but the fund still rises and falls with the stock market.",
  index: "It copies the Nifty 50, so it goes up and down with the market. Nothing is done to cushion a fall.",
  elss: "It invests mostly in shares, so its value rises and falls with the market. Your money is also locked in for 3 years.",
  debt: "It lends to companies and the government for a few years. Its value can dip when interest rates rise, or if a borrower does not pay back.",
  liquid: "It lends for very short periods, so its value barely moves. The risk is small, but it is not zero.",
  theme: "It puts your money in one part of the economy, so it can fall hard when that part is out of favour. A fund spread across many sectors is steadier.",
  gold: "Its value follows the price of gold or silver, which can swing a lot. It pays no interest or dividends.",
};

export const whyRisk = (fund: Fund) => `${RISK_WHY[fund.cat]} ${usualHorizon(fund)}`;

/* How this level compares with the other funds of the same kind in the app, or null if it is the only one. */
export function peerLine(fund: Fund): string | null {
  const peers = funds.filter((f) => f.cat === fund.cat && f.id !== fund.id);
  if (peers.length === 0) return null;
  const mine = riskLevels.indexOf(fund.risk);
  const avg = peers.reduce((a, f) => a + riskLevels.indexOf(f.risk), 0) / peers.length;
  const kind = fund.catLabel.split("·").pop()!.trim().toLowerCase();
  if (Math.abs(mine - avg) < 0.5) return `Same level as other ${kind} funds`;
  return mine > avg ? `Higher than other ${kind} funds` : `Lower than other ${kind} funds`;
}
