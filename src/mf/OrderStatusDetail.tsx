import { useState } from "react";
import { Icon } from "../ui/Icon";
import {
  DlsBadge,
  DlsBottomSheet,
  DlsCard,
  DlsKvDetail,
  DlsKvStacked,
  DlsTimeline,
  type BadgeTone,
  type TimelineItem,
} from "../ui/dls";
import { basketById, basketFunds, splitAmount } from "./baskets-data";
import { fundById, type MfOrder } from "./data";
import { inr } from "./format";
import { kindLabel, statusLabel } from "./screens";
import { FundMark, Notice, Screen, Sheet } from "./parts";
import { useMf } from "./store";
import {
  BANK,
  exchangeOrderId,
  purchaseView,
  redeemFailedView,
  redeemView,
  sahiOrderId,
  sipRegnNo,
  uiStatus,
  type DetailView,
  type StepView,
  type UiStatus,
} from "./orderStatus";

// Order detail, built from DLS components only (Bottom sheet, Key value tile, Card, Badge, Timeline, Notice
// strip, Button). Initiated / In progress / Completed / Failed for SIP, one-time and redemption.

export const STATUS_TONE: Record<UiStatus, BadgeTone> = {
  initiated: "neutral",
  inprogress: "attentive",
  completed: "positive",
  failed: "negative",
};

export function StatusBadge({ order }: { order: MfOrder }) {
  return <DlsBadge label={statusLabel(order)} tone={STATUS_TONE[uiStatus(order)]} />;
}

// Map the step list onto DLS timeline statuses. The step the user is waiting on is In progress and pulses; later
// steps are Not started.
function timelineItems(
  steps: StepView[],
  order: MfOrder,
  opts: { onInfo?: (s: StepView) => void; timeAsNote?: boolean } = {},
): TimelineItem[] {
  const ui = uiStatus(order);
  const waiting = ui === "initiated" || ui === "inprogress" ? steps.findIndex((s) => s.state === "todo") : -1;
  return steps.map((s, i) => {
    const notes: NonNullable<TimelineItem["notes"]> = [];
    if (s.time && opts.timeAsNote) notes.push({ text: s.time });
    if (s.showId) notes.push({ text: `SAHI Order ID: ${sahiOrderId(order)}`, copyText: sahiOrderId(order) });
    if (s.sub) notes.push({ text: s.sub, onInfo: s.info && opts.onInfo ? () => opts.onInfo!(s) : undefined });
    return {
      status: s.state === "done" ? "completed" : s.state === "fail" ? "failed" : i === waiting ? "inProgress" : "notStarted",
      title: s.label,
      trailingText: opts.timeAsNote ? undefined : s.time,
      pulsing: i === waiting,
      notes,
    };
  });
}

export function OrderStatusDetail({
  orderId,
  basket: group,
}: {
  orderId: string;
  basket?: { id: string; amount: number; orderIds: string[] };
}) {
  const { pop, push, orders, sips } = useMf();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  const fund = fundById(order.fundId);
  const sipDay = order.sipDay ?? sips.find((s) => s.fundId === order.fundId)?.day ?? 5;
  const ctx = { order, fund, sipDay };
  const redeem = order.kind === "Redeem";
  const basket = group ? basketById(group.id) : undefined;

  if (redeem && order.status !== "failed") return <RedeemPage ctx={ctx} onBack={pop} />;

  const view = redeem ? redeemFailedView(ctx) : purchaseView(ctx);
  const sip = order.kind === "SIP";
  const act = (a: NonNullable<DetailView["action"]>) =>
    a === "viewSip"
      ? push({ name: "sipdetail", fundId: fund.id })
      : a === "investMore"
        ? push({ name: "amount", fundId: fund.id, mode: "lump" })
        : redeem
          ? push({ name: "redeem", fundId: fund.id })
          : push({ name: "amount", fundId: fund.id, mode: sip ? "sip" : "lump" });
  const label = { viewSip: "View SIP", investMore: "Invest more", retry: "Retry" } as const;
  const noticeTone = { info: "info", ok: "info", err: "error" } as const;

  return (
    <DlsBottomSheet title="Order details" onClose={pop}>
      <div className="dls-sheet-head with-badge">
        <h2>{basket ? basket.name : fund.name}</h2>
        <p>
          {basket
            ? `${kindLabel(order.kind)} • Basket • ${basket.funds.length} funds`
            : `${kindLabel(order.kind)} • ${fund.catLabel.replace(" · ", " • ")}`}
        </p>
        <StatusBadge order={order} />
      </div>

      {view.banner && <Notice tone={noticeTone[view.banner.tone]}>{view.banner.text}</Notice>}

      <DlsCard>
        {view.facts.map((f) => (
          <DlsKvStacked
            key={f.label}
            label={f.label}
            value={basket && f.label === "Amount" ? `${inr(group!.amount, 2)}${sip ? " / month" : ""}` : f.value}
            tone={f.hi ? "positive" : undefined}
          />
        ))}
        {sip && !redeem && (
          <DlsKvStacked
            label="SIP Regn No."
            value={sipRegnNo(order)}
            onTap={basket ? undefined : () => push({ name: "sipdetail", fundId: fund.id })}
          />
        )}
      </DlsCard>

      {basket && (
        <DlsCard>
          {basketFunds(basket).map(({ fund: f }, i) => (
            <DlsKvDetail key={`${f.id}-${i}`} label={f.name} value={inr(splitAmount(basket, group!.amount)[i], 2)} />
          ))}
        </DlsCard>
      )}

      <Timeline steps={view.steps} order={order} defaultOpen={uiStatus(order) !== "completed"} />

      {view.action && (
        <button className="mf-btn solid wide" onClick={() => act(view.action!)}>
          {label[view.action]}
        </button>
      )}
    </DlsBottomSheet>
  );
}

// "Order details": a disclosure row over the timeline, in one Card.
function Timeline({ steps, order, defaultOpen }: { steps: StepView[]; order: MfOrder; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [info, setInfo] = useState<string[] | null>(null);
  return (
    <DlsCard>
      <button className="os-disc" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <b>Order details</b>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="os-tl-wrap">
          <DlsTimeline items={timelineItems(steps, order, { onInfo: (s) => setInfo(s.info ?? null) })} />
        </div>
      )}
      {info && (
        <Sheet title="How is the allotment date decided?" onClose={() => setInfo(null)}>
          <Bullets items={info} />
        </Sheet>
      )}
    </DlsCard>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="os-bullets">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function RedeemPage({ ctx, onBack }: { ctx: Parameters<typeof redeemView>[0]; onBack: () => void }) {
  const { order, fund } = ctx;
  const [why, setWhy] = useState(false);
  const v = redeemView(ctx);
  return (
    <Screen onBack={onBack} title="Order details">
      <div className="os-page">
        <div className="os-fund">
          <FundMark fund={fund} size={40} />
          <div className="dls-sheet-head">
            <h2>{fund.name}</h2>
            <p>{fund.catLabel}</p>
          </div>
        </div>

        <DlsCard>
          <DlsKvStacked label="Order type" value={kindLabel(order.kind)} />
          <DlsKvStacked label="Order ID" value={exchangeOrderId(order)} />
        </DlsCard>

        <DlsCard>
          <DlsKvStacked label={v.head.label} value={v.head.value} />
          <DlsKvStacked label="Credit to" value={BANK} />
          {v.rows.map((r) => (
            <DlsKvDetail key={r.label} label={r.label} value={r.value} />
          ))}
        </DlsCard>

        <Notice tone="warn">
          Final amount may differ due to the applicable NAV and exit load.{" "}
          <button className="os-link" onClick={() => setWhy(true)}>
            What does this mean?
          </button>
        </Notice>

        <DlsCard padding="inset">
          <div className="os-status-head">
            <b>Order status</b>
            <StatusBadge order={order} />
          </div>
          <DlsTimeline items={timelineItems(v.steps, order, { timeAsNote: true })} />
        </DlsCard>

        {why && (
          <Sheet title={v.why.title} onClose={() => setWhy(false)}>
            <Bullets items={v.why.bullets} />
          </Sheet>
        )}
      </div>
    </Screen>
  );
}
