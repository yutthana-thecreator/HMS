import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ปิดใช้งาน: การเปลี่ยนแพ็กเกจต้องผ่าน Stripe Checkout เท่านั้น (/api/billing/checkout)
// (เดิมเป็น DEV STUB ที่อัปเกรดฟรี — ปิดเพื่อกันเลี่ยงการจ่ายเงิน)
export async function POST() {
  return NextResponse.json(
    { ok: false, message: "กรุณาเปลี่ยนแพ็กเกจผ่านหน้าชำระเงิน (Stripe)" },
    { status: 410 },
  );
}
