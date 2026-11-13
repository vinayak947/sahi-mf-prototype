import type { MfOrder } from "./data";

// Order 2.0 status samples: one order per state of the status screens (SIP, one-time, redemption),
// added to the invested sample data. Open each from the Orders list; the report names which is which.
// Dates sit inside the last three months of the prototype's "today" (13 Nov 2026).
export const statusSampleOrders: MfOrder[] = [
  // ---- SIP ----
  { id: "s-sip-init", fundId: "pp-flexi", kind: "SIP", amount: 1000, status: "inprogress", on: "2026-11-12", placedAt: "12 Nov, 10:42 AM", navDate: "12 Nov", sipDay: 5 },
  { id: "s-sip-first", fundId: "hdfc-flexi", kind: "SIP", amount: 1000, status: "scheduled", on: "2026-11-12", placedAt: "12 Nov, 10:42 AM", navDate: "16 Nov", debitOn: "16 Nov", firstInstalment: true, sipDay: 5 },
  { id: "s-sip-recur", fundId: "bandhan-small", kind: "SIP", amount: 1000, status: "scheduled", on: "2026-11-13", placedAt: "13 Nov, 9:00 AM", navDate: "20 Nov", debitOn: "20 Nov", sipDay: 20 },
  { id: "s-sip-paid", fundId: "quant-flexi", kind: "SIP", amount: 1500, status: "paymentdone", on: "2026-11-06", placedAt: "6 Nov, 10:42 AM", navDate: "11 Nov", debitOn: "11 Nov", paidAt: "11 Nov, 9:30 AM", firstInstalment: true, sipDay: 25 },
  {
    id: "s-sip-done", fundId: "bandhan-small", kind: "SIP", amount: 1000, status: "completed", on: "2026-11-03", placedAt: "3 Nov, 10:42 AM", navDate: "5 Nov",
    debitOn: "5 Nov", paidAt: "5 Nov, 9:30 AM", sipDay: 20, firstInstalment: true,
    allotment: { folio: "9098694/09", navDate: "5 Nov", nav: 51.8834, units: 19.274, allottedOn: "9 Nov" },
  },
  { id: "s-sip-fail", fundId: "icici-bluechip", kind: "SIP", amount: 1000, status: "failed", on: "2026-11-02", placedAt: "2 Nov, 10:42 AM", navDate: "4 Nov", debitOn: "4 Nov", paidAt: "4 Nov, 9:30 AM", failure: "payment", sipDay: 5 },
  // ---- One-time ----
  { id: "s-ot-init", fundId: "hdfc-mid", kind: "Lumpsum", amount: 5000, status: "inprogress", on: "2026-11-13", placedAt: "13 Nov, 10:42 AM", navDate: "13 Nov" },
  { id: "s-ot-paid", fundId: "nippon-small", kind: "Lumpsum", amount: 5000, status: "paymentdone", on: "2026-11-12", placedAt: "12 Nov, 10:42 AM", navDate: "12 Nov", paidAt: "12 Nov, 10:43 AM" },
  {
    id: "s-ot-done", fundId: "bandhan-small", kind: "Lumpsum", amount: 5000, status: "completed", on: "2026-11-05", placedAt: "5 Nov, 10:42 AM", navDate: "5 Nov",
    paidAt: "5 Nov, 10:43 AM", allotment: { folio: "9098694/09", navDate: "5 Nov", nav: 51.8834, units: 96.372, allottedOn: "9 Nov" },
  },
  { id: "s-ot-fail", fundId: "icici-bluechip", kind: "Lumpsum", amount: 5000, status: "failed", on: "2026-11-01", placedAt: "1 Nov, 10:42 AM", navDate: "2 Nov", failure: "payment", paidAt: "1 Nov, 10:52 AM" },
  // ---- Redemption ----
  { id: "s-red-init", fundId: "pp-flexi", kind: "Redeem", amount: 10000, status: "inprogress", on: "2026-11-13", placedAt: "13 Nov, 11:05 AM", navDate: "13 Nov", units: 185.452, creditBy: "17 Nov" },
  { id: "s-red-conf", fundId: "sbi-bluechip", kind: "Redeem", amount: 10000, status: "inprogress", on: "2026-11-12", placedAt: "12 Nov, 11:05 AM", navDate: "12 Nov", units: 185.452, creditBy: "16 Nov", exchangeConfirmed: true },
  {
    id: "s-red-done", fundId: "hdfc-mid", kind: "Redeem", amount: 10000, status: "completed", on: "2026-11-03", placedAt: "3 Nov, 11:05 AM", navDate: "3 Nov", units: 185.452, creditBy: "5 Nov",
    exchangeConfirmed: true, allotment: { folio: "9098694/09", navDate: "3 Nov", nav: 54.0026, units: 185.452 },
  },
  { id: "s-red-fail", fundId: "icici-bluechip", kind: "Redeem", amount: 10000, status: "failed", on: "2026-10-25", placedAt: "25 Oct, 11:05 AM", navDate: "25 Oct", units: 185.452, creditBy: "28 Oct", failure: "rejected" },
];
