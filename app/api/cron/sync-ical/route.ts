import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Vercel Cron เรียกทุกชั่วโมง (ตั้งใน vercel.json)
// ป้องกันด้วย CRON_SECRET (Vercel แนบ header Authorization: Bearer <CRON_SECRET> ให้อัตโนมัติ)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
    }
  }
  const result = await syncAll();
  return NextResponse.json({ ok: true, ...result });
}
