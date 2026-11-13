import { sampleBasketPositions, type BasketPosition } from "./baskets-data";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cutoffKind,
  folioFor,
  fundById,
  payoutDays,
  sampleHoldings,
  sampleOrders,
  sampleSips,
  type CategoryKey,
  type Holding,
  type Lot,
  type MfOrder,
  type Sip,
} from "./data";
import {
  addBusinessDays,
  allotDay,
  fmtDay,
  fmtTime,
  istNow,
  navDay,
  nextSipDate,
  stampDuty,
  tradeDay,
  afterCutoff,
} from "./format";
import type { GoalArtSpec } from "./GoalArt";
import { DEFAULT_METHOD, REGISTERED, sameAccount, type Account, type PayMethod } from "./payData";

// "new"      never traded: intro-first layout
// "traded"   has traded, no MF yet: search-first layout, empty holdings strip
// "holdings" has traded and holds funds (sample data)
export type Segment = "new" | "traded" | "holdings";

// A "dream" page: a poster hero, the promise, the rule behind the list and an optional "what it takes" ladder.
export type Bucket = {
  tone: string; // poster background
  big: string; // the hook number, spelled out: "₹1 crore"
  promise: string;
  note?: string; // conditions, shown under the poster
  listTitle: string; // heading above the list: what it holds
  ladder?: { goal: string; target: number; years: number }[];
  art?: GoalArtSpec; // Order 2.0: illustrated card and poster
  noListFacts?: boolean; // Order 2.0: hide the "all have a 5+ year record" line above the list
};

export type ListSpec = {
  title: string;
  cat?: CategoryKey;
  cats?: CategoryKey[];
  bucket?: Bucket;
  sipOnly?: boolean;
  equityOnly?: boolean;
  minStars?: number;
  caption?: string;
  theme?: string; // Order 2.0: sector page; the chips switch between sectors
  withExtras?: boolean; // Order 2.0: list from nextFunds (core funds plus sector and extra funds)
};

export type Done = {
  kind: "Lumpsum" | "SIP" | "Redeem";
  fundId: string;
  amount: number;
  navDate: string;
  unitsBy: string;
  firstDebit?: string;
  paidNow?: boolean;
  afterCutoff: boolean;
  orderId: string;
  pending?: boolean; // the bank hasn't confirmed yet: no feedback received
  stampDuty?: number; // taken from a purchase before units are allotted
  units?: number; // redeem: units sold
};

export type Route =
  | { name: "list"; spec: ListSpec }
  | { name: "search" }
  | { name: "fund"; fundId: string }
  | { name: "amount"; fundId: string; mode: "lump" | "sip"; preset?: number }
  | { name: "checkout"; fundId: string; amount: number; day?: number; payFirst?: boolean; fail?: boolean; back?: Route }
  | { name: "paymode"; fundId: string; amount: number }
  | { name: "upiapps"; fundId: string; amount: number }
  | { name: "addbank"; fundId: string; amount: number }
  | { name: "verifybank"; fundId: string; amount: number; method: PayMethod & { account: Account }; added?: boolean }
  | { name: "done"; done: Done }
  | { name: "failed"; kind: "payment" | "mandate"; fundId: string; amount: number; back: Route }
  | { name: "holding"; fundId: string }
  | { name: "sipdetail"; fundId: string }
  | { name: "sipcancelled"; fundId: string; amount: number; day: number; reason: string; inProgress: number }
  | { name: "redeem"; fundId: string }
  | { name: "orderdetail"; orderId: string }
  // Researcher backed baskets (Order 2.0 home); see Baskets.tsx
  | { name: "baskets" }
  | { name: "basketholding"; basketId: string }
  | { name: "basket"; basketId: string }
  | { name: "basketdone"; basketId: string; mode: "lump" | "sip"; amount: number; dones: Done[] };

type Store = {
  stack: Route[];
  push: (route: Route) => void;
  replace: (route: Route) => void;
  pop: () => void;
  closeAll: () => void;
  segment: Segment;
  setSegment: (segment: Segment) => void;
  holdings: Holding[];
  basketPositions: BasketPosition[]; // Order 2.0: what is held through baskets
  addBasketPosition: (basketId: string, amount: number, sip?: { amount: number; day: number }) => void;
  orders: MfOrder[];
  sips: Sip[];
  mandateLimit: number; // UPI AutoPay approved up to this much per debit; 0 = none yet
  payMethod: PayMethod;
  setPayMethod: (method: PayMethod) => void;
  verifiedBanks: Account[]; // in the investor's name: the only accounts money may come from
  isVerified: (account: Account) => boolean;
  verifyBank: (account: Account) => void;
  mfSeen: boolean;
  markSeen: () => void;
  placeLump: (fundId: string, amount: number, pending?: boolean) => Done;
  placeSip: (fundId: string, amount: number, day: number, payFirst: boolean, pending?: boolean) => Done;
  placeRedeem: (fundId: string, units: number, amount?: number) => Done;
  cancelSip: (fundId: string) => void;
  viewOrders: () => void;
  viewSips: () => void;
  jump: "orders-mf" | null;
  clearJump: () => void;
};

const Ctx = createContext<Store | null>(null);

export function useMf(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useMf outside MfProvider");
  return store;
}

let orderSeq = 100;

// Prototype timings for what the bank, exchange and fund house do in the background.
const BANK_CONFIRM_MS = 20000; // "no word from the bank" turns into money received
const ALLOT_MS = 40000; // money received to units allotted (or redemption paid out)

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Two orders for the same thing within this window are a double tap, not a decision.
const SAME_ROUTE = (a: Route | undefined, b: Route) => !!a && JSON.stringify(a) === JSON.stringify(b);

// Dev panel "Invested flow": remembered in this browser so a reload keeps the same demo.
const INVESTED_KEY = "sahi-dev-invested";

function readInvested(): boolean {
  try {
    return localStorage.getItem(INVESTED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveInvested(on: boolean) {
  try {
    localStorage.setItem(INVESTED_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked: the switch still works for this visit */
  }
}

export function MfProvider({
  children,
  onOpenPage,
}: {
  children: ReactNode;
  onOpenPage: (page: "orders" | "sip") => void;
}) {
  const [stack, setStack] = useState<Route[]>([]);
  const [invested] = useState(readInvested);
  const [segment, setSegmentState] = useState<Segment>(invested ? "holdings" : "new");
  const [holdings, setHoldings] = useState<Holding[]>(invested ? sampleHoldings : []);
  const [basketPositions, setBasketPositions] = useState<BasketPosition[]>(invested ? sampleBasketPositions : []);
  const [orders, setOrders] = useState<MfOrder[]>(invested ? sampleOrders : []);
  const [sips, setSips] = useState<Sip[]>(invested ? sampleSips : []);
  const [mandateLimit, setMandateLimit] = useState(invested ? 10000 : 0);
  const [payMethod, setPayMethod] = useState<PayMethod>(DEFAULT_METHOD);
  const [verifiedBanks, setVerifiedBanks] = useState<Account[]>(REGISTERED);
  const isVerified = useCallback((a: Account) => verifiedBanks.some((v) => sameAccount(v, a)), [verifiedBanks]);
  const verifyBank = useCallback(
    (account: Account) => setVerifiedBanks((list) => (list.some((v) => sameAccount(v, account)) ? list : [...list, account])),
    [],
  );
  const [mfSeen, setMfSeen] = useState(false);
  const [jump, setJump] = useState<"orders-mf" | null>(null);

  // Ignores a second push of the screen already on top: a double tap on Invest opens one checkout.
  const push = useCallback((route: Route) => setStack((s) => (SAME_ROUTE(s[s.length - 1], route) ? s : [...s, route])), []);
  const replace = useCallback(
    (route: Route) => setStack((s) => [...s.slice(0, -1), route]),
    [],
  );
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const closeAll = useCallback(() => setStack([]), []);

  const setSegment = useCallback((next: Segment) => {
    setSegmentState(next);
    saveInvested(next === "holdings");
    setStack([]);
    if (next === "holdings") {
      setHoldings(sampleHoldings);
      setBasketPositions(sampleBasketPositions);
      setOrders(sampleOrders);
      setSips(sampleSips);
      setMandateLimit(10000);
    } else {
      setHoldings([]);
      setBasketPositions([]);
      setOrders([]);
      setSips([]);
      setMandateLimit(0);
    }
  }, []);

  // Money received: the purchase shows as a lot waiting for allotment.
  const addHolding = useCallback((fundId: string, amount: number, orderId: string, pending: string) => {
    const fund = fundById(fundId);
    const net = amount - stampDuty(amount);
    const units = net / fund.nav;
    const lot: Lot = { date: iso(istNow()), units, allotted: false, orderId };
    setHoldings((list) => {
      const existing = list.find((h) => h.fundId === fundId);
      if (existing) {
        return list.map((h) =>
          h.fundId === fundId
            ? {
                ...h,
                invested: h.invested + amount,
                current: h.current + net,
                units: h.units + units,
                pending,
                lots: [...h.lots, lot],
              }
            : h,
        );
      }
      return [...list, { fundId, invested: amount, current: net, units, since: lot.date, pending, lots: [lot] }];
    });
  }, []);

  const addBasketPosition = useCallback((basketId: string, amount: number, sip?: { amount: number; day: number }) => {
    setBasketPositions((list) => {
      const existing = list.find((p) => p.basketId === basketId);
      if (existing)
        return list.map((p) => (p.basketId === basketId ? { ...p, invested: p.invested + amount, sip: sip ?? p.sip } : p));
      return [...list, { basketId, invested: amount, since: iso(istNow()), sip }];
    });
  }, []);

  const addOrder = useCallback((order: MfOrder) => setOrders((list) => [order, ...list]), []);
  const patchOrder = useCallback(
    (id: string, patch: Partial<MfOrder>) => setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    [],
  );

  // Fund house confirms: units land in the folio and the order is Completed.
  const allot = useCallback(
    (orderId: string, fundId: string, amount: number, navDate: string) => {
      const fund = fundById(fundId);
      const units = (amount - stampDuty(amount)) / fund.nav;
      patchOrder(orderId, {
        status: "completed",
        allotment: { folio: folioFor(fundId), navDate, nav: fund.nav, units },
      });
      setHoldings((list) =>
        list.map((h) => {
          if (h.fundId !== fundId) return h;
          const lots = h.lots.map((l) => (l.orderId === orderId ? { ...l, allotted: true } : l));
          return { ...h, lots, pending: lots.some((l) => !l.allotted) ? h.pending : undefined };
        }),
      );
    },
    [patchOrder],
  );

  // Money received for a purchase: the order is Payment done, the lot waits for allotment.
  const receive = useCallback(
    (orderId: string, fundId: string, amount: number, unitsBy: string, navDate: string) => {
      addHolding(fundId, amount, orderId, `Units by ${unitsBy}`);
      window.setTimeout(() => allot(orderId, fundId, amount, navDate), ALLOT_MS);
    },
    [addHolding, allot],
  );

  const placeLump = useCallback(
    (fundId: string, amount: number, pending = false): Done => {
      const fund = fundById(fundId);
      const kind = cutoffKind(fund);
      const now = istNow();
      const nav = navDay(now, kind);
      const units = allotDay(now, kind);
      const orderId = `o${++orderSeq}`;
      addOrder({
        id: orderId,
        fundId,
        kind: "Lumpsum",
        amount,
        // Waiting on the bank: In progress. Money confirmed: Payment done.
        status: pending ? "inprogress" : "paymentdone",
        on: iso(now),
        placedAt: `${fmtDay(now)}, ${fmtTime(now)}`,
        navDate: fmtDay(nav),
      });
      // Units only once the money is confirmed. With no word from the bank, it confirms a little later.
      if (pending) {
        window.setTimeout(() => {
          patchOrder(orderId, { status: "paymentdone" });
          receive(orderId, fundId, amount, fmtDay(units), fmtDay(nav));
        }, BANK_CONFIRM_MS);
      } else {
        receive(orderId, fundId, amount, fmtDay(units), fmtDay(nav));
      }
      return {
        pending,
        kind: "Lumpsum",
        fundId,
        amount,
        navDate: fmtDay(nav),
        unitsBy: fmtDay(units),
        afterCutoff: afterCutoff(now, kind),
        orderId,
        stampDuty: stampDuty(amount),
      };
    },
    [addOrder, patchOrder, receive],
  );

  const placeSip = useCallback(
    (fundId: string, amount: number, day: number, payFirst: boolean, pending = false): Done => {
      const fund = fundById(fundId);
      const kind = cutoffKind(fund);
      const now = istNow();
      const nav = navDay(now, kind);
      const units = allotDay(now, kind);
      const orderId = `o${++orderSeq}`;
      const next = nextSipDate(day, now);
      const start = () => {
        setSips((list) => [...list, { fundId, amount, day }]);
        setMandateLimit((limit) => Math.max(limit, amount));
        const base = {
          id: orderId,
          fundId,
          kind: "SIP" as const,
          amount,
          on: iso(now),
          placedAt: `${fmtDay(now)}, ${fmtTime(now)}`,
        };
        if (payFirst) {
          // First instalment paid now, like a one-time order.
          addOrder({
            ...base,
            status: "paymentdone",
            navDate: fmtDay(nav),
          });
          receive(orderId, fundId, amount, fmtDay(units), fmtDay(nav));
        } else {
          // Reused mandate: the first instalment is ordered today and debited about 2 working days later.
          const debit = addBusinessDays(now, 2);
          addOrder({ ...base, status: "scheduled", navDate: fmtDay(debit), debitOn: fmtDay(debit), firstInstalment: true, sipDay: day });
          // Prototype timing: the debit date arrives (In progress), then the debit lands (Payment done).
          window.setTimeout(() => {
            patchOrder(orderId, { status: "inprogress" });
            window.setTimeout(() => {
              patchOrder(orderId, { status: "paymentdone", navDate: fmtDay(nav) });
              receive(orderId, fundId, amount, fmtDay(units), fmtDay(nav));
            }, BANK_CONFIRM_MS);
          }, BANK_CONFIRM_MS);
        }
      };
      // No word on AutoPay yet: the SIP starts only once the bank confirms it.
      if (pending) window.setTimeout(start, BANK_CONFIRM_MS);
      else start();
      return {
        pending,
        kind: "SIP",
        fundId,
        amount,
        navDate: fmtDay(nav),
        unitsBy: fmtDay(units),
        firstDebit: fmtDay(next),
        paidNow: payFirst,
        afterCutoff: afterCutoff(now, kind),
        orderId,
        stampDuty: payFirst ? stampDuty(amount) : undefined,
      };
    },
    [addOrder, patchOrder, receive],
  );

  // Sells `units` from the oldest free lots (allotted and out of any lock-in; the screen works those out).
  const placeRedeem = useCallback(
    (fundId: string, units: number, requested?: number): Done => {
      const fund = fundById(fundId);
      const now = istNow();
      const kind = cutoffKind(fund);
      const trade = tradeDay(now, kind);
      const paid = addBusinessDays(trade, payoutDays(fund));
      const orderId = `o${++orderSeq}`;
      const holding = holdings.find((h) => h.fundId === fundId);
      const perUnit = holding ? holding.current / holding.units : fund.nav;
      // The pad's own figure when it has one (an amount typed in rupees), else units at the last NAV.
      const amount = requested ?? Math.floor(units * perUnit);
      addOrder({
        id: orderId,
        fundId,
        kind: "Redeem",
        amount,
        status: "inprogress",
        on: iso(now),
        placedAt: `${fmtDay(now)}, ${fmtTime(now)}`,
        navDate: fmtDay(trade),
        units,
        creditBy: fmtDay(paid),
      });
      // Completed when the fund house processes it. Whether the money reached the bank isn't tracked.
      window.setTimeout(
        () =>
          patchOrder(orderId, {
            status: "completed",
            allotment: { folio: folioFor(fundId), navDate: fmtDay(trade), nav: fund.nav, units },
          }),
        ALLOT_MS,
      );
      // The units are set aside for this order straight away so they can't be sold twice.
      setHoldings((list) =>
        list.flatMap((h) => {
          if (h.fundId !== fundId) return [h];
          let left = units;
          const lots = h.lots
            .map((l) => {
              if (!l.allotted || left <= 0) return l;
              const take = Math.min(l.units, left);
              left -= take;
              return { ...l, units: l.units - take };
            })
            .filter((l) => l.units > 1e-6);
          const remaining = Math.max(0, h.units - units);
          if (remaining < 1e-6) return [];
          const ratio = remaining / h.units;
          return [{ ...h, units: remaining, invested: Math.round(h.invested * ratio), current: Math.round(h.current * ratio), lots }];
        }),
      );
      return {
        kind: "Redeem",
        fundId,
        amount,
        units,
        navDate: fmtDay(trade),
        unitsBy: fmtDay(paid),
        afterCutoff: afterCutoff(now, kind),
        orderId,
      };
    },
    [addOrder, patchOrder, holdings],
  );

  const cancelSip = useCallback((fundId: string) => setSips((list) => list.filter((s) => s.fundId !== fundId)), []);

  const value = useMemo<Store>(
    () => ({
      stack,
      push,
      replace,
      pop,
      closeAll,
      segment,
      setSegment,
      holdings,
      basketPositions,
      addBasketPosition,
      orders,
      sips,
      mandateLimit,
      payMethod,
      setPayMethod,
      verifiedBanks,
      isVerified,
      verifyBank,
      mfSeen,
      markSeen: () => setMfSeen(true),
      placeLump,
      placeSip,
      placeRedeem,
      cancelSip,
      viewOrders: () => {
        setStack([]);
        setJump("orders-mf");
        onOpenPage("orders");
      },
      viewSips: () => {
        setStack([]);
        onOpenPage("sip");
      },
      jump,
      clearJump: () => setJump(null),
    }),
    [
      stack,
      push,
      replace,
      pop,
      closeAll,
      segment,
      setSegment,
      holdings,
      basketPositions,
      addBasketPosition,
      orders,
      sips,
      mandateLimit,
      payMethod,
      verifiedBanks,
      isVerified,
      verifyBank,
      mfSeen,
      jump,
      placeLump,
      placeSip,
      placeRedeem,
      cancelSip,
      onOpenPage,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
