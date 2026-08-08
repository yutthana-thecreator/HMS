# 🚀 MVP — Multi-tenant SaaS + Anti-Overbooking

โปรแกรมจริงที่รันได้ (Next.js 15 + Prisma + SQLite) — implement **Phase 1 + SaaS layer**:
ระบบสมาชิกหลายโรงแรม (multi-tenant), แพ็กเกจรายเดือน, ปฏิทินห้องว่าง, จอง/ยกเลิก, และ **กัน overbooking แบบ atomic**

---

## ▶️ วิธีรัน (3 ขั้น)

```bash
npm install
```
```bash
npm run db:reset
```
```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000**

> `db:reset` = สร้างตาราง (prisma db push) + ใส่ข้อมูลตัวอย่าง (1 โรงแรม, 3 ประเภทห้อง, 60 วัน)

### 🔑 เข้าสู่ระบบทดลอง (โรงแรม Demo)
```
อีเมล:    owner@example.com
รหัสผ่าน: demo1234
```
หรือกด **"สมัครใช้งานฟรี 14 วัน"** เพื่อสร้างโรงแรมใหม่ของคุณเอง (แยกข้อมูลกันสมบูรณ์)

---

## 🧪 ทดสอบระบบกัน Overbooking

```bash
npm run test:concurrency
```

สคริปต์นี้ยิงคำขอจองพร้อมกัน 100–200 รายการใส่ห้องที่มีจำกัด แล้วตรวจว่า
**ขายได้ไม่เกินจำนวนจริง** เช่น ห้องว่าง 1 → ยิง 100 → สำเร็จ **1** เท่านั้น ที่เหลือได้ "ห้องเต็ม"

ผลที่คาดหวัง:
```
▶ ยิง 100 คำขอพร้อมกัน · ห้องว่างจริง 1 ห้อง
   จองสำเร็จ : 1
   ห้องเต็ม  : 99
   ✅ PASS — ไม่มี overbooking
```

---

## 📁 โครงสร้างโค้ด

```
├── prisma/
│   ├── schema.prisma        โมเดลข้อมูล + Session + แพ็กเกจ
│   └── seed.ts              ข้อมูลตัวอย่าง + user ล็อกอิน
├── lib/
│   ├── db.ts                Prisma client singleton
│   ├── dates.ts             ยูทิลิตี้วันที่ (YYYY-MM-DD)
│   ├── auth.ts              ⭐ Auth (session + scrypt) + tenant context
│   ├── plans.ts             ⭐ แพ็กเกจ + entitlements/limits
│   └── reservations.ts      ⭐ Reservation Engine — กัน overbooking
├── middleware.ts            กันหน้าเว็บที่ยังไม่ล็อกอิน
├── app/
│   ├── login, signup/       เข้าสู่ระบบ / สมัคร (สร้าง tenant)
│   ├── page.tsx             แดชบอร์ด + ปฏิทินห้องว่าง (scoped by org)
│   ├── book/                ฟอร์มสร้างการจอง
│   ├── reservations/        รายการการจอง + ยกเลิก
│   ├── settings/            แพ็กเกจ + usage + เพิ่มประเภทห้อง
│   └── api/                 REST API (auth, reservations, room-types, billing)
└── scripts/
    └── concurrency-test.ts  ทดสอบ anti-overbooking
```

## 🔒 การรับประกันแบบ Multi-tenant (ทดสอบแล้ว)
- แต่ละโรงแรมเห็น**เฉพาะข้อมูลตัวเอง** — query ผูก `orgId` ทุกจุด
- โรงแรม A จองห้องของโรงแรม B ไม่ได้ (API ตอบ **403**)
- เพิ่มห้องเกินลิมิตแพ็กเกจ → **402** พร้อมชวนอัปเกรด

---

## 🔑 หัวใจ Anti-Overbooking อยู่ที่ไหน

ดู [`lib/reservations.ts`](lib/reservations.ts) — ฟังก์ชัน `createReservation`:

1. **Idempotency** — จาก OTA ที่มี `externalRef` เดิม → คืนตัวเดิม ไม่ตัดสต็อกซ้ำ
2. **Atomic guarded UPDATE** — ตัดสต็อกทุกคืนในคำสั่งเดียว มีเงื่อนไข `unitsSold + 1 <= unitsTotal`
3. **Transaction** — ถ้าคืนใดเต็ม → rollback ทั้งก้อน

> อ่านหลักการเชิงลึกใน [docs/03-anti-overbooking.md](docs/03-anti-overbooking.md)

---

## 🔄 สลับเป็น PostgreSQL (production)

1. แก้ `prisma/schema.prisma` → `provider = "postgresql"`
2. แก้ `.env` → `DATABASE_URL="postgresql://..."`
3. `npm run db:push && npm run db:seed`

โค้ด engine ใช้ SQL มาตรฐาน (`UPDATE ... WHERE`) + transaction จึงทำงานได้ทั้งสอง DB
บน Postgres จะได้ row-level `SELECT FOR UPDATE` + `CHECK` constraint เพิ่มความแข็งแรงตามที่ออกแบบไว้

---

## 🧭 ถัดไป (Phase 2–3)

- Channel Adapter (iCal import/export) — [docs/04](docs/04-channel-integration.md)
- Communication Hub (อีเมลยืนยัน + เตือนก่อนเช็คอิน) — [docs/05](docs/05-communication-hub.md)
