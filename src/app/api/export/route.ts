import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
  generateBondCashFlows,
  consolidateCashFlows,
  calculatePortfolio,
  BondParams,
  PortfolioPosition,
  AmortScheduleEntry,
} from "@/lib/financial";

function toBondParams(bond: {
  ticker: string;
  couponRate: number | null;
  couponFrequency: number | null;
  firstCouponDate: Date | null;
  maturityDate: Date | null;
  amortizationType: string;
  amortStartDate: Date | null;
  amortPayments: number | null;
  customAmortSchedule: string | null;
  hasTerms: boolean;
}): BondParams | null {
  if (
    !bond.hasTerms ||
    !bond.couponRate ||
    !bond.couponFrequency ||
    !bond.firstCouponDate ||
    !bond.maturityDate
  )
    return null;

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

function fmtPct(v: number | null): string {
  return v != null ? `${(v * 100).toFixed(2)}%` : "N/A";
}

function fmtUSD(v: number): string {
  return `USD ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET() {
  const positions = await prisma.position.findMany({
    include: { bond: true },
    orderBy: { createdAt: "desc" },
  });

  // ── Portfolio calculations (same as dashboard) ─────────────────────────────
  const portfolioPositions: PortfolioPosition[] = positions
    .filter((p) => toBondParams(p.bond) !== null)
    .map((p) => ({
      bond: toBondParams(p.bond)!,
      nominal: p.nominal,
      dirtyPrice: p.dirtyPrice,
    }));

  const result = calculatePortfolio(portfolioPositions);

  // ── Sheet 1: Dashboard ─────────────────────────────────────────────────────
  const summaryAoa = [
    ["Resumen de Cartera", ""],
    ["Valor de Mercado", fmtUSD(result.totalMarketValue)],
    ["TIR Cartera (XIRR)", fmtPct(result.portfolioTIR)],
    ["TIR Prom. Ponderada", fmtPct(result.weightedAvgTIR)],
    [
      "Duration Modificada",
      result.weightedModifiedDuration != null
        ? `${result.weightedModifiedDuration.toFixed(2)} años`
        : "N/A",
    ],
    ["Total Cobros Futuros", fmtUSD(result.totalFutureCashFlows)],
    ["", ""],
    ["Posiciones", ""],
  ];

  const wsDashboard = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Position table headers + rows
  let resultIdx = 0;
  const positionRows = positions.map((p) => {
    const params = toBondParams(p.bond);
    let res = null;
    if (params !== null) {
      res = result.positionResults[resultIdx];
      resultIdx++;
    }

    return {
      Ticker: p.bond.ticker,
      Emisor: p.bond.issuer,
      Moneda: p.bond.currency,
      Ley: p.bond.law,
      "Cupón (%)": p.bond.couponRate != null ? `${(p.bond.couponRate * 100).toFixed(2)}%` : "N/A",
      Vencimiento: p.bond.maturityDate ? p.bond.maturityDate.toISOString().slice(0, 10) : "N/A",
      Nominal: p.nominal,
      "Precio Dirty (%)": p.dirtyPrice,
      "Valor Mercado (USD)": res ? Number(res.marketValue.toFixed(2)) : Number(((p.nominal * p.dirtyPrice) / 100).toFixed(2)),
      "TIR (%)": res?.tir != null ? `${(res.tir * 100).toFixed(2)}%` : "N/A",
      "Dur. Modificada (años)": res?.modifiedDuration != null ? Number(res.modifiedDuration.toFixed(2)) : "N/A",
      "Próx. Cobro Fecha": res?.nextPaymentDate ? res.nextPaymentDate.toISOString().slice(0, 10) : "N/A",
      "Próx. Cobro (USD)": res?.nextPaymentAmount ? Number(res.nextPaymentAmount.toFixed(2)) : 0,
      "Lámina Mín.": p.bond.minDenomination ?? "N/A",
      "Rating FIX SCR": p.bond.creditRating ?? "N/A",
    };
  });

  XLSX.utils.sheet_add_json(wsDashboard, positionRows, {
    origin: `A${summaryAoa.length + 1}`,
  });

  wsDashboard["!cols"] = [
    { wch: 10 }, { wch: 36 }, { wch: 8 }, { wch: 6 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
  ];

  // ── Sheet 2: Cupones ───────────────────────────────────────────────────────
  const allDetailedFlows = positions.flatMap((p) => {
    const params = toBondParams(p.bond);
    if (!params) return [];
    return generateBondCashFlows(params, p.nominal);
  });

  const consolidated = consolidateCashFlows(allDetailedFlows);

  const consolidatedRows = consolidated.map((f) => ({
    Fecha: f.date.toISOString().slice(0, 10),
    "Cupón (USD)": Number(f.coupon.toFixed(2)),
    "Capital (USD)": Number(f.principal.toFixed(2)),
    "Total (USD)": Number(f.total.toFixed(2)),
  }));

  consolidatedRows.push({
    Fecha: "TOTAL",
    "Cupón (USD)": Number(consolidated.reduce((s, f) => s + f.coupon, 0).toFixed(2)),
    "Capital (USD)": Number(consolidated.reduce((s, f) => s + f.principal, 0).toFixed(2)),
    "Total (USD)": Number(consolidated.reduce((s, f) => s + f.total, 0).toFixed(2)),
  });

  const detailedSorted = [...allDetailedFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || (a.ticker ?? "").localeCompare(b.ticker ?? "")
  );

  const detailedRows = detailedSorted.map((f) => ({
    Fecha: f.date.toISOString().slice(0, 10),
    Ticker: f.ticker ?? "—",
    "Cupón (USD)": Number(f.coupon.toFixed(2)),
    "Capital (USD)": Number(f.principal.toFixed(2)),
    "Total (USD)": Number(f.total.toFixed(2)),
  }));

  const wsCupones = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(wsCupones, [["Cobros Consolidados por Fecha"]], { origin: "A1" });
  XLSX.utils.sheet_add_json(wsCupones, consolidatedRows, { origin: "A2" });

  const detailStart = consolidatedRows.length + 4;
  XLSX.utils.sheet_add_aoa(wsCupones, [["Detalle por Instrumento"]], { origin: `A${detailStart}` });
  XLSX.utils.sheet_add_json(wsCupones, detailedRows, { origin: `A${detailStart + 1}` });

  wsCupones["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];

  // ── Workbook ───────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard");
  XLSX.utils.book_append_sheet(wb, wsCupones, "Cupones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cartera-on-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
