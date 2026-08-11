// ============================================================================
//  Reservation Engine — สมองของการจอง + กัน Overbooking
//  โครงสร้าง service layer นี้ออกแบบให้พอร์ตไป NestJS ได้โดยแทบไม่แก้ logic
// ============================================================================
import { prisma } from "./db";
import { nightsBetween } from "./dates";

export type CreateReservationInput = {
  propertyId: string;
  roomTypeId: string;
  checkinDate: string; // YYYY-MM-DD
  checkoutDate: string; // YYYY-MM-DD
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestsCount?: number;
  units?: number; // จำนวนห้อง (จองเป็นกลุ่ม)
  depositAmount?: number; // ค่ามัดจำที่เก็บตอนจอง → บันทึกเป็น Payment
  depositMethod?: string;
  idCardImage?: string | null; // base64 รูปบัตร ปชช.
  channelId?: string | null;
  externalRef?: string | null; // id ฝั่ง OTA (สำหรับ idempotency)
  notes?: string | null;
};

/** โยนเมื่อห้องเต็ม/ปิดขายในบางคืน → transaction จะ rollback */
export class SoldOutError extends Error {
  constructor(message = "ห้องเต็มในช่วงวันที่เลือก") {
    super(message);
    this.name = "SoldOutError";
  }
}

export class InvalidDatesError extends Error {
  constructor(message = "ช่วงวันที่ไม่ถูกต้อง") {
    super(message);
    this.name = "InvalidDatesError";
  }
}

function genCode(): string {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${rnd}`;
}

/**
 * สร้างการจอง 1 ห้อง × ช่วงวัน พร้อมกัน overbooking แบบ atomic
 *
 * กลไก 3 ชั้น (ดู docs/03-anti-overbooking.md):
 *  1) Idempotency — ถ้ามี (channelId, externalRef) เดิมอยู่แล้ว คืนตัวเดิม ไม่ตัดสต็อกซ้ำ
 *  2) Atomic guarded UPDATE — ตัดสต็อกทุกคืนในคำสั่งเดียว โดยมีเงื่อนไข
 *     `unitsSold + 1 <= unitsTotal` → ถ้าคืนใดเต็ม จำนวนแถวที่อัปเดตจะไม่ครบ
 *  3) Transaction — ถ้าไม่ครบทุกคืน → throw → rollback ทั้งก้อน (ไม่มีสต็อกค้าง)
 */
export async function createReservation(input: CreateReservationInput) {
  const nights = nightsBetween(input.checkinDate, input.checkoutDate);
  if (nights.length === 0) throw new InvalidDatesError();
  const units = Math.max(1, Math.min(20, Math.floor(input.units ?? 1)));

  // ---- ชั้น 1: Idempotency (booking จาก OTA ที่อาจยิงซ้ำ) ----
  if (input.channelId && input.externalRef) {
    const existing = await prisma.reservation.findFirst({
      where: { channelId: input.channelId, externalRef: input.externalRef },
      include: { rooms: true, guest: true },
    });
    if (existing) return { reservation: existing, idempotentHit: true };
  }

  const reservation = await prisma.$transaction(
    async (tx) => {
      // ---- ชั้น 2: Atomic guarded decrement ข้ามทุกคืน ----
      const affected = await tx.$executeRaw`
        UPDATE "Availability"
        SET "unitsSold" = "unitsSold" + ${units}
        WHERE "roomTypeId" = ${input.roomTypeId}
          AND "date" >= ${input.checkinDate}
          AND "date" < ${input.checkoutDate}
          AND "stopSell" = false
          AND "unitsSold" + ${units} <= "unitsTotal"
      `;

      // ---- ชั้น 3: ถ้าไม่ครบทุกคืน (ห้องไม่พอ) → rollback ----
      if (affected !== nights.length) {
        throw new SoldOutError(units > 1 ? `ห้องว่างไม่พอ ${units} ห้องในช่วงที่เลือก` : undefined);
      }

      // ราคาต่อห้อง = ผลรวมราคาต่อคืน · ราคารวม = × จำนวนห้อง
      const rows = await tx.availability.findMany({
        where: { roomTypeId: input.roomTypeId, date: { in: nights } },
        select: { price: true },
      });
      const perRoom = rows.reduce((sum, r) => sum + r.price, 0);
      const total = perRoom * units;

      const guest = await tx.guest.create({
        data: {
          fullName: input.guestName,
          email: input.guestEmail ?? null,
          phone: input.guestPhone ?? null,
          idCardImage: input.idCardImage ?? null,
        },
      });

      const created = await tx.reservation.create({
        data: {
          propertyId: input.propertyId,
          guestId: guest.id,
          channelId: input.channelId ?? null,
          externalRef: input.externalRef ?? null,
          code: genCode(),
          status: "confirmed",
          totalAmount: total,
          notes: input.notes ?? null,
          rooms: {
            create: Array.from({ length: units }, () => ({
              roomTypeId: input.roomTypeId,
              checkinDate: input.checkinDate,
              checkoutDate: input.checkoutDate,
              guestsCount: input.guestsCount ?? 1,
              priceTotal: perRoom,
            })),
          },
        },
        include: { rooms: { include: { roomType: true } }, guest: true, channel: true },
      });

      // ค่ามัดจำ (ถ้าเก็บตอนจอง) → บันทึกเป็น Payment
      const deposit = Math.max(0, Math.min(total, Number(input.depositAmount) || 0));
      if (deposit > 0) {
        await tx.payment.create({
          data: { reservationId: created.id, amount: deposit, method: input.depositMethod ?? "cash", note: "ค่ามัดจำ (ตอนจอง)" },
        });
      }

      return created;
    },
    { maxWait: 20000, timeout: 30000 },
  );

  return { reservation, idempotentHit: false };
}

/**
 * ยกเลิกการจอง → คืนสต็อกกลับเข้า availability + ตั้งสถานะ cancelled
 * (idempotent: ยกเลิกซ้ำไม่คืนสต็อกซ้ำ)
 */
export async function cancelReservation(reservationId: string) {
  return prisma.$transaction(
    async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { rooms: true },
      });
      if (!r) throw new Error("ไม่พบการจอง");
      if (r.status === "cancelled") return r;

      for (const room of r.rooms) {
        await tx.$executeRaw`
          UPDATE "Availability"
          SET "unitsSold" = "unitsSold" - 1
          WHERE "roomTypeId" = ${room.roomTypeId}
            AND "date" >= ${room.checkinDate}
            AND "date" < ${room.checkoutDate}
            AND "unitsSold" > 0
        `;
      }

      return tx.reservation.update({
        where: { id: reservationId },
        data: { status: "cancelled" },
      });
    },
    { maxWait: 20000, timeout: 30000 },
  );
}
