import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ticker } from "./calc/core";
import type { Fund } from "../data";
import { hostOf, infoFor, managerSince, tenureText, yearsLabel } from "./managers";
import { ManagerAvatar } from "./parts";

/* A fund manager in a bottom sheet, opened from the "Managed by" rows on the fund page.

   Motion (Emil's drawer rules). It rises over 440ms on the drawer curve (0.32, 0.72, 0, 1) and leaves faster, in 280ms: the
   arrival is what the eye follows, the leaving should get out of the way. The scrim fades with it. It follows a finger 1:1
   when pulled down by the top of the sheet (the handle and the manager header), is pulled back with friction when pulled up,
   and is dismissed by distance (30% of its height) or by a flick (0.4 px/ms), like a native sheet; let go early and it
   springs back. Inside it the avatar lands, the name and the numbers rise in one after another and the experience counts up.
   With more than one manager, the avatars at the top switch between them without closing: the content crossfades.
   Reduced motion: no sliding, a plain fade. Escape, the scrim and the handle close it; focus goes in and back out. */

const FLICK = 0.4; // px per ms
const FAR = 0.3; // of the sheet's height

type Phase = "enter" | "open" | "exit";

/* "MBA, The Chinese University of Hong Kong" -> the qualification and the place; "CFA charterholder" has no place, so one line.
   A bracket in the qualification is kept with it: "B.E. (Electronics), University of Pune". */
function splitEdu(item: string): [string, string | null] {
  const m = item.match(/^(.*?\))\s*,\s*(.+)$/) ?? item.match(/^([^,]+),\s*(.+)$/);
  return m ? [m[1], m[2]] : [item, null];
}

export function ManagerSheet({
  fund,
  start,
  onClose,
  renderOthers,
}: {
  fund: Fund;
  start: string; // the manager that was tapped
  onClose: () => void;
  renderOthers: (name: string) => ReactNode; // the other funds they run (the page that owns FundRow builds these)
}) {
  const [name, setName] = useState(start);
  const [switched, setSwitched] = useState(false);
  const [phase, setPhase] = useState<Phase>("enter");
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const drag = useRef({ id: -1, y0: 0, t0: 0, y: 0, t: 0, vy: 0, on: false });

  // slide up on the next frame (so the closed position is painted first and there is something to transition from)
  useEffect(() => {
    opener.current = document.activeElement;
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setPhase("open");
      }
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(go));
    const fallback = window.setTimeout(go, 120); // frames can be held back (a hidden tab, a busy page): do not leave the sheet closed
    sheet.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(fallback);
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

  // ---- pulling the sheet down by its top ----
  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drag.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), y: e.clientY, t: performance.now(), vy: 0, on: false };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId || !sheet.current) return;
    const dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.abs(dy) < 6) return; // a tap on an avatar is not a drag
      d.on = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* a pointer that is already gone: the drag still works from the events that reach the sheet */
      }
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
    const dy = e.clientY - d.y0;
    const s = sheet.current;
    s.classList.remove("dragging");
    const far = dy > s.offsetHeight * FAR;
    // a flick only counts if the finger was still moving when it lifted (held still for a moment = a slow, deliberate release)
    const flick = performance.now() - d.t < 80 && d.vy > FLICK;
    if (far || flick) {
      // carry on down from where it is (a quicker transition than the way in), then unmount
      s.classList.add("leaving");
      s.style.transform = "translateY(100%)";
      if (scrim.current) scrim.current.style.opacity = "0";
      close();
    } else {
      // let go early: clearing the inline values springs it back to rest, as a transition from here
      s.style.transform = "";
      if (scrim.current) scrim.current.style.opacity = "";
    }
  };

  const info = infoFor(name);
  const since = managerSince(name, fund);
  const years = yearsLabel(info);
  const yearsNumber = years ? Number(years.match(/\d+/)?.[0]) : null;
  const factsFrom = info.sources?.[0] ? hostOf(info.sources[0]) : "";
  const photoFrom = info.photoSource ? hostOf(info.photoSource) : "";
  const source = [factsFrom && `Details from ${factsFrom}`, photoFrom && `Photo from ${photoFrom}`].filter(Boolean).join(" · ");
  const others = renderOthers(name);
  let k = 0; // rising order of the items below
  const item = () => ({ "--k": k++ }) as CSSProperties;

  return createPortal(
    <div ref={root} className={`msheet-root ${phase}${switched ? " again" : ""}`}>
      <button ref={scrim} className="msheet-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
      <div ref={sheet} className="msheet" role="dialog" aria-modal="true" aria-label={`${name}, fund manager`} tabIndex={-1}>
        <div className="msheet-top" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <button className="msheet-grab" aria-label="Close" onClick={close}>
            <i />
          </button>
          {fund.managers.length > 1 && (
            <div className="msheet-pick" role="tablist" aria-label="Managers of this fund">
              {fund.managers.map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={m === name}
                  className={m === name ? "on" : ""}
                  onClick={() => {
                    setName(m);
                    setSwitched(true);
                  }}
                >
                  <ManagerAvatar name={m} photo={infoFor(m).photo} zoom={infoFor(m).photoZoom} size={28} />
                  {m.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="msheet-body" key={name}>
          <div className="ms-hero">
            <span className="ms-avatar" style={item()}>
              <ManagerAvatar name={name} photo={info.photo} zoom={info.photoZoom} size={88} />
            </span>
            <h2 style={item()}>{name}</h2>
            <p style={item()}>
              {info.role ?? "Fund manager"} at {fund.amc}
            </p>
          </div>

          {(years || since) && (
            <dl className="ms-stats" style={item()}>
              {years && (
                <div>
                  <dt>Experience</dt>
                  <dd>
                    {yearsNumber ? (
                      <Ticker value={yearsNumber} format={(v) => years.replace(/\d+/, String(Math.round(v)))} armed={phase === "open"} ms={700} />
                    ) : (
                      years
                    )}
                  </dd>
                </div>
              )}
              {since && (
                <div>
                  <dt>On this fund</dt>
                  <dd>{tenureText(since)}</dd>
                </div>
              )}
            </dl>
          )}

          {info.education && info.education.length > 0 && (
            <section style={item()}>
              <h3>Education</h3>
              <ul className="ms-edu">
                {info.education.map((e) => {
                  const [degree, school] = splitEdu(e);
                  return (
                    <li key={e}>
                      <b>{degree}</b>
                      {school && <small>{school}</small>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {info.background && (
            <section style={item()}>
              <h3>Background</h3>
              <p className="ms-bg">{info.background}</p>
            </section>
          )}

          {others && (
            <section style={item()}>
              <h3>Also manages</h3>
              {others}
            </section>
          )}

          {source && <p className="ms-source">{source}</p>}
        </div>
      </div>
    </div>,
    document.querySelector(".mf-layer") ?? document.body,
  );
}
