import { useState } from "react";
import { FilterSortSheet } from "./FilterSortSheet";
import { DlsTab } from "../ui/widgets";
import { Icon } from "../ui/Icon";
import { DlsBadge, DlsBottomSheet, DlsCard, DlsKvStacked, DlsTimeline, type TimelineItem } from "../ui/dls";

// Order book for Stocks and F&O inside the Orders tab. Tabs as in the SAHI app: "Open · 4", Completed, Rejected, Cancelled;
// Sample data only.

type Status = "pending" | "trigger" | "partial" | "completed" | "cancelled" | "rejected" | "expired";
type Tab = "open" | "completed" | "rejected" | "cancelled";

export type Row = {
  venue: string;
  kind: string;
  name: string;
  side: "B" | "S";
  qty: string;
  ltp: string;
  detail: [string, string][];
  status: Status;
  amo?: boolean;
};

const STATUS: Record<Status, { tab: Tab }> = {
  pending: { tab: "open" },
  trigger: { tab: "open" },
  partial: { tab: "open" },
  completed: { tab: "completed" },
  cancelled: { tab: "cancelled" },
  rejected: { tab: "rejected" },
  expired: { tab: "cancelled" },
};

export const STOCKS: Row[] = [
  { venue: "NSE", kind: "Delivery", name: "Titan Company", side: "S", qty: "0/5", ltp: "4410.00", detail: [["SL Trigger", "2709.10"], ["Limit", "2709.10"]], status: "trigger" },
  { venue: "NSE", kind: "Delivery", name: "Titan Company", side: "S", qty: "0/5", ltp: "4410.00", detail: [["TP Trigger", "5417.00"], ["Limit", "5417.00"]], status: "trigger" },
  { venue: "NSE", kind: "Delivery", name: "Bajaj Auto", side: "B", qty: "0/1", ltp: "9778.00", detail: [["Limit", "10017.00"]], status: "pending", amo: true },
  { venue: "NSE", kind: "Intraday", name: "Tata Motors", side: "B", qty: "6/10", ltp: "712.40", detail: [["Limit", "710.00"]], status: "partial" },
  { venue: "NSE", kind: "Delivery", name: "Reliance Industries", side: "B", qty: "5/5", ltp: "1284.30", detail: [["Avg", "1281.55"], ["Market", ""]], status: "completed" },
  { venue: "NSE", kind: "Intraday", name: "Infosys", side: "S", qty: "20/20", ltp: "1562.10", detail: [["Avg", "1564.80"], ["Limit", "1564.00"]], status: "completed" },
  { venue: "NSE", kind: "Delivery", name: "Yes Bank", side: "B", qty: "0/100", ltp: "21.46", detail: [["Limit", "20.50"]], status: "cancelled" },
  { venue: "NSE", kind: "Intraday", name: "ITC", side: "B", qty: "0/50", ltp: "418.20", detail: [["Limit", "417.00"]], status: "expired" },
  { venue: "NSE", kind: "Delivery", name: "HDFC Bank", side: "B", qty: "0/25", ltp: "1741.00", detail: [["Market", ""]], status: "rejected" },
  { venue: "NSE", kind: "Delivery", name: "Vodafone Idea", side: "S", qty: "0/10", ltp: "8.46", detail: [["Limit", "9.00"]], status: "cancelled" },
];

export const FNO: Row[] = [
  { venue: "NFO", kind: "Intraday", name: "NIFTY 24 Nov 24500 CE", side: "B", qty: "0/75", ltp: "132.40", detail: [["Limit", "128.00"]], status: "pending" },
  { venue: "NFO", kind: "Intraday", name: "BANKNIFTY 24 Nov 52000 PE", side: "S", qty: "0/30", ltp: "246.15", detail: [["SL Trigger", "300.00"], ["Limit", "305.00"]], status: "trigger" },
  { venue: "NFO", kind: "Intraday", name: "NIFTY NOV FUT", side: "B", qty: "150/300", ltp: "24518.60", detail: [["Limit", "24510.00"]], status: "partial" },
  { venue: "NFO", kind: "Intraday", name: "FINNIFTY 25 Nov 23800 CE", side: "S", qty: "40/40", ltp: "88.20", detail: [["Avg", "90.45"], ["Market", ""]], status: "completed" },
  { venue: "NFO", kind: "Intraday", name: "NIFTY 24 Nov 24400 PE", side: "B", qty: "75/75", ltp: "61.75", detail: [["Avg", "59.30"], ["Limit", "60.00"]], status: "completed" },
  { venue: "NFO", kind: "Intraday", name: "BANKNIFTY NOV FUT", side: "S", qty: "0/15", ltp: "52184.00", detail: [["Limit", "52300.00"]], status: "cancelled" },
  { venue: "NFO", kind: "Intraday", name: "NIFTY 24 Nov 24600 CE", side: "B", qty: "0/150", ltp: "74.90", detail: [["Market", ""]], status: "rejected" },
  { venue: "NFO", kind: "Intraday", name: "SENSEX 20 Nov 80500 CE", side: "B", qty: "0/20", ltp: "95.10", detail: [["Limit", "90.00"]], status: "expired" },
];

const toast = (text: string) => window.dispatchEvent(new CustomEvent("proto-toast", { detail: text }));
const val = (o: Row, label: string) => o.detail.find(([l]) => l === label)?.[1];

const PILL: Record<Tab, { tone: "attentive" | "positive" | "negative" | "neutral" }> = {
  open: { tone: "attentive" },
  completed: { tone: "positive" },
  rejected: { tone: "negative" },
  cancelled: { tone: "neutral" },
};
const STATUS_WORD: Record<Status, string> = { pending: "pending", trigger: "pending", partial: "pending", completed: "completed", cancelled: "cancelled", rejected: "rejected", expired: "expired" };

// The order sheet as it looks in the live app: name with a share icon, "MCX • Normal • LTP", a status pill, one card of
// stacked facts, an "Order details" timeline card, a quick "Buy at Mkt" tile, and Cancel / Modify under it.
function OrderSheet({ order: o, index, onClose }: { order: Row; index: number; onClose: () => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tab = STATUS[o.status].tab;
  const open = tab === "open";
  const sell = o.side === "S";
  const fno = o.venue === "NFO" || o.venue === "MCX";
  const [filled, total] = o.qty.split("/");
  const limit = val(o, "Limit");
  const avg = val(o, "Avg");
  const trigger = val(o, "SL Trigger") ?? val(o, "TP Trigger");
  const price = limit ? `Limit: ${limit}` : "Market";
  const stamp = `17 Nov 0${8 + (index % 2)}:${String((17 + index * 9) % 60).padStart(2, "0")}:59 PM`;
  const sahiId = String(2611000000000000 + ((o.name.length * 7919 + index * 104729) % 90000000) * 13);
  const exchangeId = String(17 + index);
  const pill = PILL[tab];

  const steps: TimelineItem[] = [
    { title: "Order placed on SAHI", status: "completed", trailingText: stamp, notes: [{ text: `SAHI ID: ${sahiId}`, copyText: sahiId }] },
    { title: `Order placed on ${o.venue}`, status: "completed", trailingText: stamp, notes: [{ text: `Exchange ID: ${exchangeId}`, copyText: exchangeId }] },
  ];
  if (open) steps.push({ title: trigger ? "Waiting for trigger…" : "Awaiting order execution…", status: "inProgress", pulsing: true });
  else if (o.status === "completed") steps.push({ title: "Order executed", status: "completed", trailingText: stamp });
  else steps.push({ title: `Order ${STATUS_WORD[o.status]}`, status: "failed", trailingText: stamp });

  return (
    <DlsBottomSheet title="Order details" onClose={onClose}>
      <div className="mkt-sheet-head">
        <h2>{o.name}</h2>
        <p>
          {o.venue} • {fno ? "Normal" : o.kind} • LTP {o.ltp}
        </p>
      </div>

      <DlsBadge label={`${sell ? "Sell" : "Buy"} ${STATUS_WORD[o.status]}`} tone={pill.tone} />

      <DlsCard>
        {open ? (
          <>
            <DlsKvStacked label={`${o.status === "partial" ? "Filled quantity" : "Quantity"}${fno ? " (in lots)" : ""}`} value={`${filled}/${total}`} />
            <DlsKvStacked label="Order price" value={price} />
            {trigger && <DlsKvStacked label="Trigger price" value={trigger} />}
            <DlsKvStacked label="Validity" value="Day" />
          </>
        ) : (
          <>
            <DlsKvStacked label={`Filled quantity${fno ? " (in lots)" : ""}`} value={`${filled}/${total}`} />
            {avg && <DlsKvStacked label="Avg. traded price" value={avg} />}
            <DlsKvStacked label="Order price" value={price} />
            <DlsKvStacked label="Validity" value="Day" />
          </>
        )}
      </DlsCard>

      <DlsCard padding="inset">
        <button className="mkt-details-head" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((v) => !v)}>
          <span>Order details</span>
          <span className={`mkt-caret${detailsOpen ? " open" : ""}`}>
            <Icon name="chevron-down" size={20} />
          </span>
        </button>
        {detailsOpen && <DlsTimeline items={steps} />}
      </DlsCard>

      <button className="mkt-shortcut" onClick={() => toast("Quick orders are not part of this prototype")}>
        <i className={sell ? "sell" : "buy"}>{sell ? "S" : "B"}</i>
        <span>{sell ? "Sell" : "Buy"} at Mkt</span>
      </button>

      {open &&
        (confirm ? (
          <div className="mkt-confirm">
            <p>Are you sure you want to cancel this order?</p>
            <div className="mkt-actions">
              <button className="mkt-btn line" onClick={() => setConfirm(false)}>
                No
              </button>
              <button
                className="mkt-btn neg"
                onClick={() => {
                  toast("Order cancelled");
                  onClose();
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mkt-actions">
            <button className="mkt-btn neg" onClick={() => setConfirm(true)}>
              Cancel
            </button>
            <button className="mkt-btn pos" onClick={() => toast("Modifying orders is not part of this prototype")}>
              Modify
            </button>
          </div>
        ))}
    </DlsBottomSheet>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

// Filter and sort as in the SAHI app's orders sheet: Segment, Exchange, Order type, Product and Validity (each a multi-select
// of chips), plus four sort orders. Rows carry venue, kind and their price lines, so each group reads off those.
type GroupKey = "segment" | "exchange" | "otype" | "product" | "validity";
type Picks = Record<GroupKey, string[]>;
type SortKey = "newest" | "oldest" | "az" | "za";

const GROUPS: { key: GroupKey; label: string; options: string[] }[] = [
  { key: "segment", label: "Segment", options: ["Equity", "F&O", "Commodities"] },
  { key: "exchange", label: "Exchange", options: ["NSE", "BSE", "MCX"] },
  { key: "otype", label: "Order Type", options: ["Market", "Limit", "SL Trigger", "TP Trigger"] },
  { key: "product", label: "Product", options: ["Normal", "Intraday", "Delivery"] },
  { key: "validity", label: "Validity", options: ["Day"] },
];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A to Z" },
  { key: "za", label: "Z to A" },
];
const NO_PICKS: Picks = { segment: [], exchange: [], otype: [], product: [], validity: [] };

const segmentOf = (r: Row) => (r.venue === "NFO" ? "F&O" : r.venue === "MCX" ? "Commodities" : "Equity");
const exchangeOf = (r: Row) => (r.venue === "NFO" ? "NSE" : r.venue);
const typesOf = (r: Row) => r.detail.map(([label]) => label);
const matches = (r: Row, p: Picks) =>
  (!p.segment.length || p.segment.includes(segmentOf(r))) &&
  (!p.exchange.length || p.exchange.includes(exchangeOf(r))) &&
  (!p.otype.length || typesOf(r).some((t) => p.otype.includes(t))) &&
  (!p.product.length || p.product.includes(r.kind)) &&
  (!p.validity.length || p.validity.includes("Day"));

// Same pattern as the mutual fund orders: status tabs, then a count with the filter chip (opens the sheet).
export function MarketOrders({ market }: { market: "stocks" | "fno" | "both" }) {
  const [tab, setTab] = useState<Tab>("open");
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [picking, setPicking] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const rows = market === "fno" ? FNO : market === "both" ? [...STOCKS, ...FNO] : STOCKS;
  const active = GROUPS.some((g) => picks[g.key].length > 0) || sort !== "newest";
  const filtered = rows.filter((r) => matches(r, picks));
  const shown = filtered
    .filter((r) => STATUS[r.status].tab === tab)
    .sort((a, b) =>
      sort === "az" ? a.name.localeCompare(b.name) : sort === "za" ? b.name.localeCompare(a.name) : 0,
    );
  if (sort === "oldest") shown.reverse();

  return (
    <>
      <div className="tabs-row mf-orders-bar">
        <div className="tabs-list" role="tablist" aria-label="Order status">
          {TABS.map((t) => (
            <DlsTab
              key={t.key}
              active={tab === t.key}
              onClick={() => setTab(t.key)}
              trailing={t.key === "open" ? <Icon name="dots-three-vertical" size={16} /> : undefined}
            >
              {t.label}
            </DlsTab>
          ))}
        </div>
      </div>
      <div className="mf-pf-bar mf-orders-count">
        <span>
          {shown.length}{" "}
          {market === "both"
            ? shown.length === 1 ? "order" : "orders"
            : market === "fno"
              ? shown.length === 1 ? "contract" : "contracts"
              : shown.length === 1 ? "stock" : "stocks"}
        </span>
        <button
          className={`dls-chip mf-orders-typechip${active ? " on" : ""}`}
          aria-label="Filter orders"
          onClick={() => setPicking(true)}
        >
          <Icon name="funnel-simple" size={16} />
        </button>
      </div>
      {picking && (
        <FilterSortSheet
          groups={GROUPS}
          sorts={SORTS}
          picks={picks}
          sort={sort}
          defaultSort="newest"
          onApply={(nextPicks, nextSort) => {
            setPicks({ ...NO_PICKS, ...nextPicks });
            setSort(nextSort);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <ul className="order-list">
        {shown.map((o, i) => (
          <li key={`${o.name}-${i}`}>
            <button className="order-row" onClick={() => setOpenRow(rows.indexOf(o))}>
              <span className="order-top">
                <small>
                  {o.venue} • {o.kind}
                </small>
                {o.amo && <em className="amo">AMO</em>}
              </span>
              <span className="order-mid">
                <b>{o.name}</b>
                <span className="order-qty">
                  <i className={o.side === "S" ? "sell" : "buy"}>{o.side}</i>
                  {o.qty}
                </span>
              </span>
              <span className="order-bot">
                <span>
                  LTP: <b>{o.ltp}</b>
                </span>
                <span>
                  {o.detail.map(([label, value], k) => (
                    <span key={label}>
                      {k > 0 && " • "}
                      {label}
                      {value ? ": " : ""}
                      {value && <b>{value}</b>}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openRow !== null && <OrderSheet order={rows[openRow]} index={openRow} onClose={() => setOpenRow(null)} />}
    </>
  );
}
