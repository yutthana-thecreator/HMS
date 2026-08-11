import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { todayStr, isWeekend } from "@/lib/dates";
import { pushChannexSafe } from "@/lib/channexSync";

export const runtime = "nodejs";

// แก้ประเภทห้อง: ชื่อ / ราคา / จำนวนห้อง / buffer
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const rt = await prisma.roomType.findFirst({
    where: { id, property: { orgId: user.orgId } },
    include: { property: true, _count: { select: { rooms: true } } },
  });
  if (!rt) return NextResponse.json({ ok: false, message: "ไม่พบประเภทห้อง" }, { status: 404 });

  const today = todayStr(rt.property.timezone);

  try {
    await prisma.$transaction(async (tx) => {
      // ---- buffer ----
      if (body.otaBuffer !== undefined) {
        await tx.roomType.update({ where: { id }, data: { otaBuffer: Math.max(0, Math.min(50, Math.floor(Number(body.otaBuffer) || 0))) } });
      }

      // ---- ชื่อ ----
      if (typeof body.name === "string" && body.name.trim()) {
        await tx.roomType.update({ where: { id }, data: { name: body.name.trim() } });
      }

      // ---- ราคา (อัปเดตปฏิทันวันข้างหน้าด้วย) ----
      if (body.price !== undefined) {
        const price = Math.max(0, Number(body.price) || 0);
        await tx.roomType.update({ where: { id }, data: { basePrice: price } });
        const future = await tx.availability.findMany({ where: { roomTypeId: id, date: { gte: today } }, select: { id: true, date: true } });
        for (const a of future) {
          await tx.availability.update({ where: { id: a.id }, data: { price: isWeekend(a.date) ? Math.round(price * 1.25) : price } });
        }
      }

      // ---- จำนวนห้อง ----
      if (body.units !== undefined) {
        const newCount = Math.max(1, Math.min(200, Math.floor(Number(body.units) || 1)));
        const oldCount = rt._count.rooms;

        if (newCount > oldCount) {
          const add = newCount - oldCount;
          const plan = getPlan(user.organization.plan);
          const totalRooms = await tx.room.count({ where: { property: { orgId: user.orgId } } });
          if (totalRooms + add > plan.maxRooms) {
            throw new PatchError(`แพ็กเกจ ${plan.name} จำกัด ${plan.maxRooms} ห้อง (ตอนนี้ ${totalRooms}) — อัปเกรดก่อนเพิ่ม`);
          }
          const existing = await tx.room.findMany({ where: { roomTypeId: id }, select: { number: true } });
          let maxN = 0;
          for (const r of existing) {
            const n = parseInt(r.number.split("-").pop() || "0", 10);
            if (!isNaN(n) && n > maxN) maxN = n;
          }
          for (let i = 1; i <= add; i++) {
            await tx.room.create({ data: { propertyId: rt.propertyId, roomTypeId: id, number: `${rt.code}-${String(maxN + i).padStart(2, "0")}` } });
          }
        } else if (newCount < oldCount) {
          // กันลดต่ำกว่าจำนวนที่ขายไปแล้ว
          const oversold = await tx.availability.findFirst({ where: { roomTypeId: id, date: { gte: today }, unitsSold: { gt: newCount } } });
          if (oversold) throw new PatchError(`ลดไม่ได้ — วันที่ ${oversold.date} มีจองแล้ว ${oversold.unitsSold} ห้อง`);

          // ห้องที่ลบได้ = ไม่ occupied
          const removable = await tx.room.findMany({ where: { roomTypeId: id, status: { not: "occupied" } }, orderBy: { number: "desc" } });
          const remove = oldCount - newCount;
          if (removable.length < remove) throw new PatchError("ลดไม่ได้ — มีห้องที่มีแขกพักอยู่");
          const ids = removable.slice(0, remove).map((r) => r.id);
          // เคลียร์การผูกห้องกับการจอง (ถ้ามี) ก่อนลบ
          await tx.reservationRoom.updateMany({ where: { roomId: { in: ids } }, data: { roomId: null } });
          await tx.room.deleteMany({ where: { id: { in: ids } } });
        }

        // อัปเดตสต็อกปฏิทินวันข้างหน้า = จำนวนห้องใหม่
        await tx.availability.updateMany({ where: { roomTypeId: id, date: { gte: today } }, data: { unitsTotal: newCount } });
      }
    });

    pushChannexSafe(rt.propertyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PatchError) return NextResponse.json({ ok: false, message: e.message }, { status: 409 });
    return NextResponse.json({ ok: false, message: "แก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}

// ลบประเภทห้อง (เฉพาะที่ไม่มีประวัติการจอง)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const rt = await prisma.roomType.findFirst({ where: { id, property: { orgId: user.orgId } }, select: { id: true, propertyId: true } });
  if (!rt) return NextResponse.json({ ok: false, message: "ไม่พบประเภทห้อง" }, { status: 404 });

  const bookings = await prisma.reservationRoom.count({ where: { roomTypeId: id } });
  if (bookings > 0) {
    return NextResponse.json({ ok: false, message: "ลบไม่ได้ — มีประวัติการจองผูกกับประเภทห้องนี้" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.room.deleteMany({ where: { roomTypeId: id } }),
    prisma.roomType.delete({ where: { id } }), // cascade: availability, icalFeed, channelMapping
  ]);
  pushChannexSafe(rt.propertyId);
  return NextResponse.json({ ok: true });
}

class PatchError extends Error {}
