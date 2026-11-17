/* What a monthly SIP would have returned over 1, 3 and 5 years, worked out from the lumpsum numbers the fund publishes.

   The published figures are annualised returns of a lumpsum held for 1, 3 and 5 years. That pins down the NAV one, three and
   five years ago (relative to today = 1). Between those points the NAV is taken to move smoothly (a straight line in its
   logarithm), which gives a month-by-month NAV. A SIP buys one unit-worth at the start of every month at that month's NAV, so
   the value today is the sum of the units. The return is the XIRR: the annual rate x at which equal monthly instalments
   would have grown to that value. (Sample figures for the prototype: a real fund page would use the fund's actual NAV history.) */

const ANCHORS = [0, 1, 3, 5]; // years back

function navMonthsAgo(monthsBack: number, logNav: number[]): number {
  const t = monthsBack / 12;
  for (let i = 1; i < ANCHORS.length; i++) {
    if (t <= ANCHORS[i]) {
      const k = (t - ANCHORS[i - 1]) / (ANCHORS[i] - ANCHORS[i - 1]);
      return Math.exp(logNav[i - 1] + (logNav[i] - logNav[i - 1]) * k);
    }
  }
  return Math.exp(logNav[logNav.length - 1]);
}

/** Annualised SIP return (%) for 1Y, 3Y and 5Y, from the annualised lumpsum returns (%) for 1Y, 3Y and 5Y. */
export function sipReturns([r1, r3, r5]: [number, number, number]): [number, number, number] {
  const logNav = [0, -Math.log(1 + r1 / 100) * 1, -Math.log(1 + r3 / 100) * 3, -Math.log(1 + r5 / 100) * 5];
  return ([1, 3, 5] as const).map((years) => {
    const months = years * 12;
    let value = 0; // what the instalments are worth today, one unit-worth per month
    for (let m = 1; m <= months; m++) value += 1 / navMonthsAgo(m, logNav);
    // Solve sum over m of (1 + x)^(m/12) = value for x by bisection (the left side rises with x).
    const grown = (x: number) => {
      let s = 0;
      for (let m = 1; m <= months; m++) s += (1 + x) ** (m / 12);
      return s;
    };
    let lo = -0.95;
    let hi = 10;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (grown(mid) < value) lo = mid;
      else hi = mid;
    }
    return ((lo + hi) / 2) * 100;
  }) as [number, number, number];
}
