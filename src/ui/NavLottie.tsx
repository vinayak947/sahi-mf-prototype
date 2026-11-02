import lottie, { type AnimationItem } from "lottie-web/build/player/lottie_light";
import { useEffect, useRef } from "react";

import commodities from "../lottie/commodities.json";
import fno from "../lottie/fno.json";
import orders from "../lottie/orders.json";
import portfolio from "../lottie/portfolio.json";
import stocks from "../lottie/stocks.json";
import watchlist from "../lottie/watchlist.json";

// Bottom-bar icon animations (supplied as "<name> LM.json", light mode). Each
// one runs from the outline icon (frame 0, unselected) to the filled icon
// (last frame, selected), so a tab shows frame 0 until it is chosen and then
// plays through once.
export const navLotties = {
  commodities,
  fno,
  orders,
  portfolio,
  stocks,
  watchlist,
};

export type NavLottieName = keyof typeof navLotties;

// Optical sizing. Each canvas is 636 x 768 with the artwork somewhere inside
// it, so every icon gets its own scale (so its tallest side is ~24px) and its
// own centre point (in canvas units) to line it up with the tab's icon slot.
// Measured from the rendered frames, strokes included.
const fit: Record<NavLottieName, { s: number; cx: number; cy: number }> = {
  fno: { s: 0.1, cx: 316.5, cy: 288.5 },
  commodities: { s: 0.093, cx: 316.5, cy: 285 },
  stocks: { s: 0.092, cx: 316.5, cy: 288 },
  watchlist: { s: 0.104, cx: 317.5, cy: 292 },
  orders: { s: 0.094, cx: 317, cy: 273.5 },
  portfolio: { s: 0.102, cx: 321, cy: 304.5 },
};

const FIRST_PLAY_DELAY = 450;

export function NavLottie({
  name,
  selected,
}: {
  name: NavLottieName;
  selected: boolean;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const animation = useRef<AnimationItem | null>(null);
  const mountedAt = useRef(performance.now());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // (Re)build the animation when the artwork changes (e.g. Home switching
  // between the F&O / Commodities / Stocks icons).
  useEffect(() => {
    if (!box.current) return;

    // lottie-web mutates the data it is given, so hand it a copy.
    const instance = lottie.loadAnimation({
      container: box.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: JSON.parse(JSON.stringify(navLotties[name])),
    });
    animation.current = instance;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let timer = 0;

    const settle = () => {
      if (selectedRef.current) {
        if (reduceMotion) {
          instance.goToAndStop(instance.totalFrames - 1, true);
        } else {
          // Right after the bar mounts, wait for it to fade in first.
          const wait = FIRST_PLAY_DELAY - (performance.now() - mountedAt.current);
          if (wait > 0) {
            instance.goToAndStop(0, true);
            timer = window.setTimeout(() => instance.goToAndPlay(0, true), wait);
          } else {
            instance.goToAndPlay(0, true);
          }
        }
      } else {
        instance.goToAndStop(0, true);
      }
    };

    if (instance.isLoaded) settle();
    else instance.addEventListener("DOMLoaded", settle);

    return () => {
      window.clearTimeout(timer);
      instance.destroy();
      animation.current = null;
    };
  }, [name]);

  // Play when the tab becomes selected, rest on the outline when it is not.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const instance = animation.current;
    if (!instance || !instance.isLoaded) return;

    if (!selected) {
      instance.goToAndStop(0, true);
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      instance.goToAndStop(instance.totalFrames - 1, true);
    } else {
      instance.goToAndPlay(0, true);
    }
  }, [selected]);

  return (
    <span
      aria-hidden="true"
      className="nav-lottie"
      ref={box}
      style={
        {
          "--s": fit[name].s,
          "--cx": fit[name].cx,
          "--cy": fit[name].cy,
        } as React.CSSProperties
      }
    />
  );
}
