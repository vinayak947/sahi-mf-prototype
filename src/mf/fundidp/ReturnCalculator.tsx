import { useState } from "react";
import type { Fund } from "../data";
import { Fold } from "./parts";
import { Original } from "./calc/Original";
import { useCalcModel } from "./calc/core";
import { short } from "./calc/coins";

export { Dial } from "./calc/Dial";

/* The Return calculator on the fund page. The amount, SIP or one-time, and how far back live in one model (./calc/core), and
   the calculator itself is ./calc/Original. Other versions that were tried are in Mutual Funds/archive. */
export function ReturnCalculator({ fund, subject = "fund" }: { fund: Fund; subject?: string }) {
  const [open, setOpen] = useState(false);
  const m = useCalcModel(fund, open, subject);

  // Closed, the row is the whole answer in one line, four facts in reading order: what went in, how (SIP = every month,
  // "once" = one-time), what it became, over how long. "₹5K SIP → ₹2.4L in 3 yrs" / "₹1L once → ₹1.6L in 3 yrs".
  // Earlier tries each dropped one: "₹2.4L from ₹5K/mo" (how long?), "₹2.4L in 3 yrs" (from what?). "SIP" is the word on
  // the page's own button, so it carries "a month" in three letters. Screen readers get the full sentence.
  const span = `${m.years} ${m.years === 1 ? "yr" : "yrs"}`;
  return (
    <Fold
      title="Return calculator"
      defaultOpen={false}
      onOpenChange={setOpen}
      summary={
        <span aria-label={`${m.mode === "sip" ? `${short(m.amount)} a month` : `${short(m.amount)} one-time`} for ${span} would have become ${short(m.value)}`}>
          {short(m.amount)} {m.mode === "sip" ? "SIP" : "once"} &rarr; <b className={m.tone}>{short(m.value)}</b> in {span}
        </span>
      }
    >
      <Original m={m} />
      <p className="mf-small-idp">
        {subject === "fund" ? "Based on this fund\u2019s past returns." : `Based on the past returns of the funds in this ${subject}, weighted by their share.`} Past performance does not
        predict future returns.
      </p>
    </Fold>
  );
}
