import { Fragment } from "react";
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
      return <OrderStatusDetail orderId={route.orderId} />;
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

// Every MF screen after the home sits on this stack. Only the top screen is
// mounted, so going back returns to the page that opened the flow.
export function MfFlow() {
  const { stack } = useMf();
  const top = stack[stack.length - 1];
  if (!top) return null;
  return (
    <div className="mf-layer">
      <Fragment key={`${stack.length}-${top.name}`}>{renderRoute(top)}</Fragment>
    </div>
  );
}
