"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export type SignupState = { error?: string };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const hotelName = String(formData.get("hotelName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!hotelName || !email || !password) return { error: "กรอกข้อมูลไม่ครบ" };
  if (password.length < 8) return { error: "รหัสผ่านอย่างน้อย 8 ตัวอักษร" };

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) return { error: "อีเมลนี้ถูกใช้แล้ว" };

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: hotelName, plan: "starter", planStatus: "trialing", trialEndsAt },
    });
    const property = await tx.property.create({ data: { orgId: org.id, name: hotelName } });
    await tx.channel.create({ data: { propertyId: property.id, type: "direct", name: "เว็บจองตรง" } });
    return tx.appUser.create({
      data: { orgId: org.id, name: fullName || null, email, passwordHash: hashPassword(password), role: "owner" },
    });
  });

  await createSession(user.id);
  redirect("/settings");
}
