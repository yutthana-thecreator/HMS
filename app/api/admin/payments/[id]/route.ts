import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { BillingCycle, nextPeriodEnd } from "@/lib/plans";
import { sendPaymentConfirmed } from "@/lib/email";

export const runtime = "nodejs";

// admin ยืนยัน/ปฏิเสธ คำขอชำระเงิน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  const pr = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!pr || pr.status !== "pending") {
    return NextResponse.json({ ok: false, message: "ไม่พบคำขอ หรือถูกดำเนินการแล้ว" }, { status: 404 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin";

  if (action === "confirm") {
    const org = await prisma.organization.findUnique({ where: { id: pr.orgId } });
    const newEnd = nextPeriodEnd(org?.currentPeriodEnd ?? new Date(), pr.cycle as BillingCycle);
    await prisma.$transaction([
      prisma.paymentRequest.update({ where: { id }, data: { status: "confirmed", reviewedAt: new Date(), reviewedBy: adminEmail } }),
      prisma.organization.update({
        where: { id: pr.orgId },
        data: { plan: pr.plan, billingCycle: pr.cycle, planStatus: "active", currentPeriodEnd: newEnd },
      }),
    ]);
    sendPaymentConfirmed(pr.orgId).catch((e) => console.error("confirm email failed:", (e as Error).message));
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.paymentRequest.update({ where: { id }, data: { status: "rejected", reviewedAt: new Date(), reviewedBy: adminEmail } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "action ไม่ถูกต้อง" }, { status: 400 });
}
