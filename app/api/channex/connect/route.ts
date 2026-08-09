import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { channexConfigured } from "@/lib/channex";
import { connectChannex } from "@/lib/channexSync";

export const runtime = "nodejs";
export const maxDuration = 60;

// เชื่อมโรงแรมกับ Channex + auto สร้าง room type/rate plan + push ห้องว่าง
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!channexConfigured()) return NextResponse.json({ ok: false, message: "ยังไม่ได้ตั้ง CHANNEX_API_KEY" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const channexPropertyId = String(body.channexPropertyId ?? "").trim();
  if (!channexPropertyId) return NextResponse.json({ ok: false, message: "เลือก property Channex ก่อน" }, { status: 400 });

  try {
    const r = await connectChannex(user.orgId, channexPropertyId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
