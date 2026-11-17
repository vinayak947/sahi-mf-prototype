import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Numbers that roll into place, like a live ticker: every digit sits on a short reel and slides a few steps down to its
// real value. It plays every time the number appears (each visit to Portfolio, and when the Mutual funds / Stocks tab
// changes), and is skipped for reduced motion.
const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const REEL = [...Array(20).keys()].map((n) => n % 10); // 0-9 twice, so a digit can roll 3 steps from any start
const STEPS = 3;

export function RollText({ text, className }: { text: string; className?: string }) {
  const [live] = useState(() => !reduce());
  const [landed, setLanded] = useState(!live);
  const frame = useRef(0);
  useLayoutEffect(() => {
    if (!live) return;
    // Paint the reels at their start positions, then let them travel.
    frame.current = requestAnimationFrame(() => (frame.current = requestAnimationFrame(() => setLanded(true))));
    return () => cancelAnimationFrame(frame.current);
  }, [live]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  let digitIndex = 0;
  return (
    <span className={`roll${className ? ` ${className}` : ""}`} aria-label={text}>
      {[...text].map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden="true">
              {ch}
            </span>
          );
        }
        const d = Number(ch);
        const n = digitIndex++;
        const row = landed ? d + 10 : d + 10 - STEPS;
        return (
          <span key={i} className="rd" aria-hidden="true">
            <span className="rd-size">{d}</span>
            <span
              className="rd-col"
              style={{
                transform: `translateY(calc(var(--rd-h) * -${row}))`,
                transition: live ? `transform 900ms cubic-bezier(0.23, 1, 0.32, 1) ${n * 40}ms` : "none",
              }}
            >
              {REEL.map((v, k) => (
                <span key={k}>{v}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
