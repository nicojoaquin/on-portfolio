import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const positions = await prisma.position.findMany({
    include: { bond: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = positions.map((p) => ({
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

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 12),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Cartera");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cartera-on-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
