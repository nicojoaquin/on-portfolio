import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const result = await prisma.position.deleteMany();
  return NextResponse.json({ deleted: result.count });
}
