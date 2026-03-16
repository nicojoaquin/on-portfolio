export interface BondDTO {
  id: string;
  ticker: string;
  issuer: string;
  currency: string;
  law: string;
  couponRate: number | null;
  couponFrequency: number | null;
  firstCouponDate: string | null;
  maturityDate: string | null;
  amortizationType: string;
  amortStartDate: string | null;
  amortPayments: number | null;
  customAmortSchedule: string | null;
  minDenomination: number | null;
  creditRating: string | null;
  lastPrice: number | null;
  lastPriceDate: string | null;
  hasTerms: boolean;
}

export interface PositionDTO {
  id: string;
  bondId: string;
  nominal: number;
  dirtyPrice: number;
  bond: BondDTO;
}

export interface MarketQuote {
  ticker: string;
  lastPrice: number;
  variation: number;
  volume: number;
  tir: number | null;
}

export type TabId = "portfolio" | "coupons" | "bonds";
