import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

// ส่ง (หรือส่งซ้ำ) อีเมลยืนยันการจอง — เฉพาะการจองของ org ที่ล็อกอิน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const r = await prisma.reservation.findFirst({
    where: { id, property: { orgId: user.orgId } },
    select: { id: true },
  });
  if (!r) return NextResponse.json({ ok: false, message: "ไม่พบการจอง" }, { status: 404 });

  const result = await sendBookingConfirmation(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
