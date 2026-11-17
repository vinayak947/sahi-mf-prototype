import type { ListSpec } from "./store";

// "SIP from ₹100": one definition for every place that opens or shows this list (the home banner's Start a SIP,
// the Collections tile, the SIP tab's empty state), so a change to the list happens once.
export const SIP_FROM_100: ListSpec = {
  title: "SIP from ₹100",
  sipOnly: true,
  withExtras: true,
  caption: "A SIP invests a set amount every month. Start at ₹100, stop any time.",
};
