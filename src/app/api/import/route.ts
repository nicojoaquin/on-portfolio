import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

interface ImportRow {
  ticker: string;
  issuer?: string;
  currency?: string;
  law?: string;
  couponRate?: number;
  couponFrequency?: number;
  firstCouponDate?: string;
  maturityDate?: string;
  amortizationType?: string;
  minDenomination?: number;
  creditRating?: string;
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  ticker: "ticker",
  especie: "ticker",
  symbol: "ticker",
  emisor: "issuer",
  issuer: "issuer",
  moneda: "currency",
  currency: "currency",
  ley: "law",
  law: "law",
  "cupon anual": "couponRate",
  "cupon anual (%)": "couponRate",
  "coupon rate": "couponRate",
  couponrate: "couponRate",
  frecuencia: "couponFrequency",
  "coupon frequency": "couponFrequency",
  couponfrequency: "couponFrequency",
  "primer cupon": "firstCouponDate",
  "first coupon": "firstCouponDate",
  firstcoupondate: "firstCouponDate",
  vencimiento: "maturityDate",
  "maturity date": "maturityDate",
  maturitydate: "maturityDate",
  amortizacion: "amortizationType",
  "amortization type": "amortizationType",
  amortizationtype: "amortizationType",
  "lamina minima": "minDenomination",
  "min denomination": "minDenomination",
  mindenomination: "minDenomination",
  rating: "creditRating",
  "credit rating": "creditRating",
  creditrating: "creditRating",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\-]/g, " ");
}

function parseExcelDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(value).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    // Map headers to known fields
    const firstRow = rawRows[0];
    const headerMap: Record<string, keyof ImportRow> = {};
    for (const rawKey of Object.keys(firstRow)) {
      const normalized = normalizeHeader(rawKey);
      const mapped = COLUMN_MAP[normalized];
      if (mapped) {
        headerMap[rawKey] = mapped;
      }
    }

    if (!headerMap || !Object.values(headerMap).includes("ticker")) {
      return NextResponse.json(
        { error: "No se encontró columna 'Ticker' o 'Especie' en el archivo" },
        { status: 400 }
      );
    }

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const row: Partial<ImportRow> = {};

      for (const [rawKey, field] of Object.entries(headerMap)) {
        const val = raw[rawKey];
        if (val === undefined || val === null || val === "") continue;

        if (field === "couponRate") {
          const num = parseFloat(String(val).replace(",", "."));
          if (!isNaN(num)) row.couponRate = num > 1 ? num / 100 : num;
        } else if (field === "couponFrequency") {
          const num = parseInt(String(val));
          if (!isNaN(num)) row.couponFrequency = num;
        } else if (field === "minDenomination") {
          const num = parseFloat(String(val).replace(",", "."));
          if (!isNaN(num)) row.minDenomination = num;
        } else if (field === "firstCouponDate" || field === "maturityDate") {
          row[field] = parseExcelDate(val);
        } else {
          (row as Record<string, unknown>)[field] = String(val).trim();
        }
      }

      if (!row.ticker) {
        skipped++;
        continue;
      }

      const ticker = row.ticker.toUpperCase();
      const hasTermData = row.couponRate !== undefined && row.maturityDate !== undefined;

      try {
        const existing = await prisma.bond.findUnique({ where: { ticker } });

        const data: Record<string, unknown> = {};
        if (row.issuer) data.issuer = row.issuer;
        if (row.currency) data.currency = row.currency;
        if (row.law) data.law = row.law;
        if (row.couponRate !== undefined) data.couponRate = row.couponRate;
        if (row.couponFrequency !== undefined) data.couponFrequency = row.couponFrequency;
        if (row.firstCouponDate) data.firstCouponDate = new Date(row.firstCouponDate);
        if (row.maturityDate) data.maturityDate = new Date(row.maturityDate);
        if (row.amortizationType) data.amortizationType = row.amortizationType;
        if (row.minDenomination !== undefined) data.minDenomination = row.minDenomination;
        if (row.creditRating) data.creditRating = row.creditRating;
        if (hasTermData) data.hasTerms = true;

        if (existing) {
          await prisma.bond.update({ where: { ticker }, data });
          updated++;
        } else {
          await prisma.bond.create({
            data: {
              ticker,
              issuer: row.issuer || ticker,
              ...data,
            },
          });
          created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 2} (${ticker}): ${msg}`);
      }
    }

    return NextResponse.json({
      updated,
      created,
      skipped,
      errors: errors.slice(0, 10),
      total: rawRows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error procesando archivo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
