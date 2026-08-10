import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, PlanId } from "@/lib/plans";
import { stripeConfigured, createCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

// สร้าง Stripe Checkout สำหรับสมัคร/เปลี่ยนแพ็กเกจ → คืน url ให้ redirect ไปจ่ายเงิน
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!["owner", "manager"].includes(user.role)) {
    return NextResponse.json({ ok: false, message: "เฉพาะเจ้าของ/ผู้จัดการเปลี่ยนแพ็กเกจได้" }, { status: 403 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, message: "ระบบชำระเงินยังไม่ได้ตั้งค่า (ติดต่อผู้ดูแล)" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "") as PlanId;
  const target = PLANS[plan];
  if (!target) return NextResponse.json({ ok: false, message: "แพ็กเกจไม่ถูกต้อง" }, { status: 400 });

  // กัน downgrade ที่ทำให้เกิน limit ใหม่
  const [rooms, props, org] = await Promise.all([
    prisma.room.count({ where: { property: { orgId: user.orgId } } }),
    prisma.property.count({ where: { orgId: user.orgId } }),
    prisma.organization.findUnique({ where: { id: user.orgId } }),
  ]);
  if (rooms > target.maxRooms || props > target.maxProperties) {
    return NextResponse.json(
      { ok: false, message: `ลดแพ็กเกจไม่ได้: ปัจจุบันมี ${rooms} ห้อง / ${props} ที่พัก เกินลิมิต ${target.name}` },
      { status: 409 },
    );
  }

  try {
    const url = await createCheckoutSession({
      orgId: user.orgId,
      plan,
      planName: target.name,
      priceTHB: target.priceTHB,
      customerId: org?.stripeCustomerId,
      customerEmail: user.email,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
