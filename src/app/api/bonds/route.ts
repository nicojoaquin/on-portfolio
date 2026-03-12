import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bonds = await prisma.bond.findMany({
    orderBy: { ticker: "asc" },
  });
  return NextResponse.json(bonds);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const bond = await prisma.bond.create({
    data: {
      ticker: body.ticker.toUpperCase(),
      issuer: body.issuer,
      currency: body.currency || "USD",
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
    },
  });

  return NextResponse.json(bond, { status: 201 });
}
