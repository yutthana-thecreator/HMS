import { NextResponse } from "next/server";
import { sendCheckinReminders } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Vercel Cron รายวัน → ส่งอีเมลเตือนแขกที่เช็คอินพรุ่งนี้
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
    }
  }
  const result = await sendCheckinReminders();
  return NextResponse.json({ ok: true, ...result });
}
