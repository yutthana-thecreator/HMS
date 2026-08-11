import { prisma } from "./db";

export class FrontDeskError extends Error {}

/** เช็คอิน: กำหนดห้องจริง + status=checked_in + ห้อง=occupied */
export async function checkinReservation(reservationId: string, roomId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id: reservationId }, include: { rooms: true } });
    if (!r) throw new FrontDeskError("ไม่พบการจอง");
    if (!["confirmed", "pending"].includes(r.status)) {
      throw new FrontDeskError("เช็คอินได้เฉพาะการจองที่ยืนยันแล้ว");
    }
    const rr = r.rooms[0];
    if (!rr) throw new FrontDeskError("การจองไม่มีห้อง");

    // เลือกห้องจริง: ที่ระบุมา หรือ auto เลือกห้องว่าง (ไม่ occupied) ของประเภทนั้น
    let assignRoomId = roomId ?? rr.roomId ?? null;
    if (roomId) {
      const room = await tx.room.findFirst({ where: { id: roomId, propertyId: r.propertyId, roomTypeId: rr.roomTypeId } });
      if (!room) throw new FrontDeskError("ห้องที่เลือกไม่ถูกต้อง");
      assignRoomId = room.id;
    } else if (!assignRoomId) {
      const free = await tx.room.findFirst({
        where: { propertyId: r.propertyId, roomTypeId: rr.roomTypeId, status: { notIn: ["occupied", "out_of_order"] } },
        orderBy: { number: "asc" },
      });
      assignRoomId = free?.id ?? null;
    }

    if (assignRoomId) {
      await tx.reservationRoom.update({ where: { id: rr.id }, data: { roomId: assignRoomId } });
      await tx.room.update({ where: { id: assignRoomId }, data: { status: "occupied" } });
    }
    return tx.reservation.update({ where: { id: reservationId }, data: { status: "checked_in", checkinAt: new Date() } });
  });
}

/** เช็คเอาต์: status=checked_out + ห้อง=dirty (ให้แม่บ้านทำความสะอาด) */
export async function checkoutReservation(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id: reservationId }, include: { rooms: true } });
    if (!r) throw new FrontDeskError("ไม่พบการจอง");
    if (r.status !== "checked_in") throw new FrontDeskError("เช็คเอาต์ได้เฉพาะแขกที่เช็คอินแล้ว");

    for (const rr of r.rooms) {
      if (rr.roomId) await tx.room.update({ where: { id: rr.roomId }, data: { status: "dirty" } });
    }
    return tx.reservation.update({ where: { id: reservationId }, data: { status: "checked_out", checkoutAt: new Date() } });
  });
}
