import { useSyncExternalStore, type ReactNode } from "react";

// "Hide values": one switch for the whole Portfolio (Mutual funds and Stocks), kept for the session.
let hidden = false;
let flips = 0; // how many times it has been toggled, so values only animate after a toggle and never on first paint
const subs = new Set<() => void>();
const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => void subs.delete(fn);
};

export const toggleHidden = () => {
  hidden = !hidden;
  flips += 1;
  subs.forEach((fn) => fn());
};

export const useHidden = () => useSyncExternalStore(subscribe, () => hidden);

// A value that swaps to dots when hidden; the rupee sign stays, only the figures go. The swap crossfades with a touch of blur (see .mask-swap) so it reads as one change.
export function Masked({ children, mask = "₹••••" }: { children: ReactNode; mask?: string }) {
  const off = useHidden();
  return (
    <span key={String(off)} className={flips > 0 ? "mask-swap" : undefined} aria-label={off ? "Hidden" : undefined}>
      {off ? <span aria-hidden="true">{mask}</span> : children}
    </span>
  );
}
