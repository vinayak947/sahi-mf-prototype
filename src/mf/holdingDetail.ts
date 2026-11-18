// Holding-details figures for the funds whose holding is spelled out beyond invested / current / units: the folio, XIRR,
// average and latest NAV and the transaction list. Figures verified against the Holding details board of the PM
// prototype artifact (Bandhan Small Cap Fund). Funds without an entry here show the plain holding.
export type HoldingTxn = { kind: "SIP" | "One-time"; date: string; amount: number; units: number; nav: number };

export type HoldingDetail = {
  folio: string;
  xirr: number; // % a year
  avgNav: number;
  latestNav: number;
  latestNavDate: string; // "4 Nov"
  transactions: HoldingTxn[]; // newest first; a reversal carries negative amount and units
};

const bandhanTransactions: HoldingTxn[] = [
  { kind: "SIP", date: "15 Oct 2020", amount: 2500.0, units: 3.449, nav: 724.79 },
  { kind: "SIP", date: "15 Sep 2020", amount: 2500.0, units: 3.453, nav: 724.0 },
  { kind: "SIP", date: "17 Aug 2020", amount: 2500.0, units: 3.55, nav: 704.21 },
  { kind: "SIP", date: "15 Jul 2020", amount: 2500.0, units: 3.58, nav: 698.42 },
  { kind: "SIP", date: "15 Jun 2020", amount: 2500.0, units: 3.726, nav: 671.05 },
  { kind: "SIP", date: "15 May 2020", amount: 2500.0, units: 3.905, nav: 640.18 },
  { kind: "SIP", date: "15 Apr 2020", amount: 2500.0, units: 4.08, nav: 612.77 },
  { kind: "SIP", date: "16 Mar 2020", amount: 2500.0, units: 4.249, nav: 588.34 },
  { kind: "SIP", date: "17 Feb 2020", amount: 2500.0, units: 3.812, nav: 655.9 },
  { kind: "SIP", date: "15 Jan 2020", amount: 2500.0, units: 3.741, nav: 668.21 },
  { kind: "SIP", date: "16 Dec 2019", amount: 2500.0, units: 3.78, nav: 661.44 },
  { kind: "SIP", date: "15 Nov 2019", amount: 2500.0, units: 3.805, nav: 657.08 },
  { kind: "SIP", date: "15 Oct 2019", amount: 2500.0, units: 3.832, nav: 652.33 },
  { kind: "SIP", date: "16 Sep 2019", amount: 2500.0, units: 3.847, nav: 649.87 },
  { kind: "SIP", date: "16 Aug 2019", amount: 2500.0, units: 3.816, nav: 655.12 },
  { kind: "SIP", date: "15 Jul 2019", amount: 2500.0, units: 3.786, nav: 660.4 },
  { kind: "SIP", date: "17 Jun 2019", amount: 2500.0, units: 3.795, nav: 658.73 },
  { kind: "SIP", date: "15 May 2019", amount: 2500.0, units: 3.839, nav: 651.22 },
  { kind: "SIP", date: "15 Apr 2019", amount: 2500.0, units: 3.865, nav: 646.9 },
  { kind: "SIP", date: "15 Mar 2019", amount: 2500.0, units: 3.881, nav: 644.18 },
  { kind: "SIP", date: "15 Feb 2019", amount: 2500.0, units: 3.909, nav: 639.55 },
  { kind: "SIP", date: "15 Jan 2019", amount: 2500.0, units: 3.9, nav: 641.07 },
  { kind: "SIP", date: "17 Dec 2018", amount: 2500.0, units: 3.883, nav: 643.82 },
  { kind: "SIP", date: "11 Oct 2018", amount: -2500.0, units: -3.861, nav: 647.53 },
  { kind: "SIP", date: "11 Oct 2018", amount: 2500.0, units: 3.861, nav: 647.53 },
];

export const holdingDetails: Record<string, HoldingDetail> = {
  "bandhan-small": {
    folio: "1038051791",
    xirr: 15.61,
    avgNav: 689.56,
    latestNav: 1914.29,
    latestNavDate: "4 Nov",
    transactions: bandhanTransactions,
  },
};
