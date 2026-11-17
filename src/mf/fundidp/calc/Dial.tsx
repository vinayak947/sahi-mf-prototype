import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { inr } from "../format";
import { haptic } from "../../../ui/haptics";

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

/* Stoppers are the taller ticks: every 5th step (mid) and every 10th (major, labelled). Crossing one under the needle
   plays a haptic tick; coming to rest one step off one pulls onto it (two steps off stays put, so fine values are
   still reachable). Ticks near the needle grow toward its height, falling off over MAGNET_RANGE steps. */
const MAGNET_SNAP = 1; // steps
const MAGNET_RANGE = 4; // steps
const NEEDLE_H = 31.5; // .rc-mark-idp height
const TICK_H = { "": 13.5, mid: 19.5, major: 25.5 } as const;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const kindAt = (i: number) => {
    const v = min + i * step;
    return v % (step * 10) === 0 ? "major" : v % (step * 5) === 0 ? "mid" : "";
  };
  const stopper = (i: number) => kindAt(i) !== "";

  // Haptics only after the person touches the dial (the first scroll is the mount placing it).
  const armed = useRef(false);
  const lastIdx = useRef(index);
  const ticks = useRef<(HTMLSpanElement | null)[]>([]);
  const grown = useRef<number[]>([]);
  const frame = useRef(0);

  // Nearest stopper within MAGNET_SNAP steps of i, else i itself.
  const magnet = (i: number) => {
    for (let d = 0; d <= MAGNET_SNAP; d++) {
      if (stopper(at(i - d))) return at(i - d);
      if (stopper(at(i + d))) return at(i + d);
    }
    return i;
  };

  // Ticks within MAGNET_RANGE of the needle stretch toward its height (scaleY on each tick's own line, top-anchored).
  const magnify = () => {
    frame.current = 0;
    const el = ref.current;
    if (!el) return;
    const pos = el.scrollLeft / TICK;
    const next: number[] = [];
    if (!reduceMotion()) {
      for (let i = Math.max(0, Math.floor(pos - MAGNET_RANGE)); i <= Math.min(count - 1, Math.ceil(pos + MAGNET_RANGE)); i++) {
        const d = Math.abs(i - pos);
        if (d >= MAGNET_RANGE) continue;
        const f = 0.5 * (1 + Math.cos((Math.PI * d) / MAGNET_RANGE)); // 1 under the needle, 0 at the edge of the range
        const h = TICK_H[kindAt(i)];
        ticks.current[i]?.style.setProperty("--m", String(1 + f * ((NEEDLE_H * 0.9) / h - 1)));
        next.push(i);
      }
    }
    for (const i of grown.current) if (!next.includes(i)) ticks.current[i]?.style.removeProperty("--m");
    grown.current = next;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const arm = () => (armed.current = true);
    // Native scroll-snap lands on any step; when it lands one step off a stopper, pull onto the stopper.
    const onEnd = () => {
      if (drag.current.down) return;
      const i = at(Math.round(el.scrollLeft / TICK));
      const target = magnet(i);
      if (target !== i) el.scrollTo({ left: target * TICK, behavior: "smooth" });
    };
    el.addEventListener("pointerdown", arm);
    el.addEventListener("touchstart", arm, { passive: true });
    el.addEventListener("wheel", arm, { passive: true });
    el.addEventListener("keydown", arm);
    el.addEventListener("scrollend", onEnd);
    magnify();
    return () => {
      el.removeEventListener("pointerdown", arm);
      el.removeEventListener("touchstart", arm);
      el.removeEventListener("wheel", arm);
      el.removeEventListener("keydown", arm);
      el.removeEventListener("scrollend", onEnd);
      cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

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
    el.scrollTo({ left: magnet(at(Math.round(el.scrollLeft / TICK))) * TICK, behavior: "smooth" });
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
          // One tick for each stopper the needle passed since the last frame (firmer on a labelled one).
          const from = lastIdx.current;
          if (armed.current && i !== from) {
            // The steps the needle reached this frame: from+1..i going right, i..from-1 going left.
            const [lo, hi] = i > from ? [from + 1, i] : [i, from - 1];
            let hit: "" | "mid" | "major" = "";
            for (let k = lo; k <= hi; k++) {
              const kind = kindAt(k);
              if (kind === "major") hit = "major";
              else if (kind === "mid" && !hit) hit = "mid";
            }
            if (hit) haptic(hit === "major" ? "major" : "tick");
          }
          lastIdx.current = i;
          if (!frame.current) frame.current = requestAnimationFrame(magnify);
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
          const kind = kindAt(i);
          return (
            <span
              key={v}
              ref={(el) => {
                ticks.current[i] = el;
              }}
              className={`rc-tick-idp ${kind}`}
              data-label={kind === "major" ? short(v) : undefined}
            />
          );
        })}
        <Pad side="end" />
      </div>
      <i className="rc-mark-idp" aria-hidden="true" />
    </div>
  );
}
