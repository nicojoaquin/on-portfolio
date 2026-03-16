import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || String(DEFAULT_PAGE_SIZE))));
  const search = params.get("search")?.trim() || "";
  const currency = params.get("currency") || "";
  const law = params.get("law") || "";
  const hasTerms = params.get("hasTerms");
  const withPrice = params.get("withPrice");
  const sortBy = params.get("sortBy") || "ticker";
  const sortDir = (params.get("sortDir") || "asc") as "asc" | "desc";

  const where: Prisma.BondWhereInput = {};

  if (search) {
    where.OR = [
      { ticker: { contains: search, mode: "insensitive" } },
      { issuer: { contains: search, mode: "insensitive" } },
    ];
  }

  if (currency) where.currency = currency;
  if (law) where.law = law;
  if (hasTerms === "true") where.hasTerms = true;
  if (hasTerms === "false") where.hasTerms = false;
  if (withPrice === "true") where.lastPrice = { not: null };
  if (withPrice === "false") where.lastPrice = null;

  const orderBy: Prisma.BondOrderByWithRelationInput = {};
  const validSortFields = ["ticker", "issuer", "currency", "law", "couponRate", "maturityDate", "lastPrice", "creditRating"];
  if (validSortFields.includes(sortBy)) {
    (orderBy as Record<string, string>)[sortBy] = sortDir;
  } else {
    orderBy.ticker = "asc";
  }

  const [bonds, total] = await Promise.all([
    prisma.bond.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bond.count({ where }),
  ]);

  return NextResponse.json({
    data: bonds,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ticker || !body.issuer) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: ticker, emisor" },
        { status: 400 }
      );
    }

    const hasTerms = !!(body.couponRate && body.firstCouponDate && body.maturityDate);

    const bond = await prisma.bond.create({
      data: {
        ticker: body.ticker.toUpperCase(),
        issuer: body.issuer,
        currency: body.currency || "USD",
        law: body.law || "NY",
        couponRate: body.couponRate ?? null,
        couponFrequency: body.couponFrequency || (hasTerms ? 2 : null),
        firstCouponDate: body.firstCouponDate ? new Date(body.firstCouponDate) : null,
        maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
        amortizationType: body.amortizationType || "bullet",
        amortStartDate: body.amortStartDate ? new Date(body.amortStartDate) : null,
        amortPayments: body.amortPayments || null,
        customAmortSchedule: body.customAmortSchedule
          ? JSON.stringify(body.customAmortSchedule)
          : null,
        minDenomination: body.minDenomination ?? null,
        creditRating: body.creditRating ?? null,
        hasTerms,
      },
    });

    return NextResponse.json(bond, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
