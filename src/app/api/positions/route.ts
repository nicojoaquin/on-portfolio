import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const positions = await prisma.position.findMany({
    include: { bond: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(positions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const position = await prisma.position.create({
    data: {
      bondId: body.bondId,
      nominal: body.nominal,
      dirtyPrice: body.dirtyPrice,
    },
    include: { bond: true },
  });

  return NextResponse.json(position, { status: 201 });
}
