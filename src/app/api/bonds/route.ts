import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bonds = await prisma.bond.findMany({
    orderBy: { ticker: "asc" },
  });
  return NextResponse.json(bonds);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ticker || !body.issuer || !body.firstCouponDate || !body.maturityDate) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: ticker, emisor, fecha primer cupón, vencimiento" },
        { status: 400 }
      );
    }

    if (typeof body.couponRate !== "number" || isNaN(body.couponRate)) {
      return NextResponse.json(
        { error: "Cupón anual inválido" },
        { status: 400 }
      );
    }

    const bond = await prisma.bond.create({
      data: {
        ticker: body.ticker.toUpperCase(),
        issuer: body.issuer,
        currency: body.currency || "USD",
        law: body.law || "NY",
        couponRate: body.couponRate,
        couponFrequency: body.couponFrequency || 2,
        firstCouponDate: new Date(body.firstCouponDate),
        maturityDate: new Date(body.maturityDate),
        amortizationType: body.amortizationType || "bullet",
        amortStartDate: body.amortStartDate ? new Date(body.amortStartDate) : null,
        amortPayments: body.amortPayments || null,
        customAmortSchedule: body.customAmortSchedule
          ? JSON.stringify(body.customAmortSchedule)
          : null,
        minDenomination: body.minDenomination ?? null,
        creditRating: body.creditRating ?? null,
      },
    });

    return NextResponse.json(bond, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
