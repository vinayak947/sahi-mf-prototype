import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { inr } from "../format";

/* Short labels for the ruler: 5K, 45K, 1L, 2.5L (K = thousand, L = lakh). */
const short = (v: number) => {
  const n = (x: number) => String(Math.round(x * 10) / 10);
  return v >= 100000 ? `${n(v / 100000)}L` : `${n(v / 1000)}K`;
};

/* Faint ticks past either end, getting a little shorter (13px down to 7px) so the scale trails off instead of stopping. */
const PAD_TICKS = 24;
function Pad({ side }: { side: "start" | "end" }) {
  const ticks = Array.from({ length: PAD_TICKS }, (_, k) => (
    <i key={k} style={{ "--h": `${13 - (k / (PAD_TICKS - 1)) * 6}px` } as CSSProperties} />
  ));
  // k = 0 is the tick next to the first/last value; on the start side it sits on the right.
  return (
    <span className={`rc-pad-idp ${side}`} aria-hidden="true">
      {side === "start" ? ticks.reverse() : ticks}
    </span>
  );
}


const TICK = 9;

/* A ruler you scroll under a fixed centre marker. Native scroll-snap gives touch and trackpad momentum;
   a mouse can drag it, and the arrow keys step it. */
export function Dial({
  min,
  max,
  step,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, left: 0, down: false, moved: false });
  const count = Math.round((max - min) / step) + 1;
  const index = Math.round((value - min) / step);
  const at = (i: number) => Math.min(count - 1, Math.max(0, i));

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollLeft = index * TICK;
    // Only on mount: after that the scroll position drives the value, not the other way round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = () => {
    const el = ref.current;
    if (!el) return;
    drag.current.down = false;
    el.classList.remove("dragging");
    el.scrollTo({ left: at(Math.round(el.scrollLeft / TICK)) * TICK, behavior: "smooth" });
  };

  return (
    <div className="rc-dial-idp">
      <div
        ref={ref}
        className="rc-ruler-idp"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={inr(value)}
        onScroll={(e) => {
          const i = at(Math.round(e.currentTarget.scrollLeft / TICK));
          if (i !== index) onChange(min + i * step);
        }}
        onKeyDown={(e) => {
          const move = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (!move) return;
          e.preventDefault();
          ref.current?.scrollTo({ left: at(index + move) * TICK, behavior: "smooth" });
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, down: true, moved: false };
          ref.current.classList.add("dragging");
          ref.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d.down || !ref.current) return;
          ref.current.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={settle}
        onPointerCancel={settle}
      >
        <Pad side="start" />
        {Array.from({ length: count }, (_, i) => {
          const v = min + i * step;
          const kind = v % (step * 10) === 0 ? "major" : v % (step * 5) === 0 ? "mid" : "";
          return <span key={v} className={`rc-tick-idp ${kind}`} data-label={kind === "major" ? short(v) : undefined} />;
        })}
        <Pad side="end" />
      </div>
      <i className="rc-mark-idp" aria-hidden="true" />
    </div>
  );
}
