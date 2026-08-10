import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pushChannexSafe } from "@/lib/channexSync";

export const runtime = "nodejs";

// แก้ค่าประเภทห้อง (ตอนนี้: buffer กัน OTA) — เฉพาะของ org ที่ล็อกอิน
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const rt = await prisma.roomType.findFirst({
    where: { id, property: { orgId: user.orgId } },
    select: { id: true, propertyId: true },
  });
  if (!rt) return NextResponse.json({ ok: false, message: "ไม่พบประเภทห้อง" }, { status: 404 });

  const data: { otaBuffer?: number } = {};
  if (body.otaBuffer !== undefined) {
    data.otaBuffer = Math.max(0, Math.min(50, Math.floor(Number(body.otaBuffer) || 0)));
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "ไม่มีข้อมูลให้แก้" }, { status: 400 });
  }

  await prisma.roomType.update({ where: { id }, data });
  pushChannexSafe(rt.propertyId); // อัปเดตห้องว่างไป OTA ตาม buffer ใหม่
  return NextResponse.json({ ok: true, otaBuffer: data.otaBuffer });
}
