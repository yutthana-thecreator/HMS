// เชื่อมโรงแรมกับ Channex + push ห้องว่าง (us → OTA)
import { prisma } from "./db";
import {
  channexConfigured,
  channexCreateRoomType,
  channexCreateRatePlan,
  channexUpdateAvailability,
} from "./channex";
import { rangeDates, todayStr } from "./dates";

/** เชื่อม property เรากับ Channex + auto สร้าง room type/rate plan ที่ยังไม่ได้ map + push ห้องว่าง */
export async function connectChannex(orgId: string, channexPropertyId: string) {
  const property = await prisma.property.findFirst({ where: { orgId }, orderBy: { createdAt: "asc" } });
  if (!property) throw new Error("ไม่พบที่พัก");

  await prisma.property.update({ where: { id: property.id }, data: { channexPropertyId } });

  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId: property.id },
    include: { _count: { select: { rooms: true } } },
  });

  let provisioned = 0;
  for (const rt of roomTypes) {
    if (rt.channexRoomTypeId) continue;
    const cRt = await channexCreateRoomType(channexPropertyId, rt.name, rt._count.rooms || 1, rt.maxOccupancy);
    const cRp = await channexCreateRatePlan(channexPropertyId, cRt, `${rt.name} Rate`, property.currency, rt.basePrice);
    await prisma.roomType.update({
      where: { id: rt.id },
      data: { channexRoomTypeId: cRt, channexRatePlanId: cRp },
    });
    provisioned++;
  }

  await pushChannexAvailability(property.id);
  return { roomTypes: roomTypes.length, provisioned };
}

/** push ห้องว่างปัจจุบันไป Channex (เรียกหลังจอง/ยกเลิก หรือกดปุ่ม) */
export async function pushChannexAvailability(propertyId: string, days = 120): Promise<number> {
  if (!channexConfigured()) return 0;
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property?.channexPropertyId) return 0;

  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId, channexRoomTypeId: { not: null } },
  });
  if (roomTypes.length === 0) return 0;

  const dates = rangeDates(todayStr(property.timezone), days);
  const avail = await prisma.availability.findMany({ where: { propertyId, date: { in: dates } } });

  const updates: { propertyId: string; roomTypeId: string; date: string; availability: number }[] = [];
  for (const rt of roomTypes) {
    for (const a of avail) {
      if (a.roomTypeId !== rt.id) continue;
      const free = a.stopSell ? 0 : Math.max(0, a.unitsTotal - a.unitsSold);
      updates.push({
        propertyId: property.channexPropertyId,
        roomTypeId: rt.channexRoomTypeId!,
        date: a.date,
        availability: free,
      });
    }
  }

  for (let i = 0; i < updates.length; i += 200) {
    await channexUpdateAvailability(updates.slice(i, i + 200));
  }
  return updates.length;
}

/** push แบบไม่บล็อก (fire-and-forget) หลังจอง/ยกเลิก */
export function pushChannexSafe(propertyId: string): void {
  pushChannexAvailability(propertyId).catch((e) => console.error("channex push failed:", (e as Error).message));
}
