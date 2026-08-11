// ส่งอีเมลผ่าน Resend — ตั้ง env: RESEND_API_KEY, EMAIL_FROM
import { prisma } from "./db";
import { nightCount, todayStr, addDays } from "./dates";

const KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export function emailConfigured(): boolean {
  return KEY.length > 0;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!KEY) return { ok: false, message: "ยังไม่ได้ตั้ง RESEND_API_KEY" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `Resend HTTP ${res.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** HTML template ยืนยันการจอง (ภาษาไทย) */
function confirmationHtml(d: {
  hotelName: string;
  guestName: string;
  code: string;
  roomTypeName: string;
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  total: number;
}): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <div style="background:#4f46e5;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
      <div style="font-size:14px;opacity:.85">ยืนยันการจอง</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px">${esc(d.hotelName)}</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 18px">สวัสดีคุณ <b>${esc(d.guestName)}</b>,<br/>ขอบคุณที่จองกับเรา 🎉 นี่คือรายละเอียดการจองของคุณ</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:8px 0;color:#6b7280">รหัสการจอง</td><td style="padding:8px 0;text-align:right;font-weight:700;font-family:monospace">${esc(d.code)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">ประเภทห้อง</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.roomTypeName)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">เช็คอิน</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.checkin)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">เช็คเอาต์</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.checkout)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">จำนวนคืน</td><td style="padding:8px 0;text-align:right;font-weight:600">${d.nights} คืน</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">ผู้เข้าพัก</td><td style="padding:8px 0;text-align:right;font-weight:600">${d.guests} คน</td></tr>
        <tr><td style="padding:14px 0 0;color:#6b7280;border-top:1px solid #e5e7eb">ยอดรวม</td><td style="padding:14px 0 0;text-align:right;font-weight:700;font-size:20px;border-top:1px solid #e5e7eb;color:#4f46e5">฿${money(d.total)}</td></tr>
      </table>
      <p style="margin:22px 0 0;font-size:13px;color:#6b7280">หากมีคำถาม ตอบกลับอีเมลนี้ได้เลย · แล้วพบกันที่ ${esc(d.hotelName)}</p>
    </div>
  </div>`;
}

/** ส่งอีเมลยืนยันการจองให้แขก (คืน skipped ถ้าไม่มีอีเมล/ยังไม่ตั้งค่า) */
export async function sendBookingConfirmation(reservationId: string): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { guest: true, property: true, rooms: { include: { roomType: true } } },
  });
  if (!r) return { ok: false, message: "ไม่พบการจอง" };
  if (!r.guest?.email) return { ok: false, skipped: true, message: "ไม่มีอีเมลลูกค้า" };
  if (!emailConfigured()) return { ok: false, skipped: true, message: "ยังไม่ได้ตั้งค่าอีเมล" };

  const room = r.rooms[0];
  const owner = await prisma.appUser.findFirst({ where: { orgId: r.property.orgId }, orderBy: { createdAt: "asc" } });
  const html = confirmationHtml({
    hotelName: r.property.name,
    guestName: r.guest.fullName || "ลูกค้า",
    code: r.code,
    roomTypeName: room?.roomType.name || "-",
    checkin: room?.checkinDate || "-",
    checkout: room?.checkoutDate || "-",
    nights: room ? nightCount(room.checkinDate, room.checkoutDate) : 0,
    guests: room?.guestsCount || 1,
    total: r.totalAmount,
  });

  return sendEmail({
    to: r.guest.email,
    subject: `ยืนยันการจอง ${r.code} · ${r.property.name}`,
    html,
    replyTo: owner?.email,
  });
}

/** ส่งแบบไม่บล็อก (fire-and-forget) หลังจอง */
export function sendBookingConfirmationSafe(reservationId: string): void {
  sendBookingConfirmation(reservationId).catch((e) => console.error("email failed:", (e as Error).message));
}

/** แจ้ง admin ว่ามีคำขอชำระเงินใหม่ (รอยืนยัน) */
export async function sendAdminPaymentNotice(d: {
  orgName: string;
  planName: string;
  cycleLabel: string;
  amount: number;
}): Promise<void> {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin || !emailConfigured()) return;
  const html = `<div style="font-family:sans-serif;max-width:520px;padding:20px">
    <h2 style="margin:0 0 4px">💰 มีคำขอชำระเงินใหม่</h2>
    <p style="color:#6b7280;margin:0 0 16px">รอการยืนยันใน /admin</p>
    <table style="width:100%;font-size:15px">
      <tr><td style="padding:6px 0;color:#6b7280">โรงแรม</td><td style="text-align:right;font-weight:600">${esc(d.orgName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">แพ็กเกจ</td><td style="text-align:right;font-weight:600">${esc(d.planName)} · ${esc(d.cycleLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">ยอด</td><td style="text-align:right;font-weight:700;color:#4f46e5">฿${money(d.amount)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280">เช็คเงินเข้า PromptPay แล้วกด “ยืนยัน” ในหน้า /admin</p>
  </div>`;
  await sendEmail({ to: admin, subject: `💰 คำขอชำระเงิน · ${d.orgName} · ฿${money(d.amount)}`, html });
}

/** แจ้งลูกค้าว่ายืนยันการชำระแล้ว แพ็กเปิดใช้งาน */
export async function sendPaymentConfirmed(orgId: string): Promise<void> {
  if (!emailConfigured()) return;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const owner = await prisma.appUser.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });
  if (!org || !owner?.email) return;
  const until = org.currentPeriodEnd ? org.currentPeriodEnd.toISOString().slice(0, 10) : "-";
  const html = `<div style="font-family:sans-serif;max-width:520px;padding:20px">
    <h2 style="margin:0 0 8px">✅ ยืนยันการชำระเงินแล้ว</h2>
    <p>แพ็กเกจของ <b>${esc(org.name)}</b> เปิดใช้งานเรียบร้อย 🎉</p>
    <p style="font-size:15px">ใช้งานได้ถึง: <b>${until}</b></p>
    <p style="margin-top:16px;font-size:13px;color:#6b7280">ขอบคุณที่ใช้บริการ · ระบบจะเตือนก่อนหมดอายุอีกครั้ง</p>
  </div>`;
  await sendEmail({ to: owner.email, subject: `✅ แพ็กเกจเปิดใช้งานแล้ว · ${org.name}`, html });
}

/** batch: เตือนแพ็กใกล้หมดอายุ (7 วัน + 1 วัน) — เรียกจาก cron รายวัน */
export async function sendSubscriptionReminders(): Promise<{ sent: number }> {
  if (!emailConfigured()) return { sent: 0 };
  const now = new Date();
  const targets = [7, 1].map((d) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  });
  const orgs = await prisma.organization.findMany({
    where: { planStatus: "active", currentPeriodEnd: { not: null } },
    include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  let sent = 0;
  for (const org of orgs) {
    const endStr = org.currentPeriodEnd!.toISOString().slice(0, 10);
    if (!targets.includes(endStr)) continue;
    const email = org.users[0]?.email;
    if (!email) continue;
    const html = `<div style="font-family:sans-serif;max-width:520px;padding:20px">
      <h2 style="margin:0 0 8px">⏰ แพ็กเกจใกล้หมดอายุ</h2>
      <p>แพ็กเกจของ <b>${esc(org.name)}</b> จะหมดอายุวันที่ <b>${endStr}</b></p>
      <p>ต่ออายุเพื่อใช้งานต่อเนื่อง (สแกน PromptPay ในหน้าตั้งค่า)</p>
      <p style="margin-top:14px"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://hotel-management-system-topaz-xi.vercel.app"}/settings" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">ต่ออายุแพ็กเกจ</a></p>
    </div>`;
    const r = await sendEmail({ to: email, subject: `⏰ แพ็กเกจใกล้หมดอายุ (${endStr}) · ${org.name}`, html });
    if (r.ok) sent++;
  }
  return { sent };
}

/** HTML template เตือนก่อนเช็คอิน */
function reminderHtml(d: {
  hotelName: string;
  guestName: string;
  code: string;
  roomTypeName: string;
  checkin: string;
  checkout: string;
  checkinTime: string;
}): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <div style="background:#0ea5e9;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
      <div style="font-size:14px;opacity:.85">แล้วพบกันพรุ่งนี้ 👋</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px">${esc(d.hotelName)}</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 18px">สวัสดีคุณ <b>${esc(d.guestName)}</b>,<br/>พรุ่งนี้ถึงวันเช็คอินแล้ว 🎉 นี่คือรายละเอียดการเข้าพักของคุณ</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:8px 0;color:#6b7280">รหัสการจอง</td><td style="padding:8px 0;text-align:right;font-weight:700;font-family:monospace">${esc(d.code)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">ประเภทห้อง</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.roomTypeName)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">วันเช็คอิน</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.checkin)} (ตั้งแต่ ${esc(d.checkinTime)} น.)</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">วันเช็คเอาต์</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(d.checkout)}</td></tr>
      </table>
      <p style="margin:22px 0 0;font-size:13px;color:#6b7280">เดินทางปลอดภัย · หากมาช้าหรือมีคำถาม ตอบกลับอีเมลนี้ได้เลย · แล้วพบกันที่ ${esc(d.hotelName)}</p>
    </div>
  </div>`;
}

/** ส่งอีเมลเตือนก่อนเช็คอินให้แขก 1 รายการ */
export async function sendCheckinReminder(reservationId: string): Promise<{ ok: boolean; message?: string; skipped?: boolean }> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { guest: true, property: true, rooms: { include: { roomType: true } } },
  });
  if (!r) return { ok: false, message: "ไม่พบการจอง" };
  if (!r.guest?.email) return { ok: false, skipped: true, message: "ไม่มีอีเมลลูกค้า" };
  if (!emailConfigured()) return { ok: false, skipped: true, message: "ยังไม่ได้ตั้งค่าอีเมล" };

  const room = r.rooms[0];
  const owner = await prisma.appUser.findFirst({ where: { orgId: r.property.orgId }, orderBy: { createdAt: "asc" } });
  const html = reminderHtml({
    hotelName: r.property.name,
    guestName: r.guest.fullName || "ลูกค้า",
    code: r.code,
    roomTypeName: room?.roomType.name || "-",
    checkin: room?.checkinDate || "-",
    checkout: room?.checkoutDate || "-",
    checkinTime: r.property.checkinTime,
  });

  return sendEmail({
    to: r.guest.email,
    subject: `พรุ่งนี้เช็คอิน · ${r.property.name} (${r.code})`,
    html,
    replyTo: owner?.email,
  });
}

/** batch: หาการจองที่เช็คอินพรุ่งนี้ + ยังไม่เตือน → ส่ง (เรียกจาก cron รายวัน) */
export async function sendCheckinReminders(): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured()) return { sent: 0, failed: 0 };
  const properties = await prisma.property.findMany();
  let sent = 0;
  let failed = 0;

  for (const prop of properties) {
    const tomorrow = addDays(todayStr(prop.timezone), 1);
    const candidates = await prisma.reservation.findMany({
      where: {
        propertyId: prop.id,
        status: { in: ["confirmed", "pending"] },
        checkinReminderSent: false,
        guest: { email: { not: null } },
        rooms: { some: { checkinDate: tomorrow } },
      },
      select: { id: true },
    });

    for (const c of candidates) {
      const res = await sendCheckinReminder(c.id);
      if (res.ok) {
        await prisma.reservation.update({ where: { id: c.id }, data: { checkinReminderSent: true } });
        sent++;
      } else if (!res.skipped) {
        failed++;
      }
    }
  }
  return { sent, failed };
}
