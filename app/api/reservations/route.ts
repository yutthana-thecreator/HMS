import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createReservation, SoldOutError, InvalidDatesError } from "@/lib/reservations";
import { pushChannexSafe } from "@/lib/channexSync";
import { sendBookingConfirmationSafe } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รายการการจอง (เฉพาะของ org ที่ล็อกอิน)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const list = await prisma.reservation.findMany({
    where: { property: { orgId: user.orgId } },
    include: { guest: true, channel: true, rooms: { include: { roomType: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(list);
}

// สร้างการจอง — ตรวจ tenant isolation ก่อนเข้า engine
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const propertyId = String(body.propertyId ?? "");
  const roomTypeId = String(body.roomTypeId ?? "");
  const checkinDate = String(body.checkinDate ?? "");
  const checkoutDate = String(body.checkoutDate ?? "");
  const guestName = String(body.guestName ?? "").trim();

  if (!propertyId || !roomTypeId || !checkinDate || !checkoutDate || !guestName) {
    return NextResponse.json({ ok: false, message: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (checkoutDate <= checkinDate) {
    return NextResponse.json({ ok: false, message: "วันเช็คเอาต์ต้องหลังวันเช็คอิน" }, { status: 400 });
  }

  // 🔒 tenant isolation: property ต้องเป็นของ org นี้ และ roomType ต้องอยู่ใน property นั้น
  const property = await prisma.property.findFirst({ where: { id: propertyId, orgId: user.orgId } });
  if (!property) return NextResponse.json({ ok: false, message: "ไม่มีสิทธิ์เข้าถึงที่พักนี้" }, { status: 403 });

  const roomType = await prisma.roomType.findFirst({ where: { id: roomTypeId, propertyId } });
  if (!roomType) return NextResponse.json({ ok: false, message: "ไม่พบประเภทห้อง" }, { status: 400 });

  if (body.channelId) {
    const ch = await prisma.channel.findFirst({ where: { id: String(body.channelId), propertyId } });
    if (!ch) return NextResponse.json({ ok: false, message: "ช่องทางไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const { reservation, idempotentHit } = await createReservation({
      propertyId,
      roomTypeId,
      checkinDate,
      checkoutDate,
      guestName,
      guestEmail: body.guestEmail ? String(body.guestEmail) : null,
      guestPhone: body.guestPhone ? String(body.guestPhone) : null,
      guestsCount: body.guestsCount ? Number(body.guestsCount) : 1,
      units: body.units ? Number(body.units) : 1,
      depositAmount: body.depositAmount ? Number(body.depositAmount) : 0,
      depositMethod: body.depositMethod ? String(body.depositMethod) : "cash",
      idCardImage: typeof body.idCardImage === "string" && body.idCardImage.length < 3_000_000 ? body.idCardImage : null,
      channelId: body.channelId ? String(body.channelId) : null,
      externalRef: body.externalRef ? String(body.externalRef) : null,
    });
    pushChannexSafe(propertyId); // ขายปุ๊บ → อัปเดตห้องว่างไปทุก OTA
    if (!idempotentHit) sendBookingConfirmationSafe(reservation.id); // อีเมลยืนยันให้แขก
    return NextResponse.json({ ok: true, idempotentHit, reservation });
  } catch (e) {
    if (e instanceof SoldOutError) {
      return NextResponse.json({ ok: false, code: "SOLD_OUT", message: e.message }, { status: 409 });
    }
    if (e instanceof InvalidDatesError) {
      return NextResponse.json({ ok: false, code: "INVALID_DATES", message: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}
