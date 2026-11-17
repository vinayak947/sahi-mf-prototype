// The basket page was written against another copy of the basket data. These are the same baskets, funds and
// figures as ../baskets-data.ts, under the names that page uses.
import { basketAvailability } from "../baskets-data";
import type { Fund } from "../data";

export {
  baskets,
  basketById,
  basketFunds,
  basketRisk,
  basketAsFund,
  riskLabel,
  REVIEWED,
  NEXT_REVIEW,
  basketReturn3Y as blended3Y,
  basketReturns as blendedReturns,
  basketMinimum as basketMin,
  basketExpense as basketCost,
  NIFTY_50 as NIFTY50,
  researchers as RESEARCHERS,
  basketFundId,
  type Basket,
} from "../baskets-data";
import type { Basket } from "../baskets-data";

// Same answer as basketAvailability, with `fund` optional so the page can read it without narrowing first.
export const basketBuyState = (basket: Basket): { state: "open" | "sip-only" | "paused"; fund?: Fund } => basketAvailability(basket);
