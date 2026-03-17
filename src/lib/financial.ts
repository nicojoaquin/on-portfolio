/**
 * Financial calculation engine for ON (Obligaciones Negociables) portfolio.
 *
 * Convention: Actual/365 day count.
 * XIRR solved via Newton-Raphson with bisection fallback.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CashFlow {
  date: Date;
  amount: number;
}

export interface DetailedCashFlow {
  date: Date;
  coupon: number;
  principal: number;
  total: number;
  ticker?: string;
}

export interface AmortScheduleEntry {
  date: string; // ISO date
  pct: number;  // percentage of original nominal
}

export interface BondParams {
  ticker: string;
  couponRate: number;       // annual, as decimal (0.07 = 7%)
  couponFrequency: number;  // 1, 2, 4, 12
  firstCouponDate: Date;
  maturityDate: Date;
  amortizationType: "bullet" | "equal" | "custom";
  amortStartDate?: Date;
  amortPayments?: number;
  customAmortSchedule?: AmortScheduleEntry[];
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return (b.getTime() - a.getTime()) / msPerDay;
}

function yearFraction(a: Date, b: Date): number {
  return daysBetween(a, b) / 365;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toUTCDate(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Coupon date generation ──────────────────────────────────────────────────

export function generateCouponDates(
  firstCouponDate: Date,
  maturityDate: Date,
  frequency: number
): Date[] {
  const monthsBetween = 12 / frequency;
  const dates: Date[] = [];
  const today = toUTCDate(new Date());
  let current = toUTCDate(firstCouponDate);
  const maturity = toUTCDate(maturityDate);

  while (current <= maturity) {
    if (current >= today) {
      dates.push(new Date(current));
    }
    current = addMonths(current, monthsBetween);
  }

  // Ensure maturity is included if it's a coupon date
  if (dates.length > 0 && !isSameDay(dates[dates.length - 1], maturity)) {
    if (maturity >= today) {
      dates.push(new Date(maturity));
    }
  }

  return dates;
}

// ─── Amortization schedule generation ────────────────────────────────────────

export function generateAmortSchedule(
  bond: BondParams,
  couponDates: Date[]
): Map<string, number> {
  const schedule = new Map<string, number>(); // date ISO -> pct of nominal

  if (bond.amortizationType === "bullet") {
    if (couponDates.length > 0) {
      const maturity = toUTCDate(bond.maturityDate);
      schedule.set(maturity.toISOString().slice(0, 10), 100);
    }
    return schedule;
  }

  if (bond.amortizationType === "equal") {
    const startDate = bond.amortStartDate
      ? toUTCDate(bond.amortStartDate)
      : toUTCDate(bond.maturityDate);
    const payments = bond.amortPayments || 1;
    const pctPerPayment = 100 / payments;
    const monthsBetween = 12 / bond.couponFrequency;

    let current = new Date(startDate);
    for (let i = 0; i < payments; i++) {
      schedule.set(current.toISOString().slice(0, 10), pctPerPayment);
      current = addMonths(current, monthsBetween);
    }
    return schedule;
  }

  if (bond.amortizationType === "custom" && bond.customAmortSchedule) {
    for (const entry of bond.customAmortSchedule) {
      schedule.set(entry.date, entry.pct);
    }
    return schedule;
  }

  return schedule;
}

// ─── Cashflow generation per bond ────────────────────────────────────────────

export function generateBondCashFlows(
  bond: BondParams,
  nominal: number
): DetailedCashFlow[] {
  const couponDates = generateCouponDates(
    bond.firstCouponDate,
    bond.maturityDate,
    bond.couponFrequency
  );

  const amortSchedule = generateAmortSchedule(bond, couponDates);
  const couponPerPeriod = bond.couponRate / bond.couponFrequency;

  const flows: DetailedCashFlow[] = [];
  let remainingNominal = nominal;

  for (const date of couponDates) {
    const dateKey = date.toISOString().slice(0, 10);
    const couponAmount = remainingNominal * couponPerPeriod;
    const amortPct = amortSchedule.get(dateKey) || 0;
    const principalAmount = (nominal * amortPct) / 100;

    flows.push({
      date,
      coupon: couponAmount,
      principal: principalAmount,
      total: couponAmount + principalAmount,
      ticker: bond.ticker,
    });

    remainingNominal -= principalAmount;
    if (remainingNominal < 0.01) remainingNominal = 0;
  }

  return flows;
}

// ─── Portfolio cashflow consolidation ────────────────────────────────────────

export function consolidateCashFlows(
  allFlows: DetailedCashFlow[]
): DetailedCashFlow[] {
  const byDate = new Map<string, DetailedCashFlow>();

  for (const flow of allFlows) {
    const key = flow.date.toISOString().slice(0, 10);
    const existing = byDate.get(key);
    if (existing) {
      existing.coupon += flow.coupon;
      existing.principal += flow.principal;
      existing.total += flow.total;
    } else {
      byDate.set(key, {
        date: new Date(flow.date),
        coupon: flow.coupon,
        principal: flow.principal,
        total: flow.total,
      });
    }
  }

  return Array.from(byDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

// ─── XIRR calculation (Newton-Raphson + bisection fallback) ──────────────────

function xnpv(rate: number, cashFlows: CashFlow[]): number {
  const t0 = cashFlows[0].date;
  let npv = 0;
  for (const cf of cashFlows) {
    const years = yearFraction(t0, cf.date);
    npv += cf.amount / Math.pow(1 + rate, years);
  }
  return npv;
}

function xnpvDerivative(rate: number, cashFlows: CashFlow[]): number {
  const t0 = cashFlows[0].date;
  let deriv = 0;
  for (const cf of cashFlows) {
    const years = yearFraction(t0, cf.date);
    if (years === 0) continue;
    deriv -= (years * cf.amount) / Math.pow(1 + rate, years + 1);
  }
  return deriv;
}

export function xirr(
  cashFlows: CashFlow[],
  guess: number = 0.1,
  maxIterations: number = 200,
  tolerance: number = 1e-10
): number | null {
  if (cashFlows.length < 2) return null;

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const npv = xnpv(rate, cashFlows);
    if (Math.abs(npv) < tolerance) return rate;

    const deriv = xnpvDerivative(rate, cashFlows);
    if (Math.abs(deriv) < 1e-14) break;

    const newRate = rate - npv / deriv;
    if (Math.abs(newRate - rate) < tolerance) return newRate;
    rate = newRate;

    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  // Bisection fallback
  let lo = -0.99;
  let hi = 10;
  let loNpv = xnpv(lo, cashFlows);

  for (let i = 0; i < 1000; i++) {
    const mid = (lo + hi) / 2;
    const midNpv = xnpv(mid, cashFlows);

    if (Math.abs(midNpv) < tolerance) return mid;
    if (Math.abs(hi - lo) < tolerance) return mid;

    if (loNpv * midNpv < 0) {
      hi = mid;
    } else {
      lo = mid;
      loNpv = midNpv;
    }
  }

  return null;
}

// ─── Individual bond TIR ─────────────────────────────────────────────────────

export function calculateBondTIR(
  bond: BondParams,
  nominal: number,
  dirtyPrice: number // as percentage, e.g. 105.5
): number | null {
  const marketValue = nominal * (dirtyPrice / 100);
  const flows = generateBondCashFlows(bond, nominal);

  if (flows.length === 0) return null;

  const cashFlows: CashFlow[] = [
    { date: toUTCDate(new Date()), amount: -marketValue },
    ...flows.map((f) => ({ date: f.date, amount: f.total })),
  ];

  return xirr(cashFlows);
}

// ─── Portfolio TIR ───────────────────────────────────────────────────────────

export interface PortfolioPosition {
  bond: BondParams;
  nominal: number;
  dirtyPrice: number;
}

export interface PortfolioResult {
  totalMarketValue: number;
  portfolioTIR: number | null;
  weightedAvgTIR: number | null;
  weightedModifiedDuration: number | null;
  totalFutureCashFlows: number;
  detailedFlows: DetailedCashFlow[];
  consolidatedFlows: DetailedCashFlow[];
  positionResults: {
    ticker: string;
    marketValue: number;
    tir: number | null;
    modifiedDuration: number | null;
    nextPaymentDate: Date | null;
    nextPaymentAmount: number;
  }[];
}

// ─── Modified Duration ────────────────────────────────────────────────────────

export function calculateModifiedDuration(
  bond: BondParams,
  nominal: number,
  tir: number
): number | null {
  const flows = generateBondCashFlows(bond, nominal);
  if (flows.length === 0) return null;

  const today = toUTCDate(new Date());
  let macaulayNumerator = 0;
  let pv = 0;

  for (const flow of flows) {
    const t = yearFraction(today, flow.date);
    const discounted = flow.total / Math.pow(1 + tir, t);
    macaulayNumerator += t * discounted;
    pv += discounted;
  }

  if (pv <= 0) return null;
  const macaulayDuration = macaulayNumerator / pv;
  return macaulayDuration / (1 + tir);
}

export function calculatePortfolio(
  positions: PortfolioPosition[]
): PortfolioResult {
  if (positions.length === 0) {
    return {
      totalMarketValue: 0,
      portfolioTIR: null,
      weightedAvgTIR: null,
      weightedModifiedDuration: null,
      totalFutureCashFlows: 0,
      detailedFlows: [],
      consolidatedFlows: [],
      positionResults: [],
    };
  }

  const today = toUTCDate(new Date());
  let totalMarketValue = 0;
  const allDetailedFlows: DetailedCashFlow[] = [];
  const allCashFlows: CashFlow[] = [];
  const positionResults: PortfolioResult["positionResults"] = [];
  let weightedTirSum = 0;
  let tirWeightSum = 0;
  let weightedDurSum = 0;
  let durWeightSum = 0;

  for (const pos of positions) {
    const mv = pos.nominal * (pos.dirtyPrice / 100);
    totalMarketValue += mv;

    const flows = generateBondCashFlows(pos.bond, pos.nominal);
    allDetailedFlows.push(...flows);

    // Individual TIR
    const tir = calculateBondTIR(pos.bond, pos.nominal, pos.dirtyPrice);
    if (tir !== null) {
      weightedTirSum += tir * mv;
      tirWeightSum += mv;

      const md = calculateModifiedDuration(pos.bond, pos.nominal, tir);
      if (md !== null) {
        weightedDurSum += md * mv;
        durWeightSum += mv;
      }
    }

    // Next payment
    const futureFlows = flows.filter((f) => f.date >= today);
    const nextFlow = futureFlows.length > 0 ? futureFlows[0] : null;

    const modifiedDuration = tir !== null
      ? calculateModifiedDuration(pos.bond, pos.nominal, tir)
      : null;

    positionResults.push({
      ticker: pos.bond.ticker,
      marketValue: mv,
      tir,
      modifiedDuration,
      nextPaymentDate: nextFlow?.date || null,
      nextPaymentAmount: nextFlow?.total || 0,
    });

    // Add flows for portfolio XIRR
    for (const f of flows) {
      allCashFlows.push({ date: f.date, amount: f.total });
    }
  }

  // Portfolio XIRR: initial outflow = total market value today
  const portfolioCashFlows: CashFlow[] = [
    { date: today, amount: -totalMarketValue },
    ...allCashFlows.sort((a, b) => a.date.getTime() - b.date.getTime()),
  ];

  const portfolioTIR = xirr(portfolioCashFlows);
  const weightedAvgTIR = tirWeightSum > 0 ? weightedTirSum / tirWeightSum : null;
  const weightedModifiedDuration = durWeightSum > 0 ? weightedDurSum / durWeightSum : null;
  const totalFutureCashFlows = allDetailedFlows.reduce((sum, f) => sum + f.total, 0);
  const consolidatedFlows = consolidateCashFlows(allDetailedFlows);

  return {
    totalMarketValue,
    portfolioTIR,
    weightedAvgTIR,
    weightedModifiedDuration,
    totalFutureCashFlows,
    detailedFlows: allDetailedFlows.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    ),
    consolidatedFlows,
    positionResults,
  };
}
