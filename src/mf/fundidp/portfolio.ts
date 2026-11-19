/* Sample portfolio ("what is inside the fund") for every fund. Like the rest of data.ts these are illustrative, not live:
   the company names are real, the weights are generated. They are stable per fund (seeded by the fund id), so the widget on the
   fund page and the all-holdings page always agree. */

import type { CategoryKey, Fund } from "../data";

/** `change` is how the share moved since last month, in percentage points; null means the fund bought it this month. */
export type Position = { name: string; group: string; weight: number; change: number | null };
export type Group = { name: string; weight: number };

export type Portfolio = {
  asOf: string;
  /** The tiles under the heading, Equity / Debt / Others (cash and the like), the usual mutual fund words. Values are % of the fund and add up to 100. */
  tiles: { label: string; value: number }[];
  /** "Sectors" or "Types"; null when a fund has no useful grouping (the metal funds). */
  groupLabel: string | null;
  /** "Companies" or "Holdings". */
  itemLabel: string;
  items: Position[]; // biggest first, weights are % of the fund
  groups: Group[]; // biggest first
  note: string | null;
};

// ---- the pools ----------------------------------------------------------------------------------------------------------

type Co = [name: string, sector: string, tier: 1 | 2 | 3]; // tier: 1 large, 2 mid, 3 small
const COMPANIES: Co[] = [
  ["HDFC Bank", "Financial Services", 1], ["ICICI Bank", "Financial Services", 1], ["Reliance Industries", "Energy", 1],
  ["Infosys", "IT", 1], ["TCS", "IT", 1], ["Bharti Airtel", "Telecom", 1], ["ITC", "FMCG", 1], ["Larsen & Toubro", "Construction", 1],
  ["State Bank of India", "Financial Services", 1], ["Axis Bank", "Financial Services", 1], ["Kotak Mahindra Bank", "Financial Services", 1],
  ["Hindustan Unilever", "FMCG", 1], ["Maruti Suzuki", "Automobile", 1], ["Mahindra & Mahindra", "Automobile", 1],
  ["Sun Pharmaceutical", "Healthcare", 1], ["Bajaj Finance", "Financial Services", 1], ["Titan Company", "Consumer Durables", 1],
  ["Asian Paints", "Chemicals", 1], ["NTPC", "Power", 1], ["UltraTech Cement", "Construction Materials", 1], ["HCL Technologies", "IT", 1],
  ["Tata Motors", "Automobile", 1], ["Power Grid Corporation", "Power", 1], ["Nestle India", "FMCG", 1], ["Tata Steel", "Metals", 1],
  ["Adani Ports", "Services", 1], ["Wipro", "IT", 1], ["Cipla", "Healthcare", 1], ["Eicher Motors", "Automobile", 1], ["Dr. Reddy's Laboratories", "Healthcare", 1],
  ["Max Healthcare", "Healthcare", 2], ["Persistent Systems", "IT", 2], ["Coforge", "IT", 2], ["Indian Hotels", "Consumer Services", 2],
  ["Federal Bank", "Financial Services", 2], ["Voltas", "Consumer Durables", 2], ["Cummins India", "Capital Goods", 2], ["Godrej Properties", "Realty", 2],
  ["Oberoi Realty", "Realty", 2], ["Page Industries", "Textiles", 2], ["Polycab India", "Capital Goods", 2], ["Supreme Industries", "Capital Goods", 2],
  ["Astral", "Capital Goods", 2], ["Balkrishna Industries", "Automobile", 2], ["Tube Investments", "Automobile", 2], ["PI Industries", "Chemicals", 2],
  ["Aurobindo Pharma", "Healthcare", 2], ["Lupin", "Healthcare", 2], ["Zydus Lifesciences", "Healthcare", 2], ["Bharat Forge", "Automobile", 2],
  ["Mphasis", "IT", 2], ["Trent", "Consumer Services", 2], ["Jubilant FoodWorks", "Consumer Services", 2], ["Container Corporation", "Services", 2],
  ["REC Ltd", "Financial Services", 2], ["Power Finance Corporation", "Financial Services", 2], ["Indus Towers", "Telecom", 2],
  ["Sundaram Finance", "Financial Services", 2], ["Ashok Leyland", "Automobile", 2], ["Dixon Technologies", "Consumer Durables", 2],
  ["Sobha Ltd", "Realty", 3], ["Cholamandalam Fin. Holdings", "Financial Services", 3], ["LT Foods Ltd", "FMCG", 3],
  ["Kirloskar Oil Engines", "Capital Goods", 3], ["KEI Industries", "Capital Goods", 3], ["Blue Star", "Consumer Durables", 3],
  ["Carborundum Universal", "Capital Goods", 3], ["Radico Khaitan", "FMCG", 3], ["Ratnamani Metals", "Metals", 3], ["Welspun Corp", "Metals", 3],
  ["CreditAccess Grameen", "Financial Services", 3], ["Can Fin Homes", "Financial Services", 3], ["Aavas Financiers", "Financial Services", 3],
  ["Shyam Metalics", "Metals", 3], ["Century Plyboards", "Consumer Durables", 3], ["Sansera Engineering", "Automobile", 3],
  ["Kalyan Jewellers", "Consumer Durables", 3], ["V-Guard Industries", "Consumer Durables", 3], ["Kajaria Ceramics", "Construction Materials", 3],
  ["Garware Technical Fibres", "Textiles", 3], ["Greenply Industries", "Consumer Durables", 3], ["Triveni Turbine", "Capital Goods", 3],
  ["Techno Electric", "Construction", 3], ["Ahluwalia Contracts", "Construction", 3], ["PNC Infratech", "Construction", 3],
  ["KNR Constructions", "Construction", 3], ["Mahindra Lifespace", "Realty", 3], ["Brigade Enterprises", "Realty", 3],
  ["Suprajit Engineering", "Automobile", 3], ["Craftsman Automation", "Automobile", 3], ["Gujarat Pipavav Port", "Services", 3],
  ["Amara Raja Energy", "Automobile", 3], ["Navin Fluorine", "Chemicals", 3], ["Aether Industries", "Chemicals", 3],
  ["Fine Organics", "Chemicals", 3], ["Neogen Chemicals", "Chemicals", 3],
];

type Bond = [name: string, type: string];
const BONDS: Bond[] = [
  ["7.18% Government of India 2033", "Government securities"], ["7.10% Government of India 2034", "Government securities"],
  ["7.26% Government of India 2032", "Government securities"], ["7.38% Government of India 2027", "Government securities"],
  ["7.32% Maharashtra SDL 2030", "Government securities"], ["7.45% Tamil Nadu SDL 2031", "Government securities"],
  ["182 Day Treasury Bill", "Treasury bills"], ["91 Day Treasury Bill", "Treasury bills"], ["364 Day Treasury Bill", "Treasury bills"],
  ["HDFC Bank Certificate of Deposit", "Certificates of deposit"], ["Axis Bank Certificate of Deposit", "Certificates of deposit"],
  ["Kotak Mahindra Bank Certificate of Deposit", "Certificates of deposit"], ["Canara Bank Certificate of Deposit", "Certificates of deposit"],
  ["Bank of Baroda Certificate of Deposit", "Certificates of deposit"], ["Small Industries Development Bank Commercial Paper", "Commercial paper"],
  ["National Bank for Agriculture Commercial Paper", "Commercial paper"], ["Reliance Retail Commercial Paper", "Commercial paper"],
  ["Tata Capital Commercial Paper", "Commercial paper"], ["Power Finance Corporation 7.55% NCD", "Corporate bonds"],
  ["REC Ltd 7.64% NCD", "Corporate bonds"], ["National Housing Bank 7.59% NCD", "Corporate bonds"],
  ["Bajaj Finance 7.80% NCD", "Corporate bonds"], ["HDFC Ltd 7.70% NCD", "Corporate bonds"], ["LIC Housing Finance 7.65% NCD", "Corporate bonds"],
  ["Indian Railway Finance Corporation 7.40% NCD", "Corporate bonds"], ["NTPC 7.37% NCD", "Corporate bonds"], ["Power Grid 7.55% NCD", "Corporate bonds"],
  ["Sundaram Finance 7.85% NCD", "Corporate bonds"], ["Mahindra Finance 7.95% NCD", "Corporate bonds"], ["Tata Capital 7.82% NCD", "Corporate bonds"],
];

// ---- a small seeded random number generator, so a fund always gets the same portfolio -----------------------------------------

function seeded(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, d = 2) => Number(n.toFixed(d));

/** The last month-end: portfolios are published a few days into the next month, so that is the newest one. */
export function portfolioDate(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), 0);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// How many holdings, how much equity, how steeply the weights fall, and which sizes of company a category leans to.
const EQUITY: Partial<Record<CategoryKey, { count: number; equity: [number, number]; debt: [number, number]; offset: number; pick: Record<1 | 2 | 3, number>; rank: Record<1 | 2 | 3, number> }>> = {
  small: { count: 85, equity: [86, 93], debt: [0.1, 0.4], offset: 14, pick: { 1: 0.1, 2: 0.5, 3: 1 }, rank: { 1: 0.1, 2: 0.5, 3: 1 } },
  mid: { count: 70, equity: [92, 96], debt: [0, 0.6], offset: 12, pick: { 1: 0.3, 2: 1, 3: 0.4 }, rank: { 1: 0.3, 2: 1, 3: 0.4 } },
  flexi: { count: 48, equity: [88, 94], debt: [1, 4], offset: 6, pick: { 1: 1, 2: 0.7, 3: 0.3 }, rank: { 1: 1, 2: 0.7, 3: 0.3 } },
  elss: { count: 50, equity: [94, 97], debt: [0, 0.5], offset: 7, pick: { 1: 1, 2: 0.7, 3: 0.3 }, rank: { 1: 1, 2: 0.7, 3: 0.3 } },
  large: { count: 40, equity: [95, 98], debt: [0, 0.4], offset: 5, pick: { 1: 1.5, 2: 0.3, 3: 0 }, rank: { 1: 1.5, 2: 0.2, 3: 0 } },
  index: { count: 40, equity: [99.3, 99.8], debt: [0, 0], offset: 3, pick: { 1: 1.5, 2: 0.3, 3: 0 }, rank: { 1: 1.5, 2: 0.2, 3: 0 } },
};


// Sector and theme funds hold one part of the economy, so their companies come from a short list for that theme: [name, kind of business].
const THEME_POOLS: Record<string, [string, string][]> = {
  Defence: [
    ["Hindustan Aeronautics", "Aircraft and helicopters"], ["Bharat Electronics", "Radar and electronics"], ["Bharat Dynamics", "Missiles"],
    ["Mazagon Dock Shipbuilders", "Ships and submarines"], ["Cochin Shipyard", "Ships and submarines"], ["Garden Reach Shipbuilders", "Ships and submarines"],
    ["Solar Industries", "Explosives"], ["Data Patterns", "Radar and electronics"], ["Astra Microwave Products", "Radar and electronics"],
    ["BEML", "Vehicles and heavy machines"], ["Bharat Forge", "Vehicles and heavy machines"], ["Mishra Dhatu Nigam", "Special metals"],
    ["Paras Defence and Space", "Radar and electronics"], ["Zen Technologies", "Training and simulators"], ["Premier Explosives", "Explosives"],
  ],
  IT: [
    ["Infosys", "IT services"], ["TCS", "IT services"], ["HCL Technologies", "IT services"], ["Wipro", "IT services"], ["Tech Mahindra", "IT services"],
    ["LTIMindtree", "IT services"], ["Persistent Systems", "Mid-size IT"], ["Coforge", "Mid-size IT"], ["Mphasis", "Mid-size IT"], ["KPIT Technologies", "Car software"],
    ["Tata Elxsi", "Car software"], ["Oracle Financial Services", "Software products"], ["Zensar Technologies", "Mid-size IT"], ["Cyient", "Engineering services"],
  ],
  AI: [
    ["NVIDIA", "Chips"], ["Microsoft", "Cloud and software"], ["Alphabet", "Cloud and software"], ["Meta Platforms", "Social and ads"], ["Amazon", "Cloud and shopping"],
    ["Broadcom", "Chips"], ["Apple", "Devices"], ["Tesla", "Cars and robots"], ["Netflix", "Streaming"], ["Advanced Micro Devices", "Chips"], ["Oracle", "Cloud and software"],
    ["Palantir", "Cloud and software"], ["Snowflake", "Cloud and software"], ["Taiwan Semiconductor", "Chips"],
  ],
  Healthcare: [
    ["Sun Pharmaceutical", "Drug makers"], ["Cipla", "Drug makers"], ["Dr. Reddy's Laboratories", "Drug makers"], ["Divi's Laboratories", "Drug makers"],
    ["Lupin", "Drug makers"], ["Zydus Lifesciences", "Drug makers"], ["Torrent Pharmaceuticals", "Drug makers"], ["Apollo Hospitals", "Hospitals"],
    ["Max Healthcare", "Hospitals"], ["Fortis Healthcare", "Hospitals"], ["Dr. Lal PathLabs", "Diagnostics"], ["Metropolis Healthcare", "Diagnostics"],
    ["Aurobindo Pharma", "Drug makers"], ["Alkem Laboratories", "Drug makers"],
  ],
  Banking: [
    ["HDFC Bank", "Private banks"], ["ICICI Bank", "Private banks"], ["Axis Bank", "Private banks"], ["Kotak Mahindra Bank", "Private banks"],
    ["State Bank of India", "Government banks"], ["Bank of Baroda", "Government banks"], ["Bajaj Finance", "Lenders"], ["Bajaj Finserv", "Lenders"],
    ["Cholamandalam Investment", "Lenders"], ["SBI Life Insurance", "Insurance"], ["HDFC Life Insurance", "Insurance"], ["IndusInd Bank", "Private banks"],
    ["Federal Bank", "Private banks"], ["Shriram Finance", "Lenders"],
  ],
};

function groupsOf(items: Position[]): Group[] {
  const by = new Map<string, number>();
  for (const p of items) by.set(p.group, (by.get(p.group) ?? 0) + p.weight);
  return [...by].map(([name, weight]) => ({ name, weight: round(weight) })).sort((a, b) => b.weight - a.weight);
}

const drift = (rand: () => number): number | null => (rand() < 0.07 ? null : round((rand() - 0.42) * 0.7));

/** Spread `total` % over `n` positions: the biggest few carry the most, then a long tail. */
function spread(total: number, n: number, offset: number) {
  const raw = Array.from({ length: n }, (_, k) => 1 / (k + offset) ** 0.9);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => round((r / sum) * total));
}

export function portfolioOf(fund: Fund): Portfolio {
  const rand = seeded(fund.id);
  const asOf = portfolioDate();
  const pct = (n: number) => round(n, 1);

  const pool = fund.theme ? THEME_POOLS[fund.theme] : undefined;
  if (pool) {
    const equity = pct(97 + rand() * 1.8);
    const cash = pct(100 - equity);
    const weights = spread(equity, pool.length, 3.5);
    // a little shuffling so two funds on the same theme do not list the same order
    const order = pool.map((c) => ({ c, key: rand() * 0.9 })).map((x, i) => ({ ...x, key: x.key - i * 0.12 })).sort((a, b) => b.key - a.key);
    const items = order.map(({ c }, i) => ({ name: c[0], group: c[1], weight: weights[i], change: drift(rand) }));
    return {
      asOf,
      tiles: [
        { label: "Equity", value: equity },
        { label: "Debt", value: 0 },
        { label: "Others", value: cash },
      ],
      groupLabel: "Sectors",
      itemLabel: "Companies",
      items,
      groups: groupsOf(items),
      note: "Cash and money-market instruments are shown in the tiles above, not as holdings.",
    };
  }

  const eq = EQUITY[fund.cat];
  if (eq) {
    const between = ([a, b]: [number, number]) => a + rand() * (b - a);
    const equity = pct(between(eq.equity));
    const debt = pct(between(eq.debt));
    const cash = pct(100 - equity - debt);
    const chosen = COMPANIES.map((c) => ({ c, key: eq.pick[c[2]] + rand() * 0.8 }))
      .sort((a, b) => b.key - a.key)
      .slice(0, eq.count)
      .map((x) => ({ c: x.c, key: eq.rank[x.c[2]] + rand() * 1.2 }))
      .sort((a, b) => b.key - a.key);
    const weights = spread(equity, chosen.length, eq.offset);
    const items = chosen.map(({ c }, i) => ({ name: c[0], group: c[1], weight: weights[i], change: drift(rand) }));
    return {
      asOf,
      tiles: [
        { label: "Equity", value: equity },
        { label: "Debt", value: debt },
        { label: "Others", value: cash },
      ],
      groupLabel: "Sectors",
      itemLabel: "Companies",
      items,
      groups: groupsOf(items),
      note: "Cash and money-market instruments are shown in the tiles above, not as holdings.",
    };
  }

  if (fund.cat === "debt" || fund.cat === "liquid") {
    const debt = pct(fund.cat === "liquid" ? 93 + rand() * 4 : 90 + rand() * 6);
    const cash = pct(100 - debt);
    const count = fund.cat === "liquid" ? 18 + Math.floor(rand() * 8) : 22 + Math.floor(rand() * 8);
    const prefer = fund.cat === "liquid" ? ["Treasury bills", "Certificates of deposit", "Commercial paper"] : ["Government securities", "Corporate bonds"];
    const chosen = BONDS.map((b) => ({ b, key: (prefer.includes(b[1]) ? 1 : 0.2) + rand() * 0.9 }))
      .sort((a, b) => b.key - a.key)
      .slice(0, count)
      .map((x) => x.b);
    const weights = spread(debt, chosen.length, 4);
    const items = chosen.map((b, i) => ({ name: b[0], group: b[1], weight: weights[i], change: drift(rand) }));
    return {
      asOf,
      tiles: [
        { label: "Equity", value: 0 },
        { label: "Debt", value: debt },
        { label: "Others", value: cash },
      ],
      groupLabel: "Types",
      itemLabel: "Holdings",
      items,
      groups: groupsOf(items),
      note: "Cash and money-market instruments are shown in the tiles above, not as holdings.",
    };
  }

  // Gold and silver funds hold exchange-traded funds of the metal, plus a little cash.
  const metal = fund.catLabel.includes("Silver") ? "Silver" : "Gold";
  const cash = pct(0.8 + rand() * 1.4);
  const etfs = metal === "Gold" ? ["Nippon India ETF Gold BeES", "HDFC Gold ETF", "ICICI Prudential Gold ETF"] : ["Nippon India Silver ETF", "ICICI Prudential Silver ETF", "HDFC Silver ETF"];
  const split = [0.58 + rand() * 0.1, 0.22 + rand() * 0.06];
  split.push(1 - split[0] - split[1]);
  const items = etfs.map((name, i) => ({ name, group: `${metal} ETFs`, weight: round(split[i] * (100 - cash)), change: round((rand() - 0.5) * 0.4) }));
  return {
    asOf,
    tiles: [
      { label: `${metal} ETFs`, value: pct(100 - cash) },
      { label: "Others", value: cash },
    ],
    groupLabel: null,
    itemLabel: "Holdings",
    items,
    groups: [],
    note: null,
  };
}

/** 2.3 / 2.13 / 1.9: no trailing zeros. */
export const weightText = (w: number) => `${Number(w.toFixed(2))}%`;
