import { inr } from "../format";
import { SegmentSwitcher } from "../parts";
import { Dial } from "./Dial";
import type { CalcModel } from "./core";
import { Multiples } from "./charts";

/* The Return calculator: SIP or one-time, an amount ruler, and three coin stacks, one each for 1, 3 and 5 years, all shown
   at once (nothing to pick). Each stack carries what the money became and what went in above it, and its period with its
   return below it.
   Tried and archived: Grouped / One stack (one stack with a year switch, in Mutual Funds/archive/calculator-grouped-one-
   stack), Answer first / Sentence / Readout / Ruler last (calculator-layouts-answer-sentence-readout), and older versions. */
export function Original({ m }: { m: CalcModel }) {
  const { mode, amount, range } = m;
  const label = mode === "sip" ? "Monthly investment" : "One-time investment";

  return (
    <div className="rco">
      <p className="rc-lead-idp">See what this {m.subject} would have turned your money into.</p>
      <div className="rc-idp">
        <SegmentSwitcher
          wide
          label="How you invest"
          value={mode}
          onChange={m.setMode}
          options={[
            ["sip", "Monthly SIP"],
            ["lump", "One-time"],
          ]}
        />
        <span className="rc-label-idp">{label}</span>
        <output className="rc-amount-idp" aria-live="polite">
          {inr(amount)}
        </output>
        <Dial key={mode} label={label} {...range} value={amount} onChange={m.setAmount} />
        <Multiples m={m} />
      </div>
    </div>
  );
}
