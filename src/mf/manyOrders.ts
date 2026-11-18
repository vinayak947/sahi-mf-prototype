import { folioFor, funds, type MfOrder } from "./data";

// Prototype-only: a long order history (about 10 a month, going back 2.5 years) so the Orders list's lazy load can be
// shown. Dev panel → "Long order history". Ids start with "g-" so the switch can take them out again.
export const GENERATED_PREFIX = "g-";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AMOUNTS = [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000, 25000];

// Small seeded generator: the same list every time.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function generateOrders(count = 300): MfOrder[] {
  const rand = rng(42);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const day0 = new Date(2026, 9, 31); // newest generated order: 31 Oct 2026, older than the hand-made samples
  const out: MfOrder[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(day0);
    d.setDate(d.getDate() - Math.round(i * 3.05 + rand() * 2));
    const fund = pick(funds);
    const r = rand();
    const kind: MfOrder["kind"] = r < 0.55 ? "SIP" : r < 0.9 ? "Lumpsum" : "Redeem";
    const amount = pick(AMOUNTS);
    const failed = rand() < 0.07;
    const hour = 9 + Math.floor(rand() * 8);
    const min = String(Math.floor(rand() * 60)).padStart(2, "0");
    const dayLabel = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const on = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const order: MfOrder = {
      id: `${GENERATED_PREFIX}${i}`,
      fundId: fund.id,
      kind,
      amount,
      status: failed ? "failed" : "completed",
      on,
      placedAt: `${dayLabel}, ${hour > 12 ? hour - 12 : hour}:${min} ${hour >= 12 ? "PM" : "AM"}`,
      navDate: dayLabel,
    };
    if (kind === "SIP") order.sipDay = d.getDate();
    if (failed) {
      order.failure = "payment";
      order.paidAt = order.placedAt;
    } else if (kind === "Redeem") {
      const units = Math.round((amount / fund.nav) * 1000) / 1000;
      order.units = units;
      order.creditBy = dayLabel;
    } else {
      const nav = Math.round(fund.nav * (0.7 + rand() * 0.3) * 100) / 100;
      order.paidAt = order.placedAt;
      order.allotment = { folio: folioFor(fund.id), navDate: dayLabel, nav, units: Math.round((amount / nav) * 1000) / 1000, allottedOn: dayLabel };
    }
    out.push(order);
  }
  return out;
}
