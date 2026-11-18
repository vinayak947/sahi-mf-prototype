import { useEffect, useMemo, useRef, useState } from "react";
import { fundById, type MfOrder } from "./data";
import { inr } from "./format";
import { FundMark, Sheet } from "./parts";
import { kindLabel } from "./screens";
import { StatusBadge } from "./OrderStatusDetail";
import { useMf } from "./store";
import { DlsTab } from "../ui/widgets";
import { Icon } from "../ui/Icon";
import { uiStatus, type UiStatus } from "./orderStatus";

type StatusTab = "all" | UiStatus;
export type TypeFilter = "all" | MfOrder["kind"];

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "initiated", label: "Initiated" },
  { key: "inprogress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All types" },
  { key: "Lumpsum", label: "One-time" },
  { key: "SIP", label: "SIP" },
  { key: "Redeem", label: "Redemption" },
];

// The list covers the last three months.
const threeMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
};

// One mixed list, newest first. Status tabs on top; the order type is picked from the filter button under the tabs
// (opened via onOpenPicker; MfOrdersPage), which owns the choice and the sheet.
export function OrdersList2({
  type,
  picking,
  onType,
  onClosePicker,
  onOpenPicker,
}: {
  type: TypeFilter;
  picking: boolean;
  onType: (type: TypeFilter) => void;
  onClosePicker: () => void;
  onOpenPicker?: () => void;
}) {
  const { orders, push } = useMf();
  const [picked, setTab] = useState<StatusTab>("initiated");
  const tabsRef = useRef<HTMLDivElement>(null);

  const since = threeMonthsAgo();
  const ofType = useMemo(
    () => orders.filter((o) => o.on >= since).filter((o) => type === "all" || o.kind === type),
    [orders, since, type],
  );
  // Only the statuses this order type actually has: a tab appears when at least one order is in it.
  const tabs = STATUS_TABS.filter((t) => ofType.some((o) => uiStatus(o) === t.key));
  const tab: StatusTab | undefined = tabs.some((t) => t.key === picked) ? picked : tabs[0]?.key;
  const list = ofType
    .filter((o) => uiStatus(o) === tab)
    .sort((x, y) => (x.on < y.on ? 1 : x.on > y.on ? -1 : 0));


  return (
    <>
      <div className="tabs-row mf-orders-bar">
        <div className="tabs-list" role="tablist" aria-label="Order status">
          {tabs.map((t) => (
            <DlsTab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </DlsTab>
          ))}
        </div>
      </div>

      {onOpenPicker && (
        <div className="mf-pf-bar mf-orders-count">
          <span>
            {list.length} {list.length === 1 ? "fund" : "funds"}
          </span>
          <button
            className={`dls-chip mf-orders-typechip${type !== "all" ? " on" : ""}`}
            aria-label="Filter by order type"
            onClick={onOpenPicker}
          >
            <Icon name="funnel-simple" size={16} />
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="mf-empty">No orders here yet.</p>
      ) : (
        <ul className="os-list">
          {list.map((order) => {
            const fund = fundById(order.fundId);
            return (
              <li key={order.id}>
                <button className="os-row" onClick={() => push({ name: "orderdetail", orderId: order.id })}>
                  <FundMark fund={fund} size={40} />
                  <span className="os-mid">
                    <b>{fund.name}</b>
                    <small>{kindLabel(order.kind)}</small>
                  </span>
                  <span className="os-end">
                    <span className="os-amt">{inr(order.amount)}</span>
                    <StatusBadge order={order} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {picking && <TypeSheet type={type} onApply={onType} onClose={onClosePicker} />}
    </>
  );
}

function TypeSheet({
  type,
  onApply,
  onClose,
}: {
  type: TypeFilter;
  onApply: (type: TypeFilter) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TypeFilter>(type);
  // The sheet runs onAction instead of onClose once it has slid away, so Apply must close it itself.
  return (
    <Sheet
      title="Order type"
      action="Apply"
      onClose={onClose}
      onAction={() => {
        onApply(draft);
        onClose();
      }}
    >
      <div className="mf-options" role="radiogroup">
        {TYPE_OPTIONS.map((o) => (
          <label key={o.key} className={`mf-option${draft === o.key ? " on" : ""}`}>
            <input type="radio" name="order-type" checked={draft === o.key} onChange={() => setDraft(o.key)} />
            <span className="radio" />
            <span>
              <b>{o.label}</b>
            </span>
          </label>
        ))}
      </div>
    </Sheet>
  );
}
