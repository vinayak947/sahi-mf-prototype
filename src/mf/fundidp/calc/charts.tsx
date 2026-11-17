import { PERIODS, Ticker, grow, rateAt, type CalcModel } from "./core";
import { pct } from "../format";

/* The chart area of the Original calculator: MULTIPLES, chosen by the user. The Ladder, Bars and Dots versions are kept in
   Mutual Funds/archive/calculator-chart-ladder and calculator-chart-bars-dots.
   Three period cards, each with one big number (how many times your money came back); a tap picks the period that the three
   rows under the chart describe. */

export type PeriodRow = { label: string; years: number; invested: number; value: number; change: number; tone: "up" | "down" };

export const periodRows = (m: CalcModel): PeriodRow[] =>
  PERIODS.map((p) => {
    const g = grow(m.mode, m.amount, p.years, rateAt(m.fund, p.years));
    return { ...p, ...g, change: ((g.value - g.invested) / g.invested) * 100, tone: g.value >= g.invested ? "up" : "down" };
  });

/* MULTIPLES: three period cards, each with one big number, how many times your money came back (1.46x). The line under them
   says the same thing per ₹100, which needs no explaining. (The per-₹100 line is removed, 2026-11-16.) */
export function Multiples({ m }: { m: CalcModel }) {
  const rows = periodRows(m);
  return (
    <div className="mx">
      <div className="mx-cards" role="tablist" aria-label="Time period">
        {rows.map((r) => {
          const on = m.years === r.years;
          return (
            <button key={r.label} role="tab" aria-selected={on} className={`mx-card${on ? " on" : ""}`} onClick={() => m.setYears(r.years)}>
              <span className="mx-label">{r.years} {r.years === 1 ? "year" : "years"}</span>
              <span className={`mx-x ${r.tone}`}>
                <Ticker value={(r.value / r.invested) * 100} format={(v) => `${(v / 100).toFixed(2)}×`} armed={m.open} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
