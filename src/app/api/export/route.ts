import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
  generateBondCashFlows,
  consolidateCashFlows,
  BondParams,
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

function autoWidth(rows: Record<string, unknown>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length),
      12
    ),
  }));
}

export async function GET() {
  const positions = await prisma.position.findMany({
    include: { bond: true },
    orderBy: { createdAt: "desc" },
  });

  // ── Sheet 1: Cartera ──────────────────────────────────────────────────────
  const carteraRows = positions.map((p) => ({
    Ticker: p.bond.ticker,
    Emisor: p.bond.issuer,
    Moneda: p.bond.currency,
    Ley: p.bond.law,
    "Cupón (%)": p.bond.couponRate != null ? (p.bond.couponRate * 100).toFixed(2) : "N/A",
    Vencimiento: p.bond.maturityDate ? p.bond.maturityDate.toISOString().slice(0, 10) : "N/A",
    Nominal: p.nominal,
    "Precio Dirty (%)": p.dirtyPrice,
    "Valor Mercado": (p.nominal * p.dirtyPrice) / 100,
    "Lámina Mín.": p.bond.minDenomination ?? "N/A",
    "Rating FIX SCR": p.bond.creditRating ?? "N/A",
  }));

  const wsCartera = XLSX.utils.json_to_sheet(carteraRows);
  wsCartera["!cols"] = autoWidth(carteraRows);

  // ── Sheet 2: Cupones ──────────────────────────────────────────────────────
  // Consolidated flows
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

  // Totals row
  const totalsRow = {
    Fecha: "TOTAL",
    "Cupón (USD)": Number(consolidated.reduce((s, f) => s + f.coupon, 0).toFixed(2)),
    "Capital (USD)": Number(consolidated.reduce((s, f) => s + f.principal, 0).toFixed(2)),
    "Total (USD)": Number(consolidated.reduce((s, f) => s + f.total, 0).toFixed(2)),
  };
  consolidatedRows.push(totalsRow);

  // Detailed flows (sorted by date then ticker)
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

  // Build coupons sheet: consolidated block, gap row, detail block
  const wsCupones = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(wsCupones, [["Cobros Consolidados por Fecha"]], { origin: "A1" });
  XLSX.utils.sheet_add_json(wsCupones, consolidatedRows, { origin: "A2" });

  const detailStart = consolidatedRows.length + 4; // gap of 1 blank row + header
  XLSX.utils.sheet_add_aoa(wsCupones, [["Detalle por Instrumento"]], {
    origin: `A${detailStart}`,
  });
  XLSX.utils.sheet_add_json(wsCupones, detailedRows, {
    origin: `A${detailStart + 1}`,
  });

  wsCupones["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsCartera, "Cartera");
  XLSX.utils.book_append_sheet(wb, wsCupones, "Cupones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cartera-on-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
