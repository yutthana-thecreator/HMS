import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { onboardChannex } from "@/lib/channexSync";

export const runtime = "nodejs";
export const maxDuration = 60;

// Onboarding ปุ่มเดียว: สร้าง property + provision ห้อง + webhook + push
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const r = await onboardChannex(user.orgId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
