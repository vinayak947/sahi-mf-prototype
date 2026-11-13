import { useState } from "react";
import { Icon } from "../ui/Icon";
import { fundById, type MfOrder } from "./data";
import { kindLabel, statusClass, statusLabel } from "./screens";
import { FundMark, Screen, Sheet } from "./parts";
import { inr } from "./format";
import { useMf } from "./store";
import {
  BANK,
  exchangeOrderId,
  purchaseView,
  redeemFailedView,
  redeemView,
  sahiOrderId,
  uiStatus,
  type DetailView,
  type StepView,
} from "./orderStatus";

// Order 2.0 order detail: Initiated / In progress / Completed / Failed for SIP, one-time and redemption.
export function OrderStatusDetail({ orderId }: { orderId: string }) {
  const { pop, push, orders, sips } = useMf();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  const fund = fundById(order.fundId);
  const sipDay = order.sipDay ?? sips.find((s) => s.fundId === order.fundId)?.day ?? 5;
  const ctx = { order, fund, sipDay };
  const redeem = order.kind === "Redeem";
  const failed = order.status === "failed";

  if (redeem && !failed) return <RedeemPage ctx={ctx} onBack={pop} />;

  const view = redeem ? redeemFailedView(ctx) : purchaseView(ctx);
  const act = (a: NonNullable<DetailView["action"]>) =>
    a === "viewSip"
      ? push({ name: "sipdetail", fundId: fund.id })
      : a === "investMore"
        ? push({ name: "amount", fundId: fund.id, mode: "lump" })
        : redeem
          ? push({ name: "redeem", fundId: fund.id })
          : push({ name: "amount", fundId: fund.id, mode: order.kind === "SIP" ? "sip" : "lump" });
  const label = { viewSip: "View SIP", investMore: "Invest more", retry: "Retry" } as const;

  return (
    <Screen
      onBack={pop}
      title="Order details"
      footer={
        view.action ? (
          <div className="os-actions">
            <button className="mf-btn solid wide" onClick={() => act(view.action!)}>
              {label[view.action]}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="os-head">
        <h2>{fund.name}</h2>
        <p className="sub">
          {kindLabel(order.kind)} • Direct • NAV {inr(view.nav, 2)}
        </p>
        <em className={`amo ${statusClass(order)}`}>{statusLabel(order)}</em>
      </div>

      {view.banner && <Banner tone={view.banner.tone} text={view.banner.text} />}

      <div className="os-card" role="list">
        {view.facts.map((f) => (
          <div key={f.label} role="listitem" className={`os-frow${f.hi ? " hi" : ""}`}>
            <span>{f.label}</span>
            <b>{f.value}</b>
          </div>
        ))}
      </div>

      <Timeline steps={view.steps} order={order} defaultOpen={uiStatus(order) !== "completed"} title="Order details" />
    </Screen>
  );
}

function Banner({ tone, text }: { tone: "info" | "ok" | "err"; text: string }) {
  return (
    <div className={`os-banner ${tone}`} role={tone === "err" ? "alert" : undefined}>
      <Icon name={tone === "ok" ? "check-circle" : tone === "err" ? "warning-circle" : "info"} size={16} />
      <p>{text}</p>
    </div>
  );
}

function StepList({ steps, order, onInfo }: { steps: StepView[]; order: MfOrder; onInfo?: (s: StepView) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      void navigator.clipboard.writeText(sahiOrderId(order));
    } catch {
      /* clipboard can be blocked in a preview */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <ol className="os-tl">
      {steps.map((s, i) => {
        const next = steps[i + 1];
        return (
          <li key={s.label} className={`os-step ${s.state}${next?.state === "done" ? " next-done" : ""}`}>
            <div className="os-rail">
              <span className="os-dot">
                {s.state === "done" && <Icon name="check" size={12} />}
                {s.state === "fail" && <Icon name="x" size={12} />}
              </span>
              <span className="os-line" />
            </div>
            <div className="os-body">
              <div className="os-trow">
                <b>{s.label}</b>
                {s.time && <span className="os-time">{s.time}</span>}
              </div>
              {s.showId && (
                <p className="os-s">
                  SAHI Order ID {sahiOrderId(order)}
                  <button className="os-icon-btn" aria-label={copied ? "Order ID copied" : "Copy SAHI Order ID"} onClick={copy}>
                    <Icon name={copied ? "check" : "copy"} size={14} />
                  </button>
                </p>
              )}
              {s.sub && (
                <p className="os-s">
                  {s.sub}
                  {s.info && onInfo && (
                    <button className="os-icon-btn" aria-label="How is the allotment date decided?" onClick={() => onInfo(s)}>
                      <Icon name="info" size={16} />
                    </button>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Timeline({ steps, order, defaultOpen, title }: { steps: StepView[]; order: MfOrder; defaultOpen: boolean; title: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const [info, setInfo] = useState<string[] | null>(null);
  return (
    <div className="os-card">
      <button className="os-thead" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <Icon name="chevron-down" size={18} />
      </button>
      {open && <StepList steps={steps} order={order} onInfo={(s) => setInfo(s.info ?? null)} />}
      {info && (
        <Sheet title="How is the allotment date decided?" onClose={() => setInfo(null)}>
          <ul className="os-list-bullets">
            {info.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}

function RedeemPage({ ctx, onBack }: { ctx: Parameters<typeof redeemView>[0]; onBack: () => void }) {
  const { order, fund } = ctx;
  const [why, setWhy] = useState(false);
  const v = redeemView(ctx);
  return (
    <Screen onBack={onBack} title="Order details">
      <div className="os-fund">
        <FundMark fund={fund} size={40} />
        <div>
          <h2>{fund.name}</h2>
          <small>{fund.catLabel}</small>
        </div>
      </div>

      <div className="os-facts">
        <div>
          <small>Order type</small>
          <b>{kindLabel(order.kind)}</b>
        </div>
        <div>
          <small>Order ID</small>
          <b>{exchangeOrderId(order)}</b>
        </div>
      </div>

      <div className="os-redcard">
        <div className="os-redhead">
          <div>
            <small>{v.head.label}</small>
            <strong>{v.head.value}</strong>
          </div>
          <span>To {BANK}</span>
        </div>
        {v.rows.map((r) => (
          <div key={r.label} className="os-frow">
            <span>{r.label}</span>
            <b>{r.value}</b>
          </div>
        ))}
        <p className="os-warn">
          Final amount may differ due to the applicable NAV and exit load.{" "}
          <button className="os-link" onClick={() => setWhy(true)}>
            What does this mean?
          </button>
        </p>
      </div>

      <div className="os-statuscard">
        <div className="os-statushead">
          <h3>Order status</h3>
          <em className={`amo ${statusClass(order)}`}>{statusLabel(order)}</em>
        </div>
        <StepList steps={v.steps} order={order} />
      </div>

      {why && (
        <Sheet title={v.why.title} onClose={() => setWhy(false)}>
          <ul className="os-list-bullets">
            {v.why.bullets.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Sheet>
      )}
    </Screen>
  );
}
