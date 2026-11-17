import { PERIODS, grow, rateAt, type CalcModel } from "./core";
import { CoinsChart } from "./coins";

/* The chart area of the Original calculator: MULTIPLES, drawn as coins. Earlier versions (Ladder, Bars, Dots, Curve, Rows) are in
   Mutual Funds/archive. */

export type PeriodRow = { label: string; years: number; invested: number; value: number; change: number; tone: "up" | "down" };

export const periodRows = (m: CalcModel): PeriodRow[] =>
  PERIODS.map((p) => {
    const g = grow(m.mode, m.amount, p.years, rateAt(m.fund, p.years));
    return { ...p, ...g, change: ((g.value - g.invested) / g.invested) * 100, tone: g.value >= g.invested ? "up" : "down" };
  });

/* MULTIPLES, drawn as stacks of coins (./coins). */
export function Multiples({ m }: { m: CalcModel }) {
  const rows = periodRows(m);
  return (
    <div className="mx">
      <CoinsChart m={m} rows={rows} />
    </div>
  );
}
