import { NextResponse } from "next/server";
import { sendSubscriptionReminders } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Cron รายวัน → เตือนแพ็กใกล้หมดอายุ (7 วัน + 1 วัน)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await sendSubscriptionReminders();
  return NextResponse.json({ ok: true, ...result });
}
