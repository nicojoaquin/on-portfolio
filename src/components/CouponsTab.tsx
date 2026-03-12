"use client";

import { useMemo } from "react";
import { PositionDTO } from "@/types";
import {
  calculatePortfolio,
  BondParams,
  PortfolioPosition,
  AmortScheduleEntry,
} from "@/lib/financial";
import { formatCurrency, formatDate } from "@/lib/formatters";

function toBondParams(bond: PositionDTO["bond"]): BondParams {
  const customAmort: AmortScheduleEntry[] = bond.customAmortSchedule
    ? JSON.parse(bond.customAmortSchedule)
    : [];

  return {
    ticker: bond.ticker,
    couponRate: bond.couponRate,
    couponFrequency: bond.couponFrequency,
    firstCouponDate: new Date(bond.firstCouponDate),
    maturityDate: new Date(bond.maturityDate),
    amortizationType: bond.amortizationType as "bullet" | "equal" | "custom",
    amortStartDate: bond.amortStartDate ? new Date(bond.amortStartDate) : undefined,
    amortPayments: bond.amortPayments || undefined,
    customAmortSchedule: customAmort.length > 0 ? customAmort : undefined,
  };
}

interface Props {
  positions: PositionDTO[];
}

export default function CouponsTab({ positions }: Props) {
  const result = useMemo(() => {
    const portfolioPositions: PortfolioPosition[] = positions.map((p) => ({
      bond: toBondParams(p.bond),
      nominal: p.nominal,
      dirtyPrice: p.dirtyPrice,
    }));
    return calculatePortfolio(portfolioPositions);
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
        Agregá posiciones en la pestaña Cartera para ver los cupones.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consolidated by date */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Cobros Agregados por Fecha
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Cupón</th>
                <th className="px-4 py-3 text-right">Capital</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.consolidatedFlows.map((flow, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{formatDate(flow.date)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(flow.coupon)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(flow.principal)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {formatCurrency(flow.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(
                    result.consolidatedFlows.reduce((s, f) => s + f.coupon, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(
                    result.consolidatedFlows.reduce((s, f) => s + f.principal, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-emerald-600">
                  {formatCurrency(result.totalFutureCashFlows)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detail by instrument */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Detalle por Instrumento
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3 text-right">Cupón</th>
                <th className="px-4 py-3 text-right">Capital</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.detailedFlows.map((flow, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{formatDate(flow.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {flow.ticker || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(flow.coupon)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(flow.principal)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(flow.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
