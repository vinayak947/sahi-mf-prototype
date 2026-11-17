import { funds, type Fund } from "../data";

/* Fund managers: what the AMCs publish about them. Names come from the fund data; everything in MANAGERS was read from the
   AMC's own website or factsheet (see `sources`) and is left out when it could not be found, so a missing field means "not
   published" and the screens simply do not show it. A photo is a file in public/assets/managers.
   Filled in by the research pass of 2026-10-31; see design-briefs/fund-manager-sources.md for where each came from. */

export type ManagerInfo = {
  photo?: string; // "managers/manish-gunwani.jpg", the AMC's own headshot
  photoSource?: string; // the AMC page the photo came from
  photoZoom?: number; // crop in a little (some official photos have a ring or margin around the face)
  role?: string; // when it is not plain "Fund manager", e.g. "Fund manager for overseas investments"
  limited?: boolean; // runs only a part of the fund, so "returns before then were under earlier managers" would mislead
  education?: string[];
  years?: number; // years of experience, as published
  yearsPlus?: boolean; // the AMC says "over N years"
  careerStart?: number; // or the year they started, when that is what is published
  background?: string;
  since?: Record<string, string>; // fund id -> "Mar 2022"
  sources?: string[]; // page addresses the facts came from
};

/* What the AMCs publish, per manager of the funds in Top Performing Funds: the official headshot, then education, experience,
   a short background in our own words, and when they started on each fund (only where the AMC says so for that fund). Sources are
   the AMC's own website, factsheets and SEBI filings; where only a secondary site had a fact (some degrees, some start dates) it
   is left out. Dhruv Muchhal (HDFC) and Sandeep Manam (Franklin) have no official photo.
   Roshi Jain (left HDFC) and Niket Shah (no longer on the Midcap fund) were taken out when the fund-to-manager pairings in data.ts
   were corrected; their facts are still in design-briefs/manager-research.
   Photos belong to the AMCs: fine for an internal prototype, get permission before publishing. Raw research and the places where
   the sample fund data disagrees with the published facts: design-briefs/manager-research. */
export const MANAGERS: Record<string, ManagerInfo> = {
  "Manish Gunwani": {
    photo: "managers/manish-gunwani.jpg",
    photoSource: "https://cmsnew.bandhanmutual.com/wp-content/uploads/2024/09/Manish-Gunwani_128x128-1_0-1.png",
    education: ["PGDM, IIM Bangalore", "Alumnus of IIT Madras"],
    years: 30,
    yearsPlus: true,
    background: "Chief Investment Officer for equity at Bandhan AMC. Before that he led equities at Nippon India Mutual Fund and was deputy CIO for equities at ICICI Prudential AMC.",
    since: { "bandhan-small": "Jan 2023" },
    sources: ["https://bandhanmutual.com/mutual-funds/equity-funds/bandhan-small-cap-fund/direct"],
  },
  "Kirthi Jain": {
    photo: "managers/kirthi-jain.jpg",
    photoSource: "https://cmsnew.bandhanmutual.com/wp-content/uploads/2024/09/Kirthi-Jain-1.png",
    education: ["Chartered Accountant", "Company Secretary", "Bachelor of Commerce"],
    years: 10,
    yearsPlus: true,
    background: "Vice President for equity at Bandhan AMC, covering autos, textiles, capital goods, infrastructure, realty and financials. Earlier at Canara HSBC Life Insurance, Sundaram Mutual Fund and B&K Securities.",
    since: { "bandhan-small": "Jun 2023" },
    sources: ["https://bandhanmutual.com/mutual-funds/equity-funds/bandhan-small-cap-fund/direct"],
  },
  "Sandeep Tandon": {
    photo: "managers/sandeep-tandon.jpg",
    photoSource: "https://www.quantmutual.com/images/people-5.png",
    education: ["MBA in Finance"],
    years: 33,
    background: "Founder and chief investment officer of the quant group. Started as a trainee at GIC Mutual Fund, was a founding member of IDBI Asset Management, and worked at ICICI Securities and Kotak Securities.",
    since: { "quant-flexi": "Jan 2022", "quant-elss": "Feb 2025" },
    sources: ["https://www.quantmutual.com/about-us/our-people"],
  },
  "Ankit Pande": {
    photo: "managers/ankit-pande.jpg",
    photoSource: "https://www.quantmutual.com/images/Ankit_Pande.png",
    education: ["B.E. (Electronics and Telecommunications), University of Pune", "MBA, The Chinese University of Hong Kong", "CFA charterholder"],
    years: 16,
    background: "Equity research professional who began in banking software at Infosys, then covered technology stocks and won the 2014 Thomson Reuters StarMine award as top IT stock picker.",
    since: { "quant-flexi": "May 2020", "quant-elss": "May 2020" },
    sources: ["https://www.quantmutual.com/about-us/our-people"],
  },
  "Sanjeev Sharma": {
    photo: "managers/sanjeev-sharma.jpg",
    photoSource: "https://www.quantmutual.com/images/people-10.png",
    education: ["M.Com", "PG Diploma in Business Administration (Finance)", "Certified Treasury Manager (forex and risk management)"],
    years: 20,
    background: "Debt-focused money manager and chief dealer for debt at quant, with the quant schemes since 2005. Specialises in credit analysis and treasury relationships.",
    since: { "quant-elss": "Jun 2022", "quant-flexi": "Oct 2019" },
    sources: ["https://www.quantmutual.com/about-us/our-people"],
  },
  "Satish Ramanathan": {
    photo: "managers/satish-ramanathan.jpg",
    photoSource: "https://www.jmfinancialmf.com/CMS/aboutus/MrSatishRamanathan.png",
    education: ["CFA charterholder"],
    years: 30,
    yearsPlus: true,
    background: "Chief investment officer for equity at JM Financial Mutual Fund. Began in 1992 at TATA Economic Consultancy Services, then worked at ICICI Securities, Franklin Templeton and Sundaram AMC, and ran his own firm Tattva Capital.",
    since: { "jm-flexi": "Aug 2021" },
    sources: ["https://www.jmfinancialmf.com/AboutUs/Teams"],
  },
  "Asit Bhandarkar": {
    photo: "managers/asit-bhandarkar.jpg",
    photoSource: "https://www.jmfinancialmf.com/CMS/aboutus/MrAsitBhandarkar.png",
    role: "Co-fund manager",
    years: 24,
    background: "Senior equity fund manager at JM Financial Mutual Fund and co-manager of JM Flexi Cap. Started as an equity analyst on the broking side, then worked at SBI Funds Management and Lotus India AMC.",
    since: { "jm-flexi": "Oct 2024" },
    sources: ["https://www.jmfinancialmf.com/AboutUs/Teams"],
  },
  "R. Janakiraman": {
    photo: "managers/r-janakiraman.jpg",
    photoSource: "https://franklintempletonprod.widen.net/content/ectwqarniy/original/en-in-new-aboutus-member4.png",
    education: ["CFA charterholder"],
    careerStart: 1997,
    background: "In investment management since 1997. Before Franklin Templeton he ran the investment corpus of the Chennai-based Indian Syntans Group and worked at UTI Securities. Now Chief Investment Officer for equity in India.",
    sources: ["https://www.franklintempletonindia.com/about-us/our-team/janakiraman-rengaraju"],
  },
  "Sandeep Manam": {
    role: "Fund manager for foreign securities",
    limited: true,
    education: ["PGDM, IIM Ahmedabad", "B.Tech (Electronics and Communication), NIT Calicut"],
    background: "Joined Franklin Templeton in 2015 as a research analyst for autos and airlines in emerging markets India. Earlier at Cognizant and Shapoorji Pallonji. A fund manager since October 2021, dedicated to foreign securities.",
    sources: ["https://www.franklintempletonindia.com/download/en-in/addendums/0dc89049-d4b4-4d21-954d-e0467c8da773/addendum-change-in-fund-managers-october-17-2021-ku9bdwe0-en-in.pdf"],
  },
  "Ajay Khandelwal": {
    photo: "managers/ajay-khandelwal.jpg",
    photoSource: "https://www.motilaloswalmf.com/content/dam/motilal-mf/fund-manager/mr-ajay-khandelwal.png",
    photoZoom: 1.3,
    education: ["MBA, T.A. Pai Management Institute (TAPMI), Manipal"],
    years: 18,
    yearsPlus: true,
    background: "Head of equity at Motilal Oswal AMC. Earlier managed funds at Canara Robeco and BOI AXA Investment Managers, where he also began as a research analyst around 2010.",
    since: { "mo-mid": "Oct 2024" },
    sources: ["https://www.motilaloswalmf.com/content/dam/motilal-mf/downloads/mf/presentations/2026/oct/Presentation%20Motilal%20Oswal%20Midcap%20Fund.pdf"],
  },
  "Amit Ganatra": {
    education: ["Chartered Accountant", "CFA charterholder", "M.Com"],
    years: 23,
    background: "Equity fund manager who spent 2007 to 2020 at Invesco India, was at HDFC AMC from 2020 to 2022, then returned to Invesco as Director and Head of Equities. Rejoined HDFC AMC in January 2026.",
    since: { "hdfc-flexi": "Feb 2026" },
    sources: ["https://files.hdfcfund.com/s3fs-public/2026-01/1334%20-%20Addendum%20-%20Change%20in%20Information%20of%20Key%20personnel%20and%20Fund%20Managers%20-%20Mr.%20Amit%20Ganatra.pdf"],
  },
  "Ankit Agarwal": {
    photo: "managers/ankit-agarwal.jpg",
    photoSource: "https://www.motilaloswalmf.com/modals/about-us-model/mr-ankit-agarwal",
    years: 20,
    yearsPlus: true,
    background: "More than two decades across equity research, portfolio construction and trading. Earlier at UTI AMC, Barclays Wealth, Lehman Brothers (London), BNP Paribas (Hong Kong) and D. E. Shaw.",
    since: { "mo-mid": "Jan 2026" },
    sources: ["https://www.motilaloswalmf.com/modals/about-us-model/mr-ankit-agarwal"],
  },
  "Varun Sharma": {
    photo: "managers/varun-sharma.jpg",
    photoSource: "https://www.motilaloswalmf.com/modals/about-us-model/mr-varun-sharma",
    education: ["PGDM, IIM Kolkata"],
    years: 15,
    yearsPlus: true,
    background: "More than 15 years in investing. Worked at ICICI Securities, then spent over a decade as a fund manager at Franklin Templeton before joining Motilal Oswal AMC.",
    since: { "mo-mid": "Jan 2026" },
    sources: ["https://www.motilaloswalmf.com/modals/about-us-model/mr-varun-sharma"],
  },
  "Dhruv Muchhal": {
    education: ["B.Com, University of Mumbai", "Chartered Accountant", "CFA charterholder"],
    years: 15,
    yearsPlus: true,
    background: "Equity research analyst by background, with stints at CRISIL, Goldman Sachs India and Motilal Oswal before joining HDFC AMC in 2019. At HDFC he is the fund manager for overseas investments across its equity schemes.",
    role: "Fund manager for overseas investments",
    limited: true,
    since: { "hdfc-flexi": "Jun 2023", "hdfc-mid": "Jun 2023" },
    sources: ["https://files.hdfcfund.com/s3fs-public/2026-06/HDFC%20Mutual%20Fund%20-%20SAI%20dated%20June%2030,%202026.pdf"],
  },
};

export const infoFor = (name: string): ManagerInfo => MANAGERS[name] ?? {};

/* "30+ yrs", "16 yrs", or from the year they started; null when the AMC does not say. */
export function yearsLabel(info: ManagerInfo) {
  const years = info.years ?? (info.careerStart ? new Date().getFullYear() - info.careerStart : undefined);
  if (!years) return null;
  return `${years}${info.yearsPlus || (!info.years && info.careerStart) ? "+" : ""} yrs`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const monthsBetween = (from: Date, to: Date) => (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() - (to.getDate() < from.getDate() ? 1 : 0);

export const launchDate = (fund: Fund) => new Date(fund.launched);

/* When this person started on this fund, if the AMC says. */
export function managerSince(name: string, fund: Fund): Date | null {
  const text = infoFor(name).since?.[fund.id];
  if (!text) return null;
  const [mon, year] = text.toLowerCase().split(" ");
  const m = MONTHS.indexOf(mon.slice(0, 3));
  return m < 0 || !Number(year) ? null : new Date(Number(year), m, 1);
}

export const sinceText = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/* "3 yrs 8 mo", "5 yrs", "8 months" */
export function tenureText(since: Date) {
  const months = Math.max(0, monthsBetween(since, new Date()));
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y < 1) return `${m} ${m === 1 ? "month" : "months"}`;
  return `${y} ${y === 1 ? "yr" : "yrs"}${m ? ` ${m} mo` : ""}`;
}

/* Funds in this app that the same person manages (not the one being looked at). */
export const otherFunds = (name: string, exceptId: string) => funds.filter((f) => f.id !== exceptId && f.managers.includes(name));

/* Started a year or more after the fund launched: the track record before that was someone else's. */
export function joinedAfterLaunch(name: string, fund: Fund) {
  const since = managerSince(name, fund);
  return since !== null && monthsBetween(launchDate(fund), since) >= 12;
}

/* "hdfcfund.com" from a page address, for the small source line. */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
