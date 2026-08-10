// ส่งอีเมลผ่าน Resend — ตั้ง env: RESEND_API_KEY, EMAIL_FROM
import { prisma } from "./db";
import { nightCount } from "./dates";

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
