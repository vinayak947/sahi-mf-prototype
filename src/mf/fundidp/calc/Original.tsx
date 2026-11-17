import { inr, pct } from "../format";
import { SegmentSwitcher } from "../parts";
import { Dial } from "./Dial";
import { PERIODS, grow, rateAt, type CalcModel } from "./core";
import { Multiples } from "./charts";

/* The Return calculator: SIP or one-time, an amount ruler, the Multiples chart (a card per period), three summary rows.
   The other versions (Rolling, Time machine, and the Bars / Ladder / Dots charts) are in Mutual Funds/archive. */
export function Original({ m }: { m: CalcModel }) {
  const { mode, amount, range, fund } = m;
  const pick = m.years;
  const results = PERIODS.map((p) => ({ ...p, ...grow(mode, amount, p.years, rateAt(fund, p.years)) }));
  const chosen = results.find((r) => r.years === pick)!;
  const change = ((chosen.value - chosen.invested) / chosen.invested) * 100;
  const tone = change >= 0 ? "up" : "down";

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

        <span className="rc-label-idp">{mode === "sip" ? "Monthly investment" : "One-time investment"}</span>
        <output className="rc-amount-idp" aria-live="polite">
          {inr(amount)}
        </output>
        <Dial key={mode} label={mode === "sip" ? "Monthly investment" : "One-time investment"} {...range} value={amount} onChange={m.setAmount} />

        <Multiples m={m} />

        <dl className="rc-rows-idp">
          <div>
            <dt>
              <i className="rc-dot-idp in" />
              Total investment
            </dt>
            <dd>{inr(Math.round(chosen.invested))}</dd>
          </div>
          <div>
            <dt>
              <i className={`rc-dot-idp out ${tone}`} />
              Would have become
            </dt>
            <dd>{inr(Math.round(chosen.value))}</dd>
          </div>
          <div className="rc-total-idp">
            <dt>{PERIODS.find((p) => p.years === pick)!.label} returns</dt>
            <dd className={tone}>{pct(change, 1)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
