// Money, dates and the 3 PM cut-off, in the words the PRD asks for.

export function inr(value: number, decimals = 0): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const [whole, frac] = fixed.split(".");
  let out: string;
  if (whole.length <= 3) {
    out = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    out = `${rest},${last3}`;
  }
  return `${sign}₹${out}${frac ? `.${frac}` : ""}`;
}

export const pct = (value: number, decimals = 1) =>
  `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ones[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ones[n]);
  }
  return parts.join(" ");
}

// Indian system: crore, lakh, thousand.
export function rupeesInWords(n: number): string {
  if (!n) return "";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return `Rupees ${parts.join(" ")} Only`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDay = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const fmtTime = (d: Date) => {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
};

// Market holidays (NSE trading holidays 2026, sample: load the exchange calendar from the server in production).
const HOLIDAYS = new Set([
  "2026-01-26", "2026-03-03", "2026-03-26", "2026-03-31", "2026-04-03", "2026-04-14", "2026-05-01",
  "2026-05-28", "2026-06-26", "2026-09-14", "2026-10-02", "2026-10-20", "2026-11-10", "2026-11-24", "2026-12-25",
]);

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isBusinessDay = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.has(isoDay(d));

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function nextBusinessDay(d: Date): Date {
  let next = addDays(d, 1);
  while (!isBusinessDay(next)) next = addDays(next, 1);
  return next;
}

export function addBusinessDays(d: Date, n: number): Date {
  let out = d;
  for (let i = 0; i < n; i++) out = nextBusinessDay(out);
  return out;
}

// Cut-offs run on Indian time whatever the phone's timezone is: this returns a Date whose
// local fields (hours, date) read as the wall clock in India. Production takes the time from the server.
export function istNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
}

// Liquid and overnight funds: 1:30 PM. Everything else: 3 PM (buying and selling).
export type CutoffKind = "liquid" | "other";
const CUTOFF_MIN: Record<CutoffKind, number> = { liquid: 13 * 60 + 30, other: 15 * 60 };
export const cutoffLabel = (kind: CutoffKind) => (kind === "liquid" ? "1:30 PM" : "3 PM");

export function afterCutoff(now: Date, kind: CutoffKind = "other"): boolean {
  return !isBusinessDay(now) || now.getHours() * 60 + now.getMinutes() >= CUTOFF_MIN[kind];
}

// The business day the order counts on: today if before the cut-off, else the next one.
export function tradeDay(now: Date, kind: CutoffKind = "other"): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return afterCutoff(now, kind) ? nextBusinessDay(today) : today;
}

// NAV date for a purchase, counted from when the money reaches the fund house (SEBI, Feb 2021).
// Liquid funds use the NAV of the calendar day before the business day the money counts on.
export function navDay(now: Date, kind: CutoffKind = "other"): Date {
  const day = tradeDay(now, kind);
  return kind === "liquid" ? addDays(day, -1) : day;
}

// When the units show in the folio: liquid on the trade day itself, others the next business day.
export function allotDay(now: Date, kind: CutoffKind = "other"): Date {
  const day = tradeDay(now, kind);
  return kind === "liquid" ? day : nextBusinessDay(day);
}

// Stamp duty on every purchase since 1 Jul 2020: 0.005% of the amount, taken before units are allotted.
export const STAMP_DUTY = 0.00005;
export const stampDuty = (amount: number) => Math.round(amount * STAMP_DUTY * 100) / 100;

export function yearsHeld(sinceIso: string): number {
  return (Date.now() - new Date(sinceIso).getTime()) / (365.25 * 24 * 3600 * 1000);
}

// Seeded wobble so each fund's chart is stable between renders.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export type Range = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
export const ranges: Range[] = ["1M", "6M", "1Y", "3Y", "5Y", "ALL"];

// A believable NAV path that ends where the fund's own return says it should.
export function navSeries(
  id: string,
  range: Range,
  r1: number,
  r3: number,
  r5: number,
): { pts: [number, number][]; change: number } {
  const total: Record<Range, number> = {
    "1M": r1 / 12 + 0.6,
    "6M": r1 / 2,
    "1Y": r1,
    "3Y": ((1 + r3 / 100) ** 3 - 1) * 100,
    "5Y": ((1 + r5 / 100) ** 5 - 1) * 100,
    ALL: ((1 + r5 / 100) ** 6 - 1) * 100,
  };
  const n = 48;
  const rand = rng([...id].reduce((a, c) => a + c.charCodeAt(0) * 31, 7) + range.length * 97 + range.charCodeAt(0));
  const target = total[range];
  const volatility = Math.max(1.2, Math.abs(target) * 0.12);
  const raw: number[] = [];
  let walk = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    walk += (rand() - 0.5) * volatility * 0.5;
    raw.push(target * t + walk - walk * t); // bridge: noise returns to 0 at the end
  }
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const span = max - min || 1;
  return {
    pts: raw.map((v, i) => [i / (n - 1), 0.08 + ((v - min) / span) * 0.84] as [number, number]),
    change: target,
  };
}

// Same Catmull-Rom smoothing the Home analysis chart uses (100 x 100 box).
export function smoothPath(points: [number, number][], w = 100, h = 100): string {
  const pts = points.map(([x, y]) => [x * w, (1 - y) * h] as const);
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

// Next debit for a SIP on the given day of the month. UPI AutoPay needs a pre-debit notice 24 hours
// ahead, so a date less than 2 days away moves to the next month.
export const SIP_LEAD_DAYS = 2;
export function nextSipDate(day: number, now = istNow()): Date {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const soon = (thisMonth.getTime() - today.getTime()) / 864e5 < SIP_LEAD_DAYS;
  return soon ? new Date(now.getFullYear(), now.getMonth() + 1, day) : thisMonth;
}
