import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

// สมัครใช้งาน: สร้าง organization (tenant) + owner + property แรก + เริ่ม trial 14 วัน
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const hotelName = String(body.hotelName ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!hotelName || !email || !password) {
    return NextResponse.json({ ok: false, message: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, message: "อีเมลนี้ถูกใช้แล้ว" }, { status: 409 });
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: hotelName,
        plan: "starter",
        planStatus: "trialing",
        trialEndsAt,
      },
    });
    await tx.property.create({
      data: { orgId: org.id, name: hotelName },
    });
    return tx.appUser.create({
      data: {
        orgId: org.id,
        name: fullName || null,
        email,
        passwordHash: hashPassword(password),
        role: "owner",
      },
    });
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
