import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
import { FundMark, Notice, Sheet } from "./parts";
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
  type WhyStory,
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

// Every order detail rises as a bottom sheet: the scrolling body (it opens on the fund, no title), and the one primary CTA pinned under it.
// Nested sheets (allotment info, "what does this mean") are rendered beside it, not inside, so they stack above it.
function OrderSheetFrame({ onClose, footer, extras, children }: { onClose: () => void; footer?: ReactNode; extras?: ReactNode; children: ReactNode }) {
  return (
    <Fragment>
      <DlsBottomSheet title="Order details" onClose={onClose}>
        <div className="os-sheet-body">{children}</div>
        {footer && <div className="os-sheet-foot">{footer}</div>}
      </DlsBottomSheet>
      {extras}
    </Fragment>
  );
}

export function OrderStatusDetail({
  orderId,
  basket: group,
}: {
  orderId: string;
  basket?: { id: string; amount: number; orderIds: string[] };
}) {
  const { pop, push, orders, sips } = useMf();
  const [info, setInfo] = useState<WhyStory | null>(null);
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
    <OrderSheetFrame
      onClose={pop}
      footer={
        view.action && (
          <button className="mf-btn solid wide" onClick={() => act(view.action!)}>
            {label[view.action]}
          </button>
        )
      }
      extras={
        info && (
          <Sheet title="How is the allotment date decided?" onClose={() => setInfo(null)}>
            <WhyStoryView story={info} />
          </Sheet>
        )
      }
    >
      <div className="os-page">
        <div className="os-fund">
          <FundMark fund={basket ? basketFunds(basket)[0].fund : fund} size={40} />
          <div className="dls-sheet-head">
            <h2>{basket ? basket.name : fund.name}</h2>
            <p>
              {basket
                ? `Basket • ${basket.funds.length} funds`
                : fund.catLabel.replace(" · ", " • ")}
            </p>
          </div>
        </div>
        <StatusBadge order={order} />

        {view.banner && <Notice tone={noticeTone[view.banner.tone]}>{view.banner.text}</Notice>}

        <DlsCard>
          <Facts>
          {view.facts.map((f) => (
            <DlsKvStacked
              key={f.label}
              label={f.label}
              value={basket && f.label === "Amount" ? `${inr(group!.amount, 2)}${sip ? " / month" : ""}` : f.value}
            />
          ))}
          </Facts>
        </DlsCard>

        {sip && !redeem && !basket && (
          <DlsCard>
            <button className="dls-kv tap" onClick={() => push({ name: "sipdetail", fundId: fund.id })}>
              <span className="dls-kv-text">
                <b>View SIP details</b>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          </DlsCard>
        )}

        {basket && (
          <DlsCard>
            {basketFunds(basket).map(({ fund: f }, i) => (
              <DlsKvDetail key={`${f.id}-${i}`} label={f.name} value={inr(splitAmount(basket, group!.amount)[i], 2)} />
            ))}
          </DlsCard>
        )}

        <StatusCard steps={view.steps} order={order} onInfo={setInfo} />
      </div>
    </OrderSheetFrame>
  );
}

// "Order status": the one timeline card every order detail page uses (purchase, SIP, redemption), collapsed by default; tap the header to expand.
function StatusCard({ steps, order, onInfo }: { steps: StepView[]; order: MfOrder; onInfo: (info: WhyStory | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <DlsCard padding="inset">
      <button className="mkt-details-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="os-status-title">Order status</span>
        <span className={`mkt-caret${open ? " open" : ""}`}>
          <Icon name="chevron-down" size={20} />
        </span>
      </button>
      {open && <DlsTimeline items={timelineItems(steps, order, { timeAsNote: true, onInfo: (st) => onInfo(st.info ?? null) })} />}
    </DlsCard>
  );
}

// Facts card body: label-over-value tiles in two columns while every tile's text fits inside half the card's width.
// A tile whose text needs more than 50% takes a full row of its own (so does a tile left alone in its row).
// The "why can the final amount differ" explainer as a short visual story: three steps, then what it means for the amount.
function WhyStoryView({ story }: { story: WhyStory }) {
  return (
    <div className="os-story">
      <ol className="os-story-steps">
        {story.steps.map((st, i) => (
          <li key={st.title} style={{ "--i": i } as React.CSSProperties}>
            <span className="os-story-dot" aria-hidden="true">
              {st.glyph ? <b>{st.glyph}</b> : <Icon name={st.icon!} size={20} />}
            </span>
            <span className="os-story-text">
              <b>{st.title}</b>
              <small>{st.sub}</small>
            </span>
          </li>
        ))}
      </ol>
      {story.outcomes.length > 0 && (
      <div className={`os-story-outcomes n${story.outcomes.length}`}>
        {story.outcomes.map((o, i) => (
          <div key={o.title} className={`os-story-outcome ${o.tone}`} style={{ "--i": story.steps.length + i } as React.CSSProperties}>
            <span className="os-story-dot" aria-hidden="true">
              <Icon name={o.icon} size={20} />
            </span>
            <b>{o.title}</b>
            <small>{o.sub}</small>
          </div>
        ))}
      </div>
      )}
      <p className="os-story-note">
        <Icon name={story.note.icon} size={16} />
        {story.note.text}
      </p>
    </div>
  );
}

// The details card's two-column rule: 50/50, a tile whose text is wider than half (or that would sit alone in its row) takes
// the full width. SIP details uses it too.
export function Facts({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const layout = () => {
      const tiles = Array.from(el.children) as HTMLElement[];
      el.classList.add("measuring");
      const half = el.clientWidth / 2;
      const wide = tiles.map((t) => (t.querySelector(".dls-kv-text") as HTMLElement | null)?.getBoundingClientRect().width ?? 0).map((w) => w > half + 0.5);
      el.classList.remove("measuring");
      let col = 0;
      let row = 0;
      tiles.forEach((t, i) => {
        const alone = !wide[i] && col === 0 && (i === tiles.length - 1 || wide[i + 1]);
        const full = wide[i] || alone;
        if (full && col === 1) {
          row += 1;
          col = 0;
        }
        t.classList.toggle("wide", full);
        t.classList.toggle("r0", row === 0);
        if (full) {
          row += 1;
          col = 0;
        } else if (col === 0) col = 1;
        else {
          col = 0;
          row += 1;
        }
      });
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return (
    <div className="os-facts" ref={ref}>
      {children}
    </div>
  );
}

function RedeemPage({ ctx, onBack }: { ctx: Parameters<typeof redeemView>[0]; onBack: () => void }) {
  const { order, fund } = ctx;
  const [why, setWhy] = useState(false);
  const [info, setInfo] = useState<WhyStory | null>(null);
  const v = redeemView(ctx);
  return (
    <OrderSheetFrame
      onClose={onBack}
      extras={
        <>
          {why && (
            <Sheet title={v.why.title} onClose={() => setWhy(false)}>
              <WhyStoryView story={v.why.story} />
            </Sheet>
          )}
          {info && (
            <Sheet title="How is the allotment date decided?" onClose={() => setInfo(null)}>
              <WhyStoryView story={info} />
            </Sheet>
          )}
        </>
      }
    >
      <div className="os-page">
        <div className="os-fund">
          <FundMark fund={fund} size={40} />
          <div className="dls-sheet-head">
            <h2>{fund.name}</h2>
            <p>{fund.catLabel.replace(" · ", " • ")}</p>
          </div>
        </div>
        <StatusBadge order={order} />

        <DlsCard>
          <Facts>
            {/* Amount is the hero: requested figures lead, then what is credited, then the details. */}
            {v.rows.slice(0, 2).map((r) => (
              <DlsKvStacked key={r.label} label={r.label} value={r.value} />
            ))}
            <DlsKvStacked label={v.head.label} value={v.head.value} />
            <DlsKvStacked label="Credit to" value={BANK} />
            <DlsKvStacked label="Order type" value={kindLabel(order.kind)} />
            <DlsKvStacked label="Order ID" value={exchangeOrderId(order)} />
            {v.rows.slice(2).map((r) => (
              <DlsKvStacked key={r.label} label={r.label} value={r.value} />
            ))}
          </Facts>
        </DlsCard>

        <Notice tone="warn">
          Final amount may differ due to the applicable NAV and exit load.{" "}
          <button className="os-link" onClick={() => setWhy(true)}>
            What does this mean?
          </button>
        </Notice>

        <StatusCard steps={v.steps} order={order} onInfo={setInfo} />
      </div>
    </OrderSheetFrame>
  );
}
