import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pushChannexAvailability } from "@/lib/channexSync";

export const runtime = "nodejs";
export const maxDuration = 60;

// push ห้องว่างปัจจุบันไป Channex (กดปุ่ม)
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property?.channexPropertyId) {
    return NextResponse.json({ ok: false, message: "ยังไม่ได้เชื่อม Channex" }, { status: 400 });
  }

  try {
    const updates = await pushChannexAvailability(property.id);
    return NextResponse.json({ ok: true, updates });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
