import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/* A tall bottom sheet over the current page (DLS "Bottom sheet": 16 radius on top, square at the bottom, 16 padding, large
   detent = 95% of the screen, no handle, no shadow or stroke; the page behind keeps its place under a scrim).

   Motion (Emil's drawer rules). It rises over 440ms on the drawer curve (0.32, 0.72, 0, 1) and leaves faster, in 280ms: the
   arrival is what the eye follows, the leaving should get out of the way. The scrim fades with it. Pulled down by its header
   it follows the finger 1:1 (friction when pulled up), and is dismissed by distance (30% of its height) or a flick
   (0.4 px/ms); let go early and it springs back. Reduced motion: a plain fade. Escape, the scrim and the close button
   close it; focus goes in and back out. */

const FLICK = 0.4; // px per ms
const FAR = 0.3; // of the sheet's height

type Phase = "enter" | "open" | "exit";

export function BottomSheet({
  title,
  sub,
  onClose,
  children,
  fit,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  fit?: boolean; // as tall as its content (up to 95%) instead of the full 95%
}) {
  const [phase, setPhase] = useState<Phase>("enter");
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const drag = useRef({ id: -1, y0: 0, y: 0, t: 0, vy: 0, on: false });

  // rise on the next frame, so the closed position is painted first and there is something to transition from
  useEffect(() => {
    opener.current = document.activeElement;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
    sheet.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(id);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, []);

  const close = useCallback(() => {
    setPhase("exit");
    window.setTimeout(onClose, matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 280);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("button")) return; // the close button is a tap, not a pull
    drag.current = { id: e.pointerId, y0: e.clientY, y: e.clientY, t: performance.now(), vy: 0, on: false };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId || !sheet.current) return;
    const dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.abs(dy) < 6) return;
      d.on = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      sheet.current.classList.add("dragging");
    }
    const now = performance.now();
    d.vy = (e.clientY - d.y) / Math.max(1, now - d.t);
    d.y = e.clientY;
    d.t = now;
    const h = sheet.current.offsetHeight;
    const offset = dy > 0 ? dy : dy * 0.12; // up: friction, never a hard stop
    sheet.current.style.transform = `translateY(${offset}px)`;
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - Math.max(0, offset) / h));
  };
  const up = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId) return;
    d.id = -1;
    if (!d.on || !sheet.current) return;
    d.on = false;
    const s = sheet.current;
    s.classList.remove("dragging");
    const far = e.clientY - d.y0 > s.offsetHeight * FAR;
    const flick = d.vy > FLICK;
    // clearing the inline values hands over to the CSS: down to the closed position, or back to rest, as a transition from here
    s.style.transform = "";
    if (scrim.current) scrim.current.style.opacity = "";
    if (far || flick) close();
  };

  const host = document.querySelector(".mf-layer") ?? document.body;
  return createPortal(
    <div className={`sheet-root ${phase}`}>
      <button ref={scrim} className="sheet-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
      <div ref={sheet} className={`sheet${fit ? " fit" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="sheet-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="sheet-title">
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="sheet-x" aria-label="Close" onClick={close}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
