import "./dls.css";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

// DLS pieces used by the order screens, built from SAHI Components · DLS (Badge, Timeline, Timeline note,
// Key value tile, Card, Bottom sheet). Values are the ones in those Figma components; colours are tokens.css
// variables only.

// ---- Badge (Style=tonal, Shape=pill, Size=small) ---------------------------------------------------------------

export type BadgeTone = "neutral" | "positive" | "negative" | "attentive";

export function DlsBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return <span className={`dls-badge ${tone}`}>{label}</span>;
}

// ---- Timeline ----------------------------------------------------------------------------------------------------

export type TimelineStatus = "completed" | "inProgress" | "failed" | "notStarted";

export type TimelineNote = { text: string; copyText?: string; onInfo?: () => void };

export type TimelineItem = {
  status: TimelineStatus;
  title: string;
  trailingText?: string;
  notes?: TimelineNote[];
  pulsing?: boolean; // only the step the user is waiting on
};

const GLYPH = {
  completed: "circle-check-filled",
  inProgress: "hourglass-circle-filled",
  failed: "alert-circle-filled",
  notStarted: "circle",
} as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="dls-icon-btn"
      aria-label={copied ? "Copied" : "Copy"}
      onClick={() => {
        try {
          void navigator.clipboard.writeText(text);
        } catch {
          /* clipboard can be blocked in a preview */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
    </button>
  );
}

export function DlsTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="dls-timeline">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={it.title} className={`dls-tl-step ${it.status}${last ? " last" : ""}`}>
            <div className="dls-tl-rail">
              {it.pulsing && <span className="dls-tl-pulse" />}
              <Icon name={GLYPH[it.status]} size={24} className="dls-tl-glyph" />
              {!last && <span className="dls-tl-line" />}
            </div>
            <div className="dls-tl-content">
              <div className="dls-tl-title">
                <p>{it.title}</p>
                {it.trailingText && <span>{it.trailingText}</span>}
              </div>
              {it.notes?.map((n) => (
                <div key={n.text} className="dls-tl-note">
                  <p>{n.text}</p>
                  {n.copyText && <CopyButton text={n.copyText} />}
                  {n.onInfo && (
                    <button className="dls-icon-btn" aria-label="How is this date decided?" onClick={n.onInfo}>
                      <Icon name="info" size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---- Card, Key value tile -----------------------------------------------------------------------------------------

// Card: outlined (border/L1 hairline), radius/surface, clipped, hairline between rows. padding "rows" pads the
// sides for rows that pad themselves; "inset" pads 16 all round for free content.
export function DlsCard({ padding = "rows", children }: { padding?: "rows" | "inset"; children: ReactNode }) {
  return <div className={`dls-card ${padding}`}>{children}</div>;
}

// Key value tile, Style=stacked: a secondary xs-regular label over an s-bold value.
export function DlsKvStacked({
  label,
  value,
  tone,
  onTap,
}: {
  label: string;
  value: ReactNode;
  tone?: "positive";
  onTap?: () => void;
}) {
  const body = (
    <>
      <span className="dls-kv-text">
        <small>{label}</small>
        <b className={tone}>{value}</b>
      </span>
      {onTap && <Icon name="chevron-right" size={16} />}
    </>
  );
  return onTap ? (
    <button className="dls-kv tap" onClick={onTap}>
      {body}
    </button>
  ) : (
    <div className="dls-kv">{body}</div>
  );
}

// Key value tile, Style=detail: secondary label left, regular value right.
export function DlsKvDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dls-kv detail">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ---- Bottom sheet (Detent=large, Padding=default) ----------------------------------------------------------------

// Barrier, then the L1 surface with 16 padding, the 12 bottom inset and 16 between content blocks. Slides down
// before it unmounts, then calls onClose.
export function DlsBottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className={`dls-sheet-layer${closing ? " closing" : ""}`}>
      <button className="dls-sheet-barrier" aria-label="Close" onClick={() => setClosing(true)} />
      <div
        className="dls-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && onClose()}
      >
        {children}
      </div>
    </div>
  );
}


// ---- Number field (DlsNumberField, Size=xLarge · State default / focused / error · Align=center) ---------------------
// Display-only here: the order pads feed it from their own keypad, so "focused" is set by the pad, with a blinking caret.
export function DlsNumberField({
  value,
  prefix,
  suffix,
  hint,
  message,
  error,
  focused = false,
  size = "xLarge",
  align = "center",
  label,
  caretKey,
}: {
  value: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  hint?: string; // shown in the value's style while the value is empty
  message?: ReactNode; // helper caption under the field; hidden while an error is set
  error?: string | null; // any string (even "") puts the field in the error state
  focused?: boolean;
  size?: "xxLarge" | "xLarge" | "large" | "medium" | "small"; // xxLarge is custom (64 / 24), not in the DLS
  align?: "start" | "center" | "end";
  label: string;
  caretKey?: string; // changes when the value does, so the caret restarts its blink
}) {
  const state = error != null ? "error" : focused ? "focused" : "default";
  const caption = error ? error : error == null ? message : null;
  return (
    <div className={`dls-nf ${size} ${align}`} data-state={state}>
      <div className="dls-nf-field" role="textbox" aria-readonly="true" aria-label={label} aria-invalid={error != null}>
        {prefix != null && <span className="dls-nf-affix">{prefix}</span>}
        <span className="dls-nf-value">
          {value ? value : <span className="dls-nf-hint">{hint}</span>}
        </span>
        {suffix != null && <span className="dls-nf-affix">{suffix}</span>}
        {focused && <i key={caretKey} className="dls-nf-caret" aria-hidden="true" />}
      </div>
      {caption ? <p className={`dls-nf-message${error ? " error" : ""}`}>{caption}</p> : null}
    </div>
  );
}
