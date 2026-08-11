import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, PlanId, planPrice, BillingCycle } from "@/lib/plans";
import { promptpayConfigured, promptPayQrDataUrl } from "@/lib/promptpay";

export const runtime = "nodejs";

// สร้าง PromptPay QR = ยอดค่าแพ็ก (ยังไม่บันทึกอะไร)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!promptpayConfigured()) {
    return NextResponse.json({ ok: false, message: "ระบบชำระเงินยังไม่ได้ตั้งค่า (ติดต่อผู้ดูแล)" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "") as PlanId;
  const cycle = (body.cycle === "yearly" ? "yearly" : "monthly") as BillingCycle;
  const target = PLANS[plan];
  if (!target) return NextResponse.json({ ok: false, message: "แพ็กเกจไม่ถูกต้อง" }, { status: 400 });

  const amount = planPrice(target, cycle);
  const qrDataUrl = await promptPayQrDataUrl(amount);
  return NextResponse.json({
    ok: true,
    amount,
    qrDataUrl,
    planName: target.name,
    cycleLabel: cycle === "yearly" ? "รายปี" : "รายเดือน",
  });
}
