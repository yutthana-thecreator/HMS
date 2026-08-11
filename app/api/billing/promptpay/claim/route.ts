import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, PlanId, planPrice, BillingCycle } from "@/lib/plans";
import { sendAdminPaymentNotice } from "@/lib/email";

export const runtime = "nodejs";

// ลูกค้ากด "ฉันโอนแล้ว" → สร้างคำขอชำระเงิน (รอ admin ยืนยัน) + แจ้ง admin
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!["owner", "manager"].includes(user.role)) {
    return NextResponse.json({ ok: false, message: "เฉพาะเจ้าของ/ผู้จัดการ" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "") as PlanId;
  const cycle = (body.cycle === "yearly" ? "yearly" : "monthly") as BillingCycle;
  const target = PLANS[plan];
  if (!target) return NextResponse.json({ ok: false, message: "แพ็กเกจไม่ถูกต้อง" }, { status: 400 });

  // กัน downgrade เกินลิมิต
  const [rooms, props] = await Promise.all([
    prisma.room.count({ where: { property: { orgId: user.orgId } } }),
    prisma.property.count({ where: { orgId: user.orgId } }),
  ]);
  if (rooms > target.maxRooms || props > target.maxProperties) {
    return NextResponse.json(
      { ok: false, message: `ลดแพ็กเกจไม่ได้: มี ${rooms} ห้อง / ${props} ที่พัก เกินลิมิต ${target.name}` },
      { status: 409 },
    );
  }

  // ถ้ามีคำขอ pending ของ org นี้อยู่แล้ว ใช้ตัวเดิม (กันสร้างซ้ำ)
  const existing = await prisma.paymentRequest.findFirst({ where: { orgId: user.orgId, status: "pending" } });
  const amount = planPrice(target, cycle);
  if (existing) {
    await prisma.paymentRequest.update({ where: { id: existing.id }, data: { plan, cycle, amount } });
  } else {
    await prisma.paymentRequest.create({ data: { orgId: user.orgId, plan, cycle, amount } });
  }

  sendAdminPaymentNotice({
    orgName: user.organization.name,
    planName: target.name,
    cycleLabel: cycle === "yearly" ? "รายปี" : "รายเดือน",
    amount,
  }).catch((e) => console.error("admin notice failed:", (e as Error).message));

  return NextResponse.json({ ok: true });
}
