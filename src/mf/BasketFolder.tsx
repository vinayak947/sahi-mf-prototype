// Folder-style basket cards (Base Design System node 6813:75725) and the switches for their extra effects.
// Every effect can be turned off on its own: long-press "Researcher backed baskets" on the home page to open the
// switches (kept in this browser's storage), or change FX_DEFAULTS below to change what everyone starts with.
import "./folder.css";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DlsBottomSheet } from "../ui/dls";
import { basketFunds, type Basket } from "./baskets-data";
import { FundMark } from "./parts";

// ---- Effect switches ----------------------------------------------------------------------------

export const FX_LABELS = {
  sheets: "Fund sheets peek out of the folder",
  press: "Folder opens when pressed",
  tabColour: "Coloured tab per basket",
  tabLabel: "Holding period on the tab",
  focus: "Card in focus rises in the carousel",
  enter: "Folders slide in on “View all”",
} as const;

export type FxKey = keyof typeof FX_LABELS;
export type Fx = Record<FxKey, boolean>;

const FX_DEFAULTS: Fx = { sheets: true, press: true, tabColour: true, tabLabel: true, focus: true, enter: true };
const STORE_KEY = "bk-folder-fx";

function readFx(): Fx {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Partial<Fx>;
    return { ...FX_DEFAULTS, ...saved };
  } catch {
    return FX_DEFAULTS;
  }
}

let current = readFx();
const listeners = new Set<() => void>();

export function setFx(next: Partial<Fx>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(current));
  } catch {
    /* storage can be blocked; the switch still works until reload */
  }
  listeners.forEach((l) => l());
}

export function useFx(): Fx {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

// "sheets press tabColour …" for the card's data-fx attribute, which folder.css keys every effect on.
export const fxAttr = (fx: Fx) =>
  (Object.keys(fx) as FxKey[]).filter((k) => fx[k]).join(" ");

// Long-press (600 ms) handlers for the element that opens the switches.
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const cancel = () => window.clearTimeout(timer.current);
  return {
    onPointerDown: () => {
      cancel();
      timer.current = window.setTimeout(onLongPress, 600);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

export function FxSheet({ onClose }: { onClose: () => void }) {
  const fx = useFx();
  const allOff = (Object.keys(fx) as FxKey[]).every((k) => !fx[k]);
  return (
    <DlsBottomSheet title="Folder effects" onClose={onClose}>
      <div className="bk-fx">
        <h3>Folder effects</h3>
        {(Object.keys(FX_LABELS) as FxKey[]).map((k) => (
          <button key={k} className="bk-fx-row" role="switch" aria-checked={fx[k]} onClick={() => setFx({ [k]: !fx[k] })}>
            <span>{FX_LABELS[k]}</span>
            <i className="bk-fx-switch" aria-hidden="true" />
          </button>
        ))}
        <button
          className="text-link bk-fx-all"
          onClick={() => setFx(Object.fromEntries(Object.keys(fx).map((k) => [k, allOff])) as Fx)}
        >
          {allOff ? "Turn all on" : "Turn all off"}
        </button>
      </div>
    </DlsBottomSheet>
  );
}

// ---- Folder geometry ----------------------------------------------------------------------------

const TAB = 17; // how far the back sheet's tab rises above the front sheet
const SHEET_RISE = 12; // extra room above the back sheet for the fund sheets

function frontPath(w: number, h: number) {
  return `M0 16.37C-.2 7.39 7.02 0 16 0H${w - 16}C${w - 7.02} 0 ${w + 0.2} 7.39 ${w - 0.005} 16.37`
    + `L${w - 3.27} ${h - 15.63}C${w - 3.47} ${h - 6.94} ${w - 10.57} ${h} ${w - 19.26} ${h}`
    + `H19.26C10.57 ${h} 3.47 ${h - 6.94} 3.26 ${h - 15.63}Z`;
}

function backPath(w: number, h: number) {
  return `M0 16.34C-.19 7.37 7.03 0 16 0H76.83C80.75 0 84.53 1.44 87.46 4.04L89.61 5.96C92.54 8.56 96.32 10 100.24 10`
    + `H${w - 16}C${w - 7.02} 10 ${w + 0.2} 17.38 ${w} 26.36L${w - 3.29} ${h - 15.65}C${w - 3.49} ${h - 6.95} ${w - 10.59} ${h} ${w - 19.29} ${h}`
    + `H19.33C10.62 ${h} 3.51 ${h - 6.96} 3.33 ${h - 15.66}Z`;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

// Sheet positions: [left px, top px, turn °]. They start right of the tab so its label stays readable, and step
// 30px apart so each one's logo shows.
const SHEETS: [number, number, number][] = [
  [110, 0, -2],
  [140, 4, 1.5],
  [170, 2, -1],
];

// The card: back sheet (with its tab label), fund sheets, then the front sheet holding the content.
export function FolderCard({
  basket,
  tint,
  focus,
  enter,
  index,
  label,
  onClick,
  children,
}: {
  basket: Basket;
  tint: number;
  focus?: boolean;
  enter?: boolean;
  index: number;
  label: string;
  onClick: () => void;
  children: (sheetsShown: boolean) => ReactNode;
}) {
  const fx = useFx();
  const card = useSize<HTMLButtonElement>();
  const rise = fx.sheets ? SHEET_RISE : 0;
  const top = rise + TAB;
  const { w, h } = card.size;
  const funds = basketFunds(basket).slice(0, 3);
  return (
    <button
      ref={card.ref}
      className={`bk-card bk-folder-card${enter && fx.enter ? " enter" : ""}`}
      data-tint={tint % 3}
      data-fx={fxAttr(fx)}
      data-focus={(fx.focus && focus) || undefined}
      style={{ "--i": index } as React.CSSProperties}
      aria-label={label}
      onClick={onClick}
    >
      <svg className="bk-folder" width={w} height={h} aria-hidden="true">
        {w > 0 && <path className="bk-folder-back" transform={`translate(4 ${rise})`} d={backPath(w - 8, h - rise)} />}
      </svg>
      {fx.tabLabel && (
        <span className="bk-tab-label" style={{ top: rise + 3 }} aria-hidden="true">
          Hold {basket.years}Y+
        </span>
      )}
      {fx.sheets && (
        <span className="bk-sheets" aria-hidden="true">
          {funds.map(({ fund }, i) => (
            <span
              key={`${fund.id}-${i}`}
              className="bk-sheet"
              style={{ left: SHEETS[i][0], top: SHEETS[i][1], rotate: `${SHEETS[i][2]}deg` }}
            >
              <FundMark fund={fund} size={18} />
            </span>
          ))}
        </span>
      )}
      <span className="bk-front" style={{ marginTop: top }}>
        <svg className="bk-folder" width={w} height={Math.max(h - top, 0)} aria-hidden="true">
          {w > 0 && <path className="bk-folder-front" d={frontPath(w, h - top)} />}
        </svg>
        {children(fx.sheets)}
      </span>
    </button>
  );
}
