import { Fragment, useEffect, useState } from "react";
import { useMf, type Route } from "./store";
import {
  AmountScreen,
  FundScreen,
  HoldingScreen,
  ListScreen,
  RedeemScreen,
  SearchScreen,
} from "./screens";
import { AddBankScreen, PayModeScreen, UpiAppsScreen, VerifyBankScreen } from "./PayMode";
import { CheckoutScreen } from "./Checkout";
import { SipDetail2 } from "./SipDetail2";
import { OrderStatusDetail } from "./OrderStatusDetail";
import { BasketHoldingScreen } from "./BasketHoldings";
import { BasketDoneScreen, DoneScreen, FailedScreen, SipCancelledScreen } from "./Status";
import {
  BasketScreen,
  BasketsScreen,
} from "./Baskets";

function renderRoute(route: Route) {
  switch (route.name) {
    case "list":
      return <ListScreen spec={route.spec} />;
    case "search":
      return <SearchScreen />;
    case "fund":
      return <FundScreen fundId={route.fundId} />;
    case "amount":
      return <AmountScreen fundId={route.fundId} mode={route.mode} preset={route.preset} />;
    case "checkout":
      return (
        <CheckoutScreen
          fundId={route.fundId}
          amount={route.amount}
          day={route.day}
          payFirst={route.payFirst}
          fail={route.fail}
          back={route.back}
        />
      );
    case "paymode":
      return <PayModeScreen fundId={route.fundId} amount={route.amount} />;
    case "upiapps":
      return <UpiAppsScreen fundId={route.fundId} amount={route.amount} />;
    case "addbank":
      return <AddBankScreen fundId={route.fundId} amount={route.amount} />;
    case "verifybank":
      return <VerifyBankScreen fundId={route.fundId} amount={route.amount} method={route.method} added={route.added} />;
    case "done":
      return <DoneScreen done={route.done} />;
    case "failed":
      return (
        <FailedScreen kind={route.kind} fundId={route.fundId} amount={route.amount} back={route.back} />
      );
    case "holding":
      return <HoldingScreen fundId={route.fundId} />;
    case "sipdetail":
      return <SipDetail2 fundId={route.fundId} />;
    case "sipcancelled":
      return (
        <SipCancelledScreen
          fundId={route.fundId}
          amount={route.amount}
          day={route.day}
          reason={route.reason}
          inProgress={route.inProgress}
        />
      );
    case "redeem":
      return <RedeemScreen fundId={route.fundId} />;
    case "orderdetail":
      return <OrderStatusDetail orderId={route.orderId} basket={route.basket} />;
    case "basketholding":
      return <BasketHoldingScreen basketId={route.basketId} />;
    case "baskets":
      return <BasketsScreen />;
    case "basket":
      return <BasketScreen basketId={route.basketId} />;
    case "basketdone":
      return <BasketDoneScreen basketId={route.basketId} mode={route.mode} amount={route.amount} dones={route.dones} />;
  }
}

type Motion = "open" | "push" | "pop";

const LEAVE_MS = 200; // keep in step with .mf-layer.leaving in mf.css

const classify = (prev: Route[], next: Route[]): Motion =>
  prev.length === 0 ? "open" : next.length < prev.length ? "pop" : "push";

// Every MF screen after the home sits on this stack. Only the top screen is
// mounted, so going back returns to the page that opened the flow. The one exception: an order detail rises as
// a bottom sheet, so the screen it was opened from stays mounted underneath (same key as when it is the top, so
// closing the sheet does not remount it).
//
// Motion follows the direction of travel: opening slides the layer in (the content does not slide a second time),
// a push slides the new screen in from the right, a back slides the previous screen in from the left, and
// leaving the flow slides the layer back out instead of dropping it in one frame. The direction is worked out
// once per navigation, from the previous stack, and is only read by the screens that mount for it.
export function MfFlow() {
  const { stack, orders } = useMf();
  // An order sheet at the root of the flow (opened from the Orders page) rises as a sheet: its layer neither
  // slides in nor out. Decided by the first route, which is fixed for the layer's life.
  const rootIsSheet = (st: Route[]) => {
    const first = st[0];
    const o = first && first.name === "orderdetail" ? orders.find((x) => x.id === first.orderId) : undefined;
    return !!o && (o.kind !== "Redeem" || o.status === "failed");
  };
  const [nav, setNav] = useState({ stack, motion: "open" as Motion, last: stack, leaving: false });
  if (nav.stack !== stack) {
    const exit = stack.length === 0;
    setNav({
      stack,
      motion: exit ? nav.motion : classify(nav.stack, stack),
      last: exit ? nav.stack : stack,
      leaving: exit && nav.stack.length > 0 && !rootIsSheet(nav.stack),
    });
  }
  const leaving = stack.length === 0 && nav.leaving;
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setNav((n) => ({ ...n, leaving: false })), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const shown = stack.length > 0 ? stack : leaving ? nav.last : [];
  const top = shown[shown.length - 1];
  if (!top) return null;
  const under = top.name === "orderdetail" && shown.length > 1 ? shown[shown.length - 2] : undefined;
  return (
    <div
      className={`mf-layer ${nav.motion}${rootIsSheet(shown) ? " sheet-first" : ""}${leaving ? " leaving" : ""}`}
    >
      {under && <Fragment key={`${shown.length - 1}-${under.name}`}>{renderRoute(under)}</Fragment>}
      <Fragment key={`${shown.length}-${top.name}`}>{renderRoute(top)}</Fragment>
    </div>
  );
}
