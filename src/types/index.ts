export interface BondDTO {
  id: string;
  ticker: string;
  issuer: string;
  currency: string;
  couponRate: number;
  couponFrequency: number;
  firstCouponDate: string;
  maturityDate: string;
  amortizationType: string;
  amortStartDate: string | null;
  amortPayments: number | null;
  customAmortSchedule: string | null;
}

export interface PositionDTO {
  id: string;
  bondId: string;
  nominal: number;
  dirtyPrice: number;
  bond: BondDTO;
}

export type TabId = "portfolio" | "coupons" | "bonds";
