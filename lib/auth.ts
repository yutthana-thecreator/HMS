// ============================================================================
//  Auth — session-based (opaque token ใน DB + httpOnly cookie)
//  ใช้ node:crypto (scrypt) แฮชรหัสผ่าน — ไม่ต้องพึ่ง native dependency
// ============================================================================
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { prisma } from "./db";

const COOKIE = "hms_session";
const ADMIN_COOKIE = "hms_admin";
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
  jar.delete(ADMIN_COOKIE); // ล็อกอินโรงแรม → เคลียร์ admin cookie อัตโนมัติ (กันสับสน)
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
  jar.delete(ADMIN_COOKIE);
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

/** บังคับล็อกอิน — ถ้าไม่มี redirect ไป /login · ถ้าถูกระงับ ไป /suspended */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.organization.suspended) redirect("/suspended");
  return user;
}

// ================== Platform Admin (env-only, แยกจากระบบ tenant) ==================
// กำหนดใน ENV บน Vercel: ADMIN_EMAIL, ADMIN_PASSWORD — สมัคร /signup ไม่ได้
function adminToken(): string | null {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return null;
  return createHmac("sha256", pass).update(email.toLowerCase()).digest("hex");
}

/** ตรวจ username/password admin กับค่าใน env */
export function verifyAdmin(email: string, password: string): boolean {
  const e = process.env.ADMIN_EMAIL;
  const p = process.env.ADMIN_PASSWORD;
  if (!e || !p) return false;
  return email.trim().toLowerCase() === e.toLowerCase() && password === p;
}

export async function setAdminCookie(): Promise<void> {
  const token = adminToken();
  if (!token) return;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

/** true ถ้า request ปัจจุบันเป็น admin (มี cookie ที่ตรงกับ env) */
export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const jar = await cookies();
  const c = jar.get(ADMIN_COOKIE)?.value;
  return !!c && c === token;
}
