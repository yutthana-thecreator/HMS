// ============================================================================
//  Auth — session-based (opaque token ใน DB + httpOnly cookie)
//  ใช้ node:crypto (scrypt) แฮชรหัสผ่าน — ไม่ต้องพึ่ง native dependency
// ============================================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "./db";

const COOKIE = "hms_session";
const SESSION_DAYS = 30;

// ---------- password ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

// ---------- session ----------
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // ไม่ตั้ง expires → เป็น session cookie: หมดอายุเมื่อปิด browser (ต้อง login ใหม่)
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

/** คืน user + organization ของเซสชันปัจจุบัน (หรือ null ถ้าไม่ล็อกอิน/หมดอายุ) */
export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { organization: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session.user; // { ..., organization }
}

/** บังคับล็อกอิน — ถ้าไม่มี redirect ไป /login */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// อีเมลของเจ้าของแพลตฟอร์ม (เข้าหน้า /admin ได้)
const SUPER_ADMIN_EMAILS = ["owner@example.com", "yutthana.ch23@gmail.com"];

export function isSuperAdmin(email?: string | null): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
