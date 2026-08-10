import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { stripeConfigured, createPortalSession } from "@/lib/stripe";

export const runtime = "nodejs";

// เปิด Stripe Customer Portal (จัดการ/ยกเลิก/เปลี่ยนบัตร)
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!["owner", "manager"].includes(user.role)) {
    return NextResponse.json({ ok: false, message: "เฉพาะเจ้าของ/ผู้จัดการ" }, { status: 403 });
  }
  if (!stripeConfigured()) return NextResponse.json({ ok: false, message: "ยังไม่ได้ตั้งค่าระบบชำระเงิน" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: user.orgId } });
  if (!org?.stripeCustomerId) {
    return NextResponse.json({ ok: false, message: "ยังไม่มีข้อมูลการชำระเงิน — สมัครแพ็กเกจก่อน" }, { status: 400 });
  }

  try {
    const url = await createPortalSession(org.stripeCustomerId);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
