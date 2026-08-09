"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, verifyAdmin, setAdminCookie } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "กรอกอีเมลและรหัสผ่าน" };

  // admin (env-only) ก่อน
  if (verifyAdmin(email, password)) {
    await setAdminCookie();
    redirect("/admin");
  }

  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createSession(user.id);
  redirect("/");
}
