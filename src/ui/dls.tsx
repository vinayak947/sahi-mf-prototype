import "./dls.css";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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


// ---- Button (Type=primary, Size=large · State default / pressed / disabled) -----------------------------------------
// SAHI Components · DLS Button (node 18:93). Full width by default, as DlsButton's fillWidth is. Pressed scales to 0.96
// over 100 ms; disabled is the whole control at 32%.
export function DlsButton({
  label,
  onClick,
  disabled = false,
  fillWidth = true,
}: {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fillWidth?: boolean;
}) {
  return (
    <button className={`dls-btn primary large${fillWidth ? " fill" : ""}`} disabled={disabled} onClick={onClick}>
      <span className="dls-btn-label">{label}</span>
    </button>
  );
}


// ---- Animated value (number field) ---------------------------------------------------------------------------
// Each character is its own glyph. A typed digit rolls up out of a blur and settles with a small bounce (the SAHI amount
// roll); a removed one drops back the way it came. A removed glyph leaves the layout at once (pinned where it
// stood while it fades), so the caret and the rest never wait on it. When several characters change at once (a
// quick-add chip), the new ones follow each other 30 ms apart. The value on first show does not animate.
type Glyph = { id: number; ch: string; state: "still" | "in" | "out"; delay: number; left?: number };
const DIGIT_OUT_MS = 180; // matches .dls-nf-glyph.out in dls.css

function AnimatedValue({ value, hint }: { value: string; hint?: string }) {
  const seq = useRef(0);
  const shown = useRef(value);
  const els = useRef(new Map<number, HTMLSpanElement>());
  const [glyphs, setGlyphs] = useState<Glyph[]>(() =>
    [...value].map((ch) => ({ id: seq.current++, ch, state: "still", delay: 0 })),
  );

  useLayoutEffect(() => {
    const before = shown.current;
    if (before === value) return;
    shown.current = value;
    let same = 0;
    while (same < before.length && same < value.length && before[same] === value[same]) same++;
    setGlyphs((list) => {
      const live = list.filter((g) => g.state !== "out");
      const gone = list.filter((g) => g.state === "out");
      // Pin each leaving glyph where it is now (the DOM still shows the old value here).
      const leaving = live
        .slice(same)
        .map((g) => ({ ...g, state: "out" as const, delay: 0, left: els.current.get(g.id)?.offsetLeft ?? 0 }));
      const entering = [...value.slice(same)].map((ch, i) => ({ id: seq.current++, ch, state: "in" as const, delay: i * 30 }));
      return [...live.slice(0, same), ...gone, ...leaving, ...entering];
    });
  }, [value]);

  // Drop glyphs once their exit has played (a timer, so it also happens with reduced motion, where nothing animates).
  const leavingIds = glyphs.filter((g) => g.state === "out").map((g) => g.id).join(",");
  useEffect(() => {
    if (!leavingIds) return;
    const ids = new Set(leavingIds.split(",").map(Number));
    const t = window.setTimeout(() => setGlyphs((list) => list.filter((g) => !ids.has(g.id))), DIGIT_OUT_MS);
    return () => window.clearTimeout(t);
  }, [leavingIds]);

  // The hint comes back as soon as nothing is left in place; any glyphs still on their way out fade over it.
  const empty = glyphs.every((g) => g.state === "out");
  return (
    <>
      {empty && <span className="dls-nf-hint">{hint}</span>}
      {glyphs.map((g) => (
        <span
          key={g.id}
          ref={(el) => {
            if (el) els.current.set(g.id, el);
            else els.current.delete(g.id);
          }}
          className={`dls-nf-glyph ${g.state}`}
          style={
            g.state === "out" ? { left: g.left } : g.delay ? { animationDelay: `${g.delay}ms` } : undefined
          }
          aria-hidden={g.state === "out" || undefined}
        >
          {g.ch}
        </span>
      ))}
    </>
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
  trailing,
  animated = false,
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
  trailing?: ReactNode; // an action at the field's right edge, after the caret (e.g. a clear button)
  animated?: boolean; // digits rise in / drop out as they are typed and deleted
}) {
  const state = error != null ? "error" : focused ? "focused" : "default";
  const caption = error ? error : error == null ? message : null;
  return (
    <div className={`dls-nf ${size} ${align}`} data-state={state}>
      <div className="dls-nf-field" role="textbox" aria-readonly="true" aria-label={label} aria-invalid={error != null}>
        {prefix != null && <span className="dls-nf-affix">{prefix}</span>}
        <span className={`dls-nf-value${animated ? " animated" : ""}`}>
          {animated ? (
            <AnimatedValue value={value} hint={hint} />
          ) : value ? (
            value
          ) : (
            <span className="dls-nf-hint">{hint}</span>
          )}
        </span>
        {suffix != null && <span className="dls-nf-affix">{suffix}</span>}
        {focused && <i key={caretKey} className="dls-nf-caret" aria-hidden="true" />}
        {trailing != null && <span className="dls-nf-trailing">{trailing}</span>}
      </div>
      {caption ? <p className={`dls-nf-message${error ? " error" : ""}`}>{caption}</p> : null}
    </div>
  );
}
