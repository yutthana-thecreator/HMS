import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { channexConfigured, channexListProperties, channexBaseUrl } from "@/lib/channex";

export const runtime = "nodejs";

// ทดสอบการเชื่อมต่อ Channex — คืนรายชื่อ property (เอา id ไป map)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!channexConfigured()) {
    return NextResponse.json({ ok: false, message: "ยังไม่ได้ตั้ง CHANNEX_API_KEY บน Vercel" }, { status: 400 });
  }

  try {
    const properties = await channexListProperties();
    return NextResponse.json({ ok: true, base: channexBaseUrl(), properties });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
