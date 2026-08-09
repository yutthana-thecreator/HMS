import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const method = String(body.method ?? "cash");
  const note = body.note ? String(body.note) : null;

  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, message: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (!PAYMENT_METHODS[method]) {
    return NextResponse.json({ ok: false, message: "วิธีชำระไม่ถูกต้อง" }, { status: 400 });
  }

  // 🔒 การจองต้องเป็นของ org นี้
  const res = await prisma.reservation.findFirst({
    where: { id, property: { orgId: user.orgId } },
    select: { id: true },
  });
  if (!res) return NextResponse.json({ ok: false, message: "ไม่พบการจอง" }, { status: 404 });

  await prisma.payment.create({ data: { reservationId: id, amount, method, note } });
  return NextResponse.json({ ok: true });
}

// ลบรายการชำระ
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ ok: false }, { status: 400 });

  // ตรวจว่า payment อยู่ในการจองของ org นี้
  const p = await prisma.payment.findFirst({
    where: { id: paymentId, reservationId: id, reservation: { property: { orgId: user.orgId } } },
    select: { id: true },
  });
  if (!p) return NextResponse.json({ ok: false, message: "ไม่พบรายการ" }, { status: 404 });

  await prisma.payment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
