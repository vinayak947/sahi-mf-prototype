import { useEffect, useRef, useState } from "react";
import type { Fund } from "../../data";

/* Shared by every version of the Return calculator: the maths, the ranges and the state that survives switching versions. */

export type Mode = "sip" | "lump";

/* The fund publishes 1Y, 3Y and 5Y annualised returns, so those are the only periods. */
export const PERIODS = [
  { label: "1Y", years: 1 },
  { label: "3Y", years: 3 },
  { label: "5Y", years: 5 },
] as const;

export const rateAt = (f: Fund, years: number) => (years === 1 ? f.r1 : years === 3 ? f.r3 : f.r5);

/* What an amount would have become at the fund's own annualised return.
   SIP: one instalment at the start of every month, each growing at that same rate. */
export function growMonths(mode: Mode, amount: number, months: number, annualPct: number) {
  const g = 1 + annualPct / 100;
  if (mode === "lump") return { invested: amount, value: amount * g ** (months / 12) };
  const i = g ** (1 / 12) - 1;
  const invested = amount * months;
  const value = Math.abs(i) < 1e-9 ? invested : amount * (((1 + i) ** months - 1) / i) * (1 + i);
  return { invested, value };
}

export const grow = (mode: Mode, amount: number, years: number, annualPct: number) => growMonths(mode, amount, years * 12, annualPct);

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;
const clamp = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, v));

export type Range = { min: number; max: number; step: number };

export type CalcModel = {
  fund: Fund;
  /** What the numbers describe, in a sentence: "fund" on a fund page, "basket" on a basket page. */
  subject: string;
  /** The fold is open (versions hold their numbers at 0 until it is, so opening plays them). */
  open: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  amount: number;
  setAmount: (v: number) => void;
  range: Range;
  /** 1, 3 or 5. */
  years: number;
  setYears: (y: number) => void;
  rate: number;
  invested: number;
  value: number;
  gain: number;
  change: number;
  tone: "up" | "down";
};

export function useCalcModel(fund: Fund, open: boolean, subject = "fund"): CalcModel {
  const sip = { min: Math.max(500, roundUp(fund.minSip, 500)), max: 50000, step: 500 };
  const lump = { min: Math.max(5000, roundUp(fund.minLump, 5000)), max: 500000, step: 5000 };
  const [mode, setMode] = useState<Mode>("sip");
  const [amounts, setAmounts] = useState({ sip: clamp(5000, sip), lump: clamp(25000, lump) });
  const [years, setYears] = useState(3);

  const range = mode === "sip" ? sip : lump;
  const amount = amounts[mode];
  const rate = rateAt(fund, years);
  const { invested, value } = grow(mode, amount, years, rate);
  const gain = value - invested;
  return {
    fund,
    subject,
    open,
    mode,
    setMode,
    amount,
    setAmount: (v) => setAmounts((a) => ({ ...a, [mode]: v })),
    range,
    years,
    setYears,
    rate,
    invested,
    value,
    gain,
    change: (gain / invested) * 100,
    tone: gain >= 0 ? "up" : "down",
  };
}

export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A number that counts to its new value (ease-out, 240ms by default) and picks up from wherever it is if the target moves again
   mid-count. While the fold is closed it holds at 0, so opening the widget plays the count. */
export function Ticker({ value, format, armed = true, ms = 240 }: { value: number; format: (v: number) => string; armed?: boolean; ms?: number }) {
  const [shown, setShown] = useState(armed ? value : 0);
  const at = useRef(shown);
  const raf = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (!armed) {
      // Reset after the fold has gone, so nothing visibly counts down while it closes.
      const t = setTimeout(() => {
        at.current = 0;
        setShown(0);
      }, 280);
      return () => clearTimeout(t);
    }
    if (reducedMotion()) {
      at.current = value;
      setShown(value);
      return;
    }
    const from = at.current;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      at.current = from + (value - from) * (1 - (1 - p) ** 4);
      setShown(at.current);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, armed, ms]);

  return (
    <span className="tick-num">
      <span className="roll-sr">{format(value)}</span>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}
