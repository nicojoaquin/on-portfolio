import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const position = await prisma.position.update({
    where: { id },
    data: {
      nominal: body.nominal,
      dirtyPrice: body.dirtyPrice,
      bondId: body.bondId,
    },
    include: { bond: true },
  });

  return NextResponse.json(position);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.position.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
