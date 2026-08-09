import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, verifyAdmin, setAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "กรอกอีเมลและรหัสผ่าน" }, { status: 400 });
  }

  // ---- Platform admin (env-only) ----
  if (verifyAdmin(email, password)) {
    await setAdminCookie();
    return NextResponse.json({ ok: true, admin: true });
  }

  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
