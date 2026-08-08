// ============================================================================
//  Concurrency / Anti-Overbooking Test
//  ยิงคำขอจองพร้อมกันจำนวนมากใส่ห้องที่มีจำกัด → พิสูจน์ว่าไม่มี overbooking
//  รัน: npm run test:concurrency
// ============================================================================
import { PrismaClient } from "@prisma/client";
import { createReservation, SoldOutError } from "../lib/reservations";
import { addDays, todayStr } from "../lib/dates";

const prisma = new PrismaClient();

type ScenarioResult = {
  capacity: number;
  attempts: number;
  success: number;
  soldOut: number;
  errors: number;
  finalUnitsSold: number;
  reservationRows: number;
  pass: boolean;
};

async function runScenario(
  propertyId: string,
  roomTypeId: string,
  date: string,
  capacity: number,
  attempts: number,
): Promise<ScenarioResult> {
  const checkout = addDays(date, 1);

  // เตรียมสต็อก: ว่าง = capacity, ขายแล้ว 0
  await prisma.availability.update({
    where: { roomTypeId_date: { roomTypeId, date } },
    data: { unitsTotal: capacity, unitsSold: 0, stopSell: false, price: 1000 },
  });

  // ยิงพร้อมกันทั้งหมด
  const jobs = Array.from({ length: attempts }, (_, i) =>
    createReservation({
      propertyId,
      roomTypeId,
      checkinDate: date,
      checkoutDate: checkout,
      guestName: `Load Test #${i + 1}`,
    }),
  );

  const settled = await Promise.allSettled(jobs);

  let success = 0;
  let soldOut = 0;
  let errors = 0;
  const createdIds: string[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      success++;
      createdIds.push(s.value.reservation.id);
    } else if (s.reason instanceof SoldOutError) {
      soldOut++;
    } else {
      errors++;
      console.error("   ⚠️ unexpected error:", s.reason?.message ?? s.reason);
    }
  }

  // ตรวจสถานะจริงในฐานข้อมูล
  const avail = await prisma.availability.findUnique({
    where: { roomTypeId_date: { roomTypeId, date } },
  });
  const reservationRows = await prisma.reservationRoom.count({
    where: { roomTypeId, checkinDate: date },
  });

  const finalUnitsSold = avail?.unitsSold ?? -1;

  // เกณฑ์ผ่าน: ขายได้ = capacity พอดี, ไม่เกิน total, และจำนวน booking ตรงกับที่ขาย
  const pass =
    success === capacity &&
    finalUnitsSold === capacity &&
    finalUnitsSold <= (avail?.unitsTotal ?? 0) &&
    reservationRows === capacity;

  // cleanup: ลบ booking ที่เทสสร้าง + คืนสต็อก
  if (createdIds.length) {
    await prisma.reservation.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.guest.deleteMany({ where: { reservations: { none: {} } } });
  }

  return { capacity, attempts, success, soldOut, errors, finalUnitsSold, reservationRows, pass };
}

async function main() {
  const property = await prisma.property.findFirst();
  const roomType = await prisma.roomType.findFirst({
    where: { code: "STD" },
  });

  if (!property || !roomType) {
    console.error("❌ ยังไม่มีข้อมูล — รัน `npm run db:reset` ก่อน");
    process.exit(1);
  }

  const testDate = addDays(todayStr(property.timezone), 45);
  const originalTotal = 5;

  console.log("═".repeat(64));
  console.log("  🧪 ANTI-OVERBOOKING CONCURRENCY TEST");
  console.log(`  โรงแรม: ${property.name} · ประเภทห้อง: ${roomType.name}`);
  console.log(`  วันที่ทดสอบ: ${testDate}`);
  console.log("═".repeat(64));

  const scenarios = [
    { capacity: 1, attempts: 100 },
    { capacity: 3, attempts: 100 },
    { capacity: 5, attempts: 200 },
  ];

  const results: ScenarioResult[] = [];
  for (const sc of scenarios) {
    console.log(`\n▶ ยิง ${sc.attempts} คำขอพร้อมกัน · ห้องว่างจริง ${sc.capacity} ห้อง`);
    const r = await runScenario(property.id, roomType.id, testDate, sc.capacity, sc.attempts);
    results.push(r);
    console.log(`   จองสำเร็จ : ${r.success}`);
    console.log(`   ห้องเต็ม  : ${r.soldOut}`);
    console.log(`   error     : ${r.errors}`);
    console.log(`   unitsSold ในDB: ${r.finalUnitsSold} / total ${r.capacity}`);
    console.log(`   ${r.pass ? "✅ PASS — ไม่มี overbooking" : "❌ FAIL — พบความผิดปกติ!"}`);
  }

  // คืนค่า availability กลับสภาพ seed
  await prisma.availability.update({
    where: { roomTypeId_date: { roomTypeId: roomType.id, date: testDate } },
    data: { unitsTotal: originalTotal, unitsSold: 0, stopSell: false },
  });

  const allPass = results.every((r) => r.pass);
  console.log("\n" + "═".repeat(64));
  console.log(`  สรุป: ${allPass ? "✅ ผ่านทุกสถานการณ์ — ระบบกัน overbooking ได้จริง" : "❌ มีสถานการณ์ที่ล้มเหลว"}`);
  console.log("═".repeat(64));

  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
