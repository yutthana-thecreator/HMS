import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelReservation } from "@/lib/reservations";
import { pushChannexSafe } from "@/lib/channexSync";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;

  // 🔒 ยกเลิกได้เฉพาะการจองของ org ตัวเอง
  const res = await prisma.reservation.findFirst({
    where: { id, property: { orgId: user.orgId } },
    select: { id: true, propertyId: true },
  });
  if (!res) return NextResponse.json({ ok: false, message: "ไม่พบการจอง" }, { status: 404 });

  try {
    const r = await cancelReservation(id);
    pushChannexSafe(res.propertyId); // คืนห้อง → อัปเดตทุก OTA
    return NextResponse.json({ ok: true, reservation: r });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message || "ยกเลิกไม่สำเร็จ" }, { status: 400 });
  }
}
