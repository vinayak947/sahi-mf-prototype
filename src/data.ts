// Sample (placeholder) market data, transcribed from the reference screens.
// None of these numbers are live.

export type Quote = {
  name: string;
  value: string;
  change: string;
  exchange?: string;
};

export const indices: Quote[] = [
  { name: "NIFTY50", value: "22520.45", change: "+98.50 (0.44%)" },
  { name: "SENSEX", value: "72472.33", change: "+562.63 (0.78%)" },
  { name: "BANKNIFTY", value: "55256.65", change: "+805.90 (1.48%)" },
  { name: "FINNIFTY", value: "24310.15", change: "+120.20 (0.50%)" },
];

export const recentlyViewed: Quote[] = [
  { name: "Inox Wind", value: "66.65", exchange: "NSE", change: "-2.10 (3.05%)" },
  {
    name: "Jubilant Pharmova",
    value: "931.90",
    exchange: "NSE",
    change: "-67.40 (6.74%)",
  },
  {
    name: "Crude Oil Mini 19 Oct",
    value: "8890.00",
    exchange: "MCX",
    change: "-23.00 (0.26%)",
  },
];

export const scannerRows: (Quote & { exchange: string })[] = [
  { name: "NTPC", value: "312.00", exchange: "NSE", change: "-3.10 (0.98%)" },
  {
    name: "Signatureglobal India",
    value: "713.00",
    exchange: "NSE",
    change: "-24.45 (3.32%)",
  },
  {
    name: "Avenue Supermarts",
    value: "3516.80",
    exchange: "NSE",
    change: "-296.20 (7.77%)",
  },
  {
    name: "KEC International",
    value: "369.85",
    exchange: "NSE",
    change: "-2.50 (0.67%)",
  },
];

export const indexScalper = [
  { name: "NIFTY50", sub: "Expiry in 2D", accent: true },
  { name: "SENSEX" },
  { name: "BANKNIFTY" },
  { name: "FINNIFTY" },
  { name: "MIDCPNIFTY" },
];

export const commodityScalper = [
  { name: "Crude Oil Mini", sub: "MCX" },
  { name: "Natural Gas Mini", sub: "MCX" },
  { name: "Gold Mini", sub: "MCX" },
  { name: "Silver Mini", sub: "MCX" },
  { name: "Crude Oil", sub: "MCX" },
  { name: "Natural Gas", sub: "MCX" },
  { name: "Crude Oil", sub: "NSE" },
];

export const commodityOptionChain = [
  { name: "Crude Oil Mini", sub: "MCX" },
  { name: "Natural Gas Mini", sub: "MCX" },
  { name: "Gold Mini", sub: "MCX" },
  { name: "Silver Mini", sub: "MCX" },
  { name: "Crude Oil", sub: "MCX" },
  { name: "Natural Gas", sub: "MCX" },
];

export type CommodityRowData = Quote & { exchange: string; icon: string };

export const topTradedCommodity: CommodityRowData[] = [
  { name: "Crude Oil Mini", exchange: "MCX", value: "8890.00", change: "-23.00 (0.26%)", icon: "18742.png" },
  { name: "Crude Oil", exchange: "MCX", value: "8898.00", change: "-18.00 (0.20%)", icon: "18742.png" },
  { name: "Natural Gas Mini", exchange: "MCX", value: "313.70", change: "+26.20 (9.11%)", icon: "243fe.png" },
  { name: "Natural Gas", exchange: "MCX", value: "313.70", change: "+26.20 (9.11%)", icon: "243fe.png" },
  { name: "Gold Mini", exchange: "MCX", value: "150171.00", change: "+1116.00 (0.75%)", icon: "83ce0.png" },
  { name: "Silver Mini", exchange: "MCX", value: "227946.00", change: "-102.00 (0.04%)", icon: "02a98.png" },
];

export const topTradedFutures: CommodityRowData[] = [
  { name: "Natural Gas Mini 27 Oct Fut", exchange: "MCX", value: "313.70", change: "+26.20 (9.11%)", icon: "243fe.png" },
  { name: "Gold Petal 30 Oct Fut", exchange: "MCX", value: "15116.00", change: "+114.00 (0.76%)", icon: "83ce0.png" },
  { name: "Crude Oil Mini 19 Oct Fut", exchange: "MCX", value: "8890.00", change: "-23.00 (0.26%)", icon: "18742.png" },
  { name: "Natural Gas 27 Oct Fut", exchange: "MCX", value: "313.70", change: "+26.20 (9.11%)", icon: "243fe.png" },
  { name: "Gold Petal 30 Nov Fut", exchange: "MCX", value: "15243.00", change: "+105.00 (0.69%)", icon: "83ce0.png" },
  { name: "Silver Micro 30 Nov Fut", exchange: "MCX", value: "228000.00", change: "-108.00 (0.05%)", icon: "02a98.png" },
];

export const commodityCategories = [
  { name: "Crude Oil", change: "-0.20%", icon: "18742.png" },
  { name: "Natural Gas", change: "+9.11%", icon: "243fe.png" },
  { name: "Gold", change: "+0.74%", icon: "83ce0.png" },
  { name: "Silver", change: "-0.03%", icon: "02a98.png" },
  { name: "Copper", change: "+1.98%", icon: "8cd7a.png" },
  { name: "Aluminium", change: "-0.33%", icon: "31b7c.png" },
  { name: "Zinc", change: "+2.81%", icon: "fd1ce.png" },
  { name: "Electricity", change: "+11.27%", icon: "f526d.png" },
];

// Sector heatmap: position / size in % of the map, and a heat step.
export type HeatStep = "n3" | "n2" | "n1" | "p1" | "p2" | "p3";
export const sectors: {
  name: string;
  value: string;
  step: HeatStep;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  { name: "Financial Services", value: "1.68%", step: "p2", x: 0, y: 0, w: 51.7, h: 50.3 },
  { name: "Energy", value: "-1.65%", step: "n2", x: 0, y: 51.8, w: 51.7, h: 48.2 },
  { name: "Auto", value: "-2.07%", step: "n3", x: 52.8, y: 0, w: 23.8, h: 38.5 },
  { name: "IT", value: "0.95%", step: "p1", x: 77.8, y: 0, w: 22.2, h: 38.5 },
  { name: "FMCG", value: "2.45%", step: "p3", x: 52.8, y: 39.9, w: 23.1, h: 36.2 },
  { name: "Metal", value: "-3.69%", step: "n3", x: 77, y: 39.9, w: 23, h: 36.2 },
  { name: "Pharma", value: "-1.33%", step: "n2", x: 52.8, y: 77.4, w: 34.1, h: 22.6 },
  { name: "Realty", value: "-3.72%", step: "n3", x: 88, y: 77.4, w: 12, h: 19.2 },
  { name: "", value: "", step: "p1", x: 88, y: 97.5, w: 12, h: 2.5 },
];

export const heatLegend: { label: string; step: HeatStep }[] = [
  { label: "< -2%", step: "n3" },
  { label: "-2%", step: "n2" },
  { label: "-1%", step: "n1" },
  { label: "+1%", step: "p1" },
  { label: "+2%", step: "p2" },
  { label: "> +2%", step: "p3" },
];

// Intraday chart shapes, as [x, y] with both in 0..1 (y = 1 is the top).
export const niftySeries: [number, number][] = [
  [0, 0.11], [0.01, 0.11], [0.04, 0.04], [0.08, 0.1], [0.1, 0.22], [0.11, 0.34],
  [0.13, 0.46], [0.15, 0.57], [0.17, 0.66], [0.2, 0.7], [0.225, 0.74], [0.24, 0.78],
  [0.26, 0.75], [0.28, 0.81], [0.295, 0.76], [0.315, 0.8], [0.335, 0.77], [0.35, 0.81],
  [0.375, 0.86], [0.4, 0.82], [0.46, 0.78], [0.495, 0.69], [0.52, 0.76], [0.535, 0.72],
  [0.585, 0.75], [0.62, 0.82], [0.64, 0.87], [0.66, 0.79], [0.7, 0.83], [0.74, 0.86],
  [0.76, 0.89], [0.79, 0.93], [0.81, 0.92], [0.835, 0.97], [0.86, 0.94], [0.895, 0.92],
  [0.93, 0.95], [0.95, 0.9], [1, 0.87],
];

export const crudeSeries: [number, number][] = [
  [0, 0.61], [0.01, 0.78], [0.03, 0.84], [0.04, 0.8], [0.05, 0.52], [0.07, 0.26],
  [0.09, 0.2], [0.12, 0.13], [0.15, 0.12], [0.17, 0.05], [0.19, 0.02], [0.21, 0.1],
  [0.23, 0.05], [0.26, 0.13], [0.28, 0.28], [0.3, 0.34], [0.32, 0.38], [0.34, 0.3],
  [0.36, 0.22], [0.38, 0.13], [0.4, 0.07], [0.43, 0.3], [0.45, 0.26], [0.47, 0.38],
  [0.49, 0.22], [0.51, 0.16], [0.54, 0.37], [0.56, 0.3], [0.58, 0.21], [0.6, 0.18],
  [0.63, 0.12], [0.65, 0.25], [0.67, 0.6], [0.69, 0.8], [0.71, 0.45], [0.73, 0.36],
  [0.74, 0.5], [0.76, 0.62], [0.78, 0.72], [0.8, 0.7], [0.83, 0.88], [0.85, 0.72],
  [0.87, 0.8], [0.89, 0.97], [0.91, 0.92], [0.93, 0.58], [0.95, 0.5], [0.97, 0.6],
  [1, 0.87],
];

// Watchlist / Orders / Portfolio
export const orders = [
  { venue: "NSE", kind: "Delivery", name: "Titan Company", side: "S", qty: "0/5", ltp: "4410.00", detail: [["SL Trigger", "2709.10"], ["Limit", "2709.10"]] },
  { venue: "NSE", kind: "Delivery", name: "Titan Company", side: "S", qty: "0/5", ltp: "4410.00", detail: [["TP Trigger", "5417.00"], ["Limit", "5417.00"]] },
  { venue: "NSE", kind: "Delivery", name: "Bajaj Auto", side: "B", qty: "0/1", ltp: "9778.00", detail: [["Limit", "10017.00"]], amo: true },
];

export const holdings = [
  { name: "Vodafone Idea", ai: false, tag: "", pl: "+₹24.00", plPct: "(85.71%)", invested: "₹28.00", current: "₹52.00" },
  { name: "Yes Bank", ai: true, tag: "", pl: "-₹3.00", plPct: "(-4.65%)", invested: "₹64.50", current: "₹61.50" },
  { name: "Titan Company", ai: true, tag: "SL & TP set", pl: "+₹7,050", plPct: "(47.00%)", invested: "₹15,000", current: "₹22,050" },
  { name: "Lemon Tree Hotels", ai: true, tag: "", pl: "-₹141", plPct: "(-17.60%)", invested: "₹804", current: "₹663" },
];
