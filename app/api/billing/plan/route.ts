import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, PlanId } from "@/lib/plans";

export const runtime = "nodejs";

// เปลี่ยนแพ็กเกจ (DEV STUB — ยังไม่ตัดเงินจริง)
// เฟสถัดไป: แทนที่ด้วย Stripe Checkout → webhook อัปเดต plan/planStatus
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!["owner", "manager"].includes(user.role)) {
    return NextResponse.json({ ok: false, message: "เฉพาะเจ้าของ/ผู้จัดการเปลี่ยนแพ็กเกจได้" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "") as PlanId;
  if (!PLANS[plan]) return NextResponse.json({ ok: false, message: "แพ็กเกจไม่ถูกต้อง" }, { status: 400 });

  // ป้องกัน downgrade ที่ทำให้เกิน limit ใหม่
  const target = PLANS[plan];
  const [rooms, props] = await Promise.all([
    prisma.room.count({ where: { property: { orgId: user.orgId } } }),
    prisma.property.count({ where: { orgId: user.orgId } }),
  ]);
  if (rooms > target.maxRooms || props > target.maxProperties) {
    return NextResponse.json(
      { ok: false, message: `ลดแพ็กเกจไม่ได้: ปัจจุบันมี ${rooms} ห้อง / ${props} ที่พัก เกินลิมิต ${target.name}` },
      { status: 409 },
    );
  }

  await prisma.organization.update({
    where: { id: user.orgId },
    data: { plan, planStatus: "active" }, // DEV: ถือว่าจ่ายแล้วทันที
  });

  return NextResponse.json({ ok: true });
}
