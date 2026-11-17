import { useState } from "react";
import type { Fund } from "../data";
import { Fold } from "./parts";
import { Original } from "./calc/Original";
import { useCalcModel } from "./calc/core";

export { Dial } from "./calc/Dial";

/* The Return calculator on the fund page. The amount, SIP or one-time, and how far back live in one model (./calc/core), and
   the calculator itself is ./calc/Original. Other versions that were tried are in Mutual Funds/archive. */
export function ReturnCalculator({ fund, subject = "fund" }: { fund: Fund; subject?: string }) {
  const [open, setOpen] = useState(false);
  const m = useCalcModel(fund, open, subject);

  return (
    <Fold title="Return calculator" defaultOpen={false} onOpenChange={setOpen}>
      <Original m={m} />
      <p className="mf-small-idp">
        {subject === "fund" ? "Based on this fund\u2019s past returns." : `Based on the past returns of the funds in this ${subject}, weighted by their share.`} Past performance does not
        predict future returns.
      </p>
    </Fold>
  );
}
