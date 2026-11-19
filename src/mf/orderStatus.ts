import "./orderStatus.css";
import type { IconName } from "../ui/Icon";
import { cutoffKind, type Fund, type MfOrder } from "./data";
import { addBusinessDays, cutoffLabel, fmtDay, inr, isBusinessDay, ordinal } from "./format";

// Order 2.0 status model. The data model (scheduled | inprogress | paymentdone | completed | failed) stays;
// the screens show four UI statuses, mapped here.
export type UiStatus = "initiated" | "inprogress" | "completed" | "failed";

export const UI_STATUS_LABEL: Record<UiStatus, string> = {
  initiated: "Initiated",
  inprogress: "In progress",
  completed: "Completed",
  failed: "Failed",
};

// Failed -> Failed; Completed -> Completed; a redemption stays In progress until the money is sent.
// Purchases: Scheduled (AutoPay debit still to come) and In progress (payment not yet confirmed) -> Initiated;
// Payment done (money in, waiting on allotment) -> In progress.
export function uiStatus(o: MfOrder): UiStatus {
  if (o.status === "failed") return "failed";
  if (o.status === "completed") return "completed";
  if (o.kind === "Redeem") return "inprogress";
  if (o.status === "paymentdone") return "inprogress";
  return "initiated";
}

// ---- Dates ------------------------------------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const placedDate = (o: MfOrder) => new Date(`${o.on}T00:00:00`);

// "16 Nov" -> Date, in the year of the order (rolling into the next year if the month is earlier).
export function parseDay(text: string, refIso: string): Date {
  const [d, m] = text.split(" ");
  const ref = new Date(`${refIso}T00:00:00`);
  const month = Math.max(0, MONTHS.indexOf(m));
  const year = month < ref.getMonth() - 1 ? ref.getFullYear() + 1 : ref.getFullYear();
  return new Date(year, month, Number(d));
}

const yy = (d: Date) => String(d.getFullYear()).slice(2);
export const fmtLong = (d: Date) => `${fmtDay(d)} ’${yy(d)}`; // 16 Nov ’26
export const fmtFull = (d: Date) => `${fmtDay(d)} ${d.getFullYear()}`; // 17 Nov 2026
const fmtMonthLong = (d: Date) => `${ordinal(d.getDate())} ${MONTHS_LONG[d.getMonth()]}`; // 16th November

const prevBusinessDay = (d: Date) => {
  let out = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  while (!isBusinessDay(out)) out = new Date(out.getFullYear(), out.getMonth(), out.getDate() - 1);
  return out;
};

// "12 Nov, 10:42 AM" -> "12 Nov 2026, 10:42 AM"
export const withYear = (stamp: string, d: Date) => stamp.replace(",", ` ${d.getFullYear()},`);

// Stable pseudo ids for the sample: SAHI order id (18 digits) and exchange order id (7 digits).
function digits(seed: string, n: number, prefix = ""): string {
  let h = 17;
  let out = prefix;
  while (out.length < n) {
    for (const c of seed) h = (h * 131 + c.charCodeAt(0)) % 2147483647;
    h = (h * 48271 + out.length) % 2147483647;
    out += String(h);
  }
  return out.slice(0, n);
}
export const sahiOrderId = (o: MfOrder) => digits(o.id, 18, "26");
export const exchangeOrderId = (o: MfOrder) => digits(`x${o.id}`, 7, "8");
export const sipRegnNo = (o: MfOrder) => digits(`r${o.id}`, 9, "5");

export const BANK = "HDFC Bank ••4417";
const WEEKEND = "Weekends (Saturdays and Sundays) and public holidays are non-working days.";

// ---- View model -------------------------------------------------------------------------------------------------

export type StepView = {
  label: string;
  state: "done" | "todo" | "fail";
  time?: string;
  sub?: string;
  showId?: boolean;
  info?: WhyStory; // the "How is the allotment date decided?" sheet, as the same visual story as "What does this mean?"
};

export type DetailView = {
  banner?: { tone: "info" | "ok" | "err"; text: string };
  facts: { label: string; value: string }[];
  steps: StepView[];
  action?: "viewSip" | "investMore" | "retry";
  nav: number;
};

type Ctx = { order: MfOrder; fund: Fund; sipDay: number };

// Purchase (SIP instalment or one-time) and the failed redemption share this layout.
export function purchaseView({ order: o, fund, sipDay }: Ctx): DetailView {
  const sip = o.kind === "SIP";
  const ui = uiStatus(o);
  const a = o.allotment;
  const placed = placedDate(o);
  const debit = o.debitOn ? parseDay(o.debitOn, o.on) : undefined;
  const method = sip ? "UPI AutoPay" : "UPI";
  const payLine = `${BANK} · ${method}`;
  const rejected = o.status === "failed" && o.failure === "rejected";
  const payFailed = o.status === "failed" && !rejected;
  const paid = o.status === "paymentdone" || o.status === "completed" || rejected;
  const payDay = sip ? (debit ?? placed) : o.paidAt ? parseDay(o.paidAt.split(",")[0], o.on) : placed;
  const payTime = o.paidAt ?? (sip && o.debitOn ? o.debitOn : o.placedAt);
  const expected = addBusinessDays(payDay, 3);
  const allotted = a ? (a.allottedOn ? parseDay(a.allottedOn, o.on) : parseDay(a.navDate, o.on)) : undefined;

  // Facts rows
  const amount = inr(o.amount, 2);
  let facts: DetailView["facts"];
  if (ui === "completed" && a) {
    facts = [
      { label: "Amount invested", value: amount },
      { label: "Units allotted", value: a.units.toFixed(3) },
      { label: "NAV", value: inr(a.nav, 4) },
      { label: "NAV date", value: fmtFull(parseDay(a.navDate, o.on)) },
    ];
  } else if (sip) {
    facts = [
      // Scheduled instalment (1st on a reused mandate, or recurring) shows its debit date; mandate-approval stage has none.
      { label: "Amount", value: o.status === "scheduled" && o.debitOn ? `${amount} will be debited on ${o.debitOn}` : amount },
      { label: "Order type", value: "SIP transaction" },
      { label: "Payment", value: `${method} · ${BANK}` },
    ];
  } else {
    facts = [
      { label: "Amount", value: amount },
      { label: "Order type", value: "One-time" },
      { label: "Payment", value: `${method} · ${BANK}` },
    ];
  }

  // Allotment info sheet: the same visual story as "What does this mean?" (steps, the answer, one note).
  let info: WhyStory | undefined;
  const allotStory = (when: { title: string; sub: string }): WhyStory => ({
    steps: [
      { icon: "calendar", title: when.title, sub: when.sub },
      { icon: "clock", title: "Allotted in 2–3 working days", sub: sip ? "Units are usually allotted within 2–3 working days after the debit." : "Units are usually allotted within 2–3 working days." },
    ],
    outcomes: [],
    note: { icon: "info", text: WEEKEND },
  });
  if (sip && debit) {
    const debitTitle = `${o.status === "scheduled" ? "Debit on" : "Debited on"} ${fmtLong(debit)}`;
    if (o.firstInstalment) {
      info = allotStory({ title: debitTitle, sub: "On an existing UPI AutoPay mandate, the 1st debit happens 2 working days after the order." });
    } else {
      const sipOn = new Date(debit.getFullYear(), debit.getMonth(), sipDay);
      if (isBusinessDay(sipOn) || sipOn.getTime() === debit.getTime()) {
        info = allotStory({ title: debitTitle, sub: "Money is debited on your SIP date." });
      } else {
        const why = sipOn.getDay() === 0 || sipOn.getDay() === 6 ? `a ${WEEKDAYS[sipOn.getDay()]}` : "a public holiday";
        info = allotStory({ title: debitTitle, sub: `Your SIP date, ${fmtLong(sipOn)}, is ${why}, so the debit moves to the next working day.` });
      }
    }
  } else if (!sip) {
    const before = o.navDate === fmtDay(payDay);
    const cut = cutoffLabel(cutoffKind(fund)).replace(/^(\d+) PM$/, "$1:00 PM");
    info = allotStory({
      title: `Payment reached the fund house on ${fmtLong(payDay)}`,
      sub: before ? `Before the ${cut} cut-off.` : `After the ${cut} cut-off, so it counts on the next working day.`,
    });
  }

  // Banner
  let banner: DetailView["banner"];
  if (rejected) banner = { tone: "err", text: o.failReason ?? "The fund house couldn’t process this order, so no units were allotted." };
  else if (payFailed)
    banner = {
      tone: "err",
      text: sip
        ? `The AutoPay debit from ${BANK} failed, so this instalment wasn’t invested.`
        : "Your payment didn’t go through, so this order wasn’t placed with the fund house.",
    };
  else if (o.status === "paymentdone") banner = { tone: "info", text: `Payment received. Units will be allotted by ${fmtDay(expected)}.` };

  // Steps
  const steps: StepView[] = [{ label: "Order placed on SAHI", state: "done", time: o.placedAt, showId: true }];
  if (payFailed) {
    steps.push({ label: "Payment failed", state: "fail", time: payTime, sub: payLine });
  } else {
    steps.push(
      paid
        ? { label: "Payment confirmed", state: "done", time: payTime, sub: payLine }
        : {
            label: "Payment confirmed",
            state: "todo",
            sub: o.status === "scheduled" && o.debitOn ? `Debit on ${o.debitOn}` : sip ? "Waiting for mandate approval" : "Waiting for payment",
          },
    );
    if (rejected) steps.push({ label: "Order rejected", state: "fail", sub: "Rejected by the fund house" });
    else if (ui === "completed" && allotted) steps.push({ label: "Units allotted", state: "done", time: fmtFull(allotted) });
    else if (ui === "initiated" && o.status !== "scheduled") steps.push({ label: "Units allotted", state: "todo" });
    else steps.push({ label: "Units allotted", state: "todo", sub: `Expected by ${fmtDay(expected)}`, info });
  }

  return {
    banner,
    facts,
    steps,
    nav: a?.nav ?? fund.nav,
    action:
      ui === "completed" ? (sip ? undefined : "investMore") : ui === "failed" ? (sip ? undefined : "retry") : undefined,
  };
}

export type WhyStory = {
  steps: { icon?: IconName; glyph?: string; title: string; sub: string }[];
  outcomes: { icon: IconName; tone: "up" | "down"; title: string; sub: string }[];
  note: { icon: IconName; text: string };
};

// Redemption, not failed: pending and completed share the full-page layout.
export type RedeemView = {
  done: boolean;
  head: { label: string; value: string };
  rows: { label: string; value: string }[];
  steps: StepView[];
  why: {
    title: string;
    bullets: string[];
    // The same explanation as a short visual story: steps, what can happen to the amount, one note.
    story: WhyStory;
  };
  nav: number;
};

export function redeemView({ order: o, fund }: Ctx): RedeemView {
  const done = o.status === "completed";
  const a = o.allotment;
  const placed = placedDate(o);
  const navDay = parseDay(o.navDate, o.on);
  const units = a?.units ?? o.units ?? 0;
  const credit = o.creditBy ? parseDay(o.creditBy, o.on) : addBusinessDays(navDay, 2);
  const creditText = o.creditBy ?? fmtDay(credit);
  const credited = a ? a.units * a.nav : o.amount;
  const unitsText = units.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const before = o.navDate === fmtDay(placed);
  const cut = cutoffLabel(cutoffKind(fund)).replace(/^(\d+) PM$/, "$1:00 PM");
  const latest = prevBusinessDay(placed);
  const latestNav = units ? o.amount / units : fund.nav;
  const cutText = `Your order was placed ${before ? "before" : "after"} the ${cut} cut-off, so the fund house `;
  const when = before ? `the NAV of ${o.navDate}` : `the NAV of the next working day, ${o.navDate}`;
  const byUnits = o.redeemBy === "units";
  const askedTitle = byUnits ? `You asked for ${unitsText} units` : `You asked for ${inr(o.amount, 2)}`;
  const askedSub = byUnits
    ? `Worth about ${inr(o.amount, 2)} at ${inr(latestNav, 4)} (${fmtDay(latest)} NAV)`
    : `About ${unitsText} units at ${inr(latestNav, 4)} (${fmtDay(latest)} NAV)`;
  const l1 = byUnits
    ? `You asked to redeem ${unitsText} units. Using the NAV of ${fmtDay(latest)} (${inr(latestNav, 4)}), the latest published, that is about ${inr(o.amount, 2)}.`
    : `You asked to redeem ${inr(o.amount, 2)}. We converted this to ${unitsText} units using the NAV of ${fmtDay(latest)} (${inr(latestNav, 4)}), the latest published.`;
  const than = byUnits ? "the estimate" : "you asked for";
  const exitNote = "Exit load and STT may be deducted, depending on your holdings.";
  const exit = "Depending on your holdings, the fund house may deduct an exit load, and STT (Securities Transaction Tax) may apply, from the amount.";

  let why: RedeemView["why"];
  if (done && a) {
    const diff = Math.abs(credited - o.amount);
    const higher = credited >= o.amount;
    why = {
      title: `Why the amount can differ from ${byUnits ? "about " : ""}${inr(o.amount, 0)}`,
      bullets: [
        l1,
        `${cutText}redeemed at ${when}, ${inr(a.nav, 4)}. The amount you received is based on this NAV.`,
        exit,
      ],
      // Order is done, so past tense and no "if the NAV rises": generic, no amount promised.
      story: {
        steps: [
          { glyph: byUnits ? "#" : "₹", title: byUnits ? `You asked to redeem ${unitsText} units` : `You asked to redeem ${inr(o.amount, 2)}`, sub: `Order placed on ${o.placedAt}` },
          { icon: "clock", title: `The NAV of ${o.navDate} was used`, sub: before ? `Your order was placed before the ${cut} cut-off, so that day’s NAV applied.` : `Your order was placed after the ${cut} cut-off, so the next working day’s NAV applied.` },
          { icon: "chart-line", title: "The amount you got depends on the NAV", sub: `So it can differ from ${byUnits ? "about " : ""}${inr(o.amount, 0)}.` },
        ],
        outcomes: [],
        note: { icon: "info", text: "Exit load and STT may have been deducted, depending on your holdings." },
      },
    };
  } else {
    why = {
      title: `Why you may get more or less than ${byUnits ? "about " : ""}${inr(o.amount, 0)}`,
      bullets: [
        l1,
        `${cutText}redeems at ${when}${before ? ". That NAV is published only in the evening" : ""}. If it’s higher or lower, the amount you receive changes too.`,
        exit,
      ],
      // Pending (placed or exchange-confirmed): one plain story, no promises about the final amount.
      story: {
        steps: [
          { glyph: byUnits ? "#" : "₹", title: byUnits ? `You asked to redeem ${unitsText} units` : `You asked to redeem ${inr(o.amount, 2)}`, sub: `Order placed on ${o.placedAt}` },
          { icon: "clock", title: `The NAV of ${o.navDate} applies`, sub: before ? `Your order was placed before the ${cut} cut-off, so that day’s NAV is used.` : `Your order was placed after the ${cut} cut-off, so the next working day’s NAV is used.` },
          { icon: "chart-line", title: "The amount you get can change", sub: `It depends on the NAV, so it may be more or less than ${byUnits ? "about " : ""}${inr(o.amount, 0)}.` },
        ],
        outcomes: [
          { icon: "chart-line", tone: "up", title: "If the NAV rises", sub: "You get more" },
          { icon: "trend-down", tone: "down", title: "If the NAV falls", sub: "You get less" },
        ],
        note: { icon: "info", text: exitNote },
      },
    };
  }

  // What the user asked for leads; the other figure is the estimate.
  const requested = byUnits
    ? [{ label: "Estimated amount", value: inr(o.amount, 2) }, { label: "Units requested", value: unitsText }]
    : [{ label: "Amount requested", value: inr(o.amount, 2) }, { label: "Units", value: unitsText }];

  const confirmed = !!o.exchangeConfirmed || done;
  const steps: StepView[] = [
    { label: "Order initiated", state: "done", time: withYear(o.placedAt, placed) },
    confirmed
      ? { label: "Order confirmed with exchange", state: "done", time: `${fmtFull(navDay)}, 6:30 PM` }
      : { label: "Order confirmed with exchange", state: "todo" },
    done
      ? { label: "Money sent to bank", state: "done", time: fmtFull(credit) }
      : { label: "Money sent to bank", state: "todo", sub: `Expected by ${creditText}` },
  ];

  return {
    done,
    head: done ? { label: `Amount credited on ${creditText}`, value: inr(credited, 2) } : { label: "Estimated amount credit date", value: creditText },
    rows: done
      ? [
          ...requested,
          { label: "NAV applicable date", value: a?.navDate ?? o.navDate },
          { label: "Applicable NAV", value: inr(a?.nav ?? fund.nav, 4) },
        ]
      : [
          ...requested,
          { label: "NAV applicable date", value: o.navDate },
        ],
    steps,
    why,
    nav: a?.nav ?? fund.nav,
  };
}

// Failed redemption uses the purchase layout: banner, facts, two steps, Retry.
export function redeemFailedView({ order: o, fund }: Ctx): DetailView {
  const units = (o.units ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return {
    banner: {
      tone: "err",
      text: o.failReason ?? "Your redemption was rejected because the units weren’t authorised from your demat account (eDIS). No units were redeemed.",
    },
    facts: [
      ...(o.redeemBy === "units"
        ? [{ label: "Estimated amount", value: inr(o.amount, 2) }, { label: "Units requested", value: units }]
        : [{ label: "Amount requested", value: inr(o.amount, 2) }, { label: "Units", value: units }]),
      { label: "Credit to", value: BANK },
    ],
    steps: [
      { label: "Order placed on SAHI", state: "done", time: o.placedAt, showId: true },
      { label: "Order rejected", state: "fail", time: o.placedAt },
    ],
    action: "retry",
    nav: fund.nav,
  };
}
