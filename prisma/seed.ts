// Seed ข้อมูลตัวอย่าง: 1 โรงแรม, 3 ประเภทห้อง, ช่องทาง, และ availability 60 วัน
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { rangeDates, todayStr, isWeekend } from "../lib/dates";

const prisma = new PrismaClient();

// แฮชรหัสผ่าน (อัลกอริทึมเดียวกับ lib/auth.ts — คัดลอกไว้เพื่อเลี่ยงการ import next/headers ในสคริปต์)
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const DEMO_EMAIL = "owner@example.com";
const DEMO_PASSWORD = "demo1234";

async function main() {
  console.log("🌱 กำลัง seed ข้อมูล...");

  // ล้างข้อมูลเดิม (เรียงตาม dependency)
  await prisma.reservationRoom.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.channelMapping.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.session.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.property.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "ตัวอย่าง โฮเทล กรุ๊ป",
      plan: "pro",
      planStatus: "active",
    },
  });

  const property = await prisma.property.create({
    data: {
      orgId: org.id,
      name: "Bangkok Riverside Hotel",
      timezone: "Asia/Bangkok",
      currency: "THB",
    },
  });

  // ประเภทห้อง: name, code, จำนวนห้อง, ราคา/คืน, ราคาช่วงสุดสัปดาห์
  const roomTypeDefs = [
    { name: "Standard", code: "STD", units: 5, price: 1200, weekend: 1500, occ: 2 },
    { name: "Deluxe", code: "DLX", units: 3, price: 2200, weekend: 2700, occ: 2 },
    { name: "Suite", code: "STE", units: 1, price: 4500, weekend: 5500, occ: 4 },
  ];

  const dates = rangeDates(todayStr(), 60); // 60 วันข้างหน้า

  for (const def of roomTypeDefs) {
    const rt = await prisma.roomType.create({
      data: {
        propertyId: property.id,
        name: def.name,
        code: def.code,
        maxOccupancy: def.occ,
        basePrice: def.price,
      },
    });

    // ห้องจริง เช่น STD-01..STD-05
    for (let i = 1; i <= def.units; i++) {
      await prisma.room.create({
        data: {
          propertyId: property.id,
          roomTypeId: rt.id,
          number: `${def.code}-${String(i).padStart(2, "0")}`,
        },
      });
    }

    // availability 60 วัน (ราคาสุดสัปดาห์แพงกว่า)
    await prisma.availability.createMany({
      data: dates.map((d) => ({
        propertyId: property.id,
        roomTypeId: rt.id,
        date: d,
        unitsTotal: def.units,
        unitsSold: 0,
        stopSell: false,
        price: isWeekend(d) ? def.weekend : def.price,
      })),
    });
  }

  // ช่องทางการจอง
  await prisma.channel.createMany({
    data: [
      { propertyId: property.id, type: "direct", name: "เว็บจองตรง" },
      { propertyId: property.id, type: "channel_manager", name: "Booking.com" },
      { propertyId: property.id, type: "ical", name: "Airbnb" },
      { propertyId: property.id, type: "channel_manager", name: "Agoda" },
    ],
  });

  // ผู้ใช้ตัวอย่างสำหรับล็อกอิน
  await prisma.appUser.create({
    data: {
      orgId: org.id,
      name: "เจ้าของโรงแรม (Demo)",
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: "owner",
    },
  });

  const totalRooms = roomTypeDefs.reduce((s, d) => s + d.units, 0);
  console.log(`✅ เสร็จ: 1 โรงแรม, ${roomTypeDefs.length} ประเภทห้อง, ${totalRooms} ห้อง, availability ${dates.length} วัน`);
  console.log(`\n🔑 เข้าสู่ระบบทดลอง:`);
  console.log(`   อีเมล:    ${DEMO_EMAIL}`);
  console.log(`   รหัสผ่าน: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
