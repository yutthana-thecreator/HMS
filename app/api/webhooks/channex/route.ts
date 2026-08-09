import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { channexGetBooking } from "@/lib/channex";
import { createReservation, SoldOutError } from "@/lib/reservations";
import { pushChannexSafe } from "@/lib/channexSync";

export const runtime = "nodejs";

// รับ webhook การจองจาก OTA (ผ่าน Channex) → สร้างการจองในระบบ + push ห้องว่างกลับ
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  // Channex อาจส่ง { event, payload:{ booking_id, property_id } } หรือ booking เต็ม
  const payload = (body.payload ?? body) as Record<string, unknown>;
  const bookingId = String(payload.booking_id ?? payload.id ?? "");

  let booking: Record<string, unknown> = payload.attributes
    ? (payload.attributes as Record<string, unknown>)
    : payload;
  if (bookingId && !booking.rooms) {
    const b = await channexGetBooking(bookingId);
    if (b) booking = (b.attributes as Record<string, unknown>) ?? b;
  }

  const channexPropertyId = String(booking.property_id ?? "");
  if (!channexPropertyId) return NextResponse.json({ ok: true, skipped: "no property_id" });

  const property = await prisma.property.findFirst({ where: { channexPropertyId } });
  if (!property) return NextResponse.json({ ok: true, skipped: "unknown property" });

  const customer = (booking.customer ?? {}) as Record<string, string>;
  const guestName = [customer.name, customer.surname].filter(Boolean).join(" ") || "OTA Guest";
  const otaCode = String(booking.ota_reservation_code ?? booking.unique_id ?? bookingId ?? "unknown");
  const rooms = (booking.rooms ?? []) as Array<Record<string, string>>;

  // ช่องทาง OTA (สร้างถ้ายังไม่มี)
  let channel = await prisma.channel.findFirst({ where: { propertyId: property.id, type: "channel_manager" } });
  if (!channel) {
    channel = await prisma.channel.create({ data: { propertyId: property.id, type: "channel_manager", name: "OTA (Channex)" } });
  }

  let created = 0;
  let conflicts = 0;
  for (const room of rooms) {
    const rt = await prisma.roomType.findFirst({
      where: { propertyId: property.id, channexRoomTypeId: room.room_type_id },
    });
    if (!rt) continue;
    const checkin = room.checkin_date ?? room.arrival_date;
    const checkout = room.checkout_date ?? room.departure_date;
    if (!checkin || !checkout) continue;
    try {
      const { idempotentHit } = await createReservation({
        propertyId: property.id,
        roomTypeId: rt.id,
        checkinDate: checkin,
        checkoutDate: checkout,
        guestName,
        channelId: channel.id,
        externalRef: `channex:${otaCode}:${room.room_type_id}`,
      });
      if (!idempotentHit) created++;
    } catch (e) {
      if (e instanceof SoldOutError) conflicts++;
      else console.error("channex booking import error:", (e as Error).message);
    }
  }

  pushChannexSafe(property.id); // อัปเดตห้องว่างกลับไปทุก OTA
  return NextResponse.json({ ok: true, created, conflicts });
}
