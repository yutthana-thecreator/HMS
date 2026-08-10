import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail, emailConfigured } from "@/lib/email";

export const runtime = "nodejs";

// ส่งอีเมลทดสอบไปหาอีเมลผู้ที่ล็อกอิน
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ ok: false, message: "ยังไม่ได้ตั้ง RESEND_API_KEY" }, { status: 400 });

  const r = await sendEmail({
    to: user.email,
    subject: "ทดสอบระบบอีเมล ✅",
    html: `<div style="font-family:sans-serif;padding:20px"><h2>ระบบอีเมลทำงานแล้ว 🎉</h2><p>ถ้าคุณเห็นอีเมลนี้ แปลว่าตั้งค่า Resend สำเร็จ ระบบพร้อมส่งอีเมลยืนยันการจองให้ลูกค้าอัตโนมัติ</p></div>`,
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
