import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const bond = await prisma.bond.update({
    where: { id },
    data: {
      ticker: body.ticker?.toUpperCase(),
      issuer: body.issuer,
      currency: body.currency,
      law: body.law,
      couponRate: body.couponRate,
      couponFrequency: body.couponFrequency,
      firstCouponDate: body.firstCouponDate ? new Date(body.firstCouponDate) : undefined,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : undefined,
      amortizationType: body.amortizationType,
      amortStartDate: body.amortStartDate ? new Date(body.amortStartDate) : null,
      amortPayments: body.amortPayments ?? null,
      customAmortSchedule: body.customAmortSchedule
        ? JSON.stringify(body.customAmortSchedule)
        : null,
    },
  });

  return NextResponse.json(bond);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.bond.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
