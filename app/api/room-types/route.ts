import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { rangeDates, todayStr, isWeekend } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รายการประเภทห้อง + ช่องทาง (เฉพาะของ org ที่ล็อกอิน)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const property = await prisma.property.findFirst({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "asc" },
  });
  if (!property) return NextResponse.json({ property: null, roomTypes: [], channels: [] });

  const [roomTypes, channels] = await Promise.all([
    prisma.roomType.findMany({
      where: { propertyId: property.id },
      orderBy: { basePrice: "asc" },
      select: { id: true, name: true, code: true, basePrice: true, maxOccupancy: true, _count: { select: { rooms: true } } },
    }),
    prisma.channel.findMany({
      where: { propertyId: property.id, isActive: true },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return NextResponse.json({
    property: { id: property.id, name: property.name, currency: property.currency },
    roomTypes,
    channels,
  });
}

// เพิ่มประเภทห้องใหม่ (+ ห้องจริง + availability 120 วัน) — บังคับ limit ตามแพ็กเกจ
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  const units = Math.max(1, Math.min(200, Number(body.units ?? 1)));
  const price = Math.max(0, Number(body.price ?? 0));

  if (!name || !code) {
    return NextResponse.json({ ok: false, message: "กรอกชื่อและรหัสห้อง" }, { status: 400 });
  }

  const property = await prisma.property.findFirst({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "asc" },
  });
  if (!property) return NextResponse.json({ ok: false, message: "ไม่พบที่พัก" }, { status: 400 });

  // ---- บังคับ limit ตามแพ็กเกจ ----
  const plan = getPlan(user.organization.plan);
  const currentRooms = await prisma.room.count({ where: { property: { orgId: user.orgId } } });
  if (currentRooms + units > plan.maxRooms) {
    return NextResponse.json(
      {
        ok: false,
        code: "LIMIT",
        message: `แพ็กเกจ ${plan.name} จำกัด ${plan.maxRooms} ห้อง (ตอนนี้ ${currentRooms}) — อัปเกรดเพื่อเพิ่มห้อง`,
      },
      { status: 402 },
    );
  }

  const dup = await prisma.roomType.findFirst({ where: { propertyId: property.id, code } });
  if (dup) return NextResponse.json({ ok: false, message: `รหัส ${code} ถูกใช้แล้ว` }, { status: 409 });

  const dates = rangeDates(todayStr(property.timezone), 120);

  await prisma.$transaction(async (tx) => {
    const rt = await tx.roomType.create({
      data: { propertyId: property.id, name, code, basePrice: price, maxOccupancy: 2 },
    });
    for (let i = 1; i <= units; i++) {
      await tx.room.create({
        data: { propertyId: property.id, roomTypeId: rt.id, number: `${code}-${String(i).padStart(2, "0")}` },
      });
    }
    await tx.availability.createMany({
      data: dates.map((d) => ({
        propertyId: property.id,
        roomTypeId: rt.id,
        date: d,
        unitsTotal: units,
        unitsSold: 0,
        stopSell: false,
        price: isWeekend(d) ? Math.round(price * 1.25) : price,
      })),
    });
  });

  return NextResponse.json({ ok: true });
}
