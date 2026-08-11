import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelReservation } from "@/lib/reservations";
import { pushChannexSafe } from "@/lib/channexSync";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const refundReq = Number(body.refund) || 0;

  // 🔒 ยกเลิกได้เฉพาะการจองของ org ตัวเอง
  const res = await prisma.reservation.findFirst({
    where: { id, property: { orgId: user.orgId } },
    select: { id: true, propertyId: true, externalRef: true, payments: { select: { amount: true } } },
  });
  if (!res) return NextResponse.json({ ok: false, message: "ไม่พบการจอง" }, { status: 404 });

  // 🔒 กันยกเลิก OTA booking ในระบบเรา — การจองยัง LIVE บน OTA จะเกิด overbooking
  if (res.externalRef) {
    return NextResponse.json(
      { ok: false, message: "การจองนี้มาจาก OTA — กรุณายกเลิกที่ OTA เท่านั้น (ระบบจะรับการยกเลิกอัตโนมัติ)" },
      { status: 409 },
    );
  }

  try {
    // บันทึกเงินคืน (payment ติดลบ) — ไม่เกินยอดที่จ่ายมาแล้ว
    const paid = res.payments.reduce((s, p) => s + p.amount, 0);
    const refund = Math.max(0, Math.min(refundReq, paid));
    if (refund > 0) {
      await prisma.payment.create({
        data: { reservationId: id, amount: -refund, method: "refund", note: "คืนเงินจากการยกเลิกการจอง" },
      });
    }

    const r = await cancelReservation(id);
    pushChannexSafe(res.propertyId); // คืนห้อง → อัปเดตทุก OTA
    return NextResponse.json({ ok: true, reservation: r, refund });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message || "ยกเลิกไม่สำเร็จ" }, { status: 400 });
  }
}
