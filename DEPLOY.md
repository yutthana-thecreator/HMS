# 🌐 ขึ้นเว็บจริงด้วย Vercel

คู่มือ deploy ระบบนี้ขึ้น production บน Vercel (Next.js + PostgreSQL)

> ⚠️ **สำคัญ:** SQLite (`dev.db`) ใช้บน Vercel ไม่ได้ เพราะเป็น serverless (ไฟล์ไม่ถูกเก็บถาวร)
> ต้องเปลี่ยนไปใช้ **PostgreSQL** ที่ host บนคลาวด์ — โค้ดรองรับแล้ว แก้แค่ config

---

## ภาพรวม 5 ขั้น

```mermaid
flowchart LR
    A[1. สร้าง<br/>Postgres คลาวด์] --> B[2. แก้ schema<br/>→ postgresql]
    B --> C[3. สร้างตาราง<br/>db push]
    C --> D[4. push โค้ด<br/>ขึ้น GitHub]
    D --> E[5. Import เข้า Vercel<br/>+ env + deploy]
```

---

## ขั้น 1 — สร้างโปรเจกต์ Supabase (ฟรี)

1. ไปที่ **supabase.com** → **New project**
2. ตั้งชื่อ + **Database Password** (จำไว้ให้ดี — ใช้ในขั้นต่อไป) + เลือก region ใกล้ไทย เช่น Singapore (`ap-southeast-1`)
3. รอสร้างเสร็จ ~2 นาที
4. กดปุ่ม **Connect** (บนสุด) → แท็บ **ORMs** → เลือก **Prisma**
   จะได้ connection string 2 เส้น:
   - **Transaction pooler** (port `6543`) → ใช้เป็น `DATABASE_URL` (เหมาะ serverless)
   - **Session pooler** (port `5432`) → ใช้เป็น `DIRECT_URL` (สำหรับ migration/db push)

> เราใช้ Supabase เป็น **Postgres host** ล้วนๆ (ผ่าน Prisma) — ไม่ได้ใช้ Auth/RLS ของ Supabase
> เพราะระบบเรากันข้อมูลข้ามโรงแรมด้วย `orgId` ในโค้ดเองอยู่แล้ว

---

## ขั้น 2 — ตั้งค่า connection ในไฟล์ `.env`

`prisma/schema.prisma` ตั้ง provider เป็น `postgresql` ไว้ให้แล้ว — แค่ใส่ค่าใน `.env`
(แทนที่ `[PASSWORD]` / `[REF]` / `[REGION]` ด้วยค่าจริงจาก Supabase):

```
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

- `DATABASE_URL` = **6543** (transaction pooler) + `?pgbouncer=true` (จำเป็นสำหรับ Prisma)
- `DIRECT_URL` = **5432** (session pooler)

---

## ขั้น 3 — สร้างตารางบน Postgres (ทำครั้งเดียว)

```bash
npx prisma db push
```
(อยากมีข้อมูล demo ให้ทดสอบ) :
```bash
npm run db:seed
```

> โค้ด engine ใช้ SQL มาตรฐาน + transaction → กัน overbooking ทำงานเหมือนเดิมบน Postgres
> (Postgres จะได้ row-level lock ตอน UPDATE ทำให้แข็งแรงกว่า SQLite ด้วยซ้ำ)

---

## ขั้น 4 — push ขึ้น GitHub

```bash
git init
git add .
git commit -m "Hotel Management SaaS — ready for Vercel"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

> `.env` ถูก gitignore ไว้แล้ว (ความลับไม่ขึ้น git) — ตั้งค่าจริงใน Vercel แทน

---

## ขั้น 5 — Deploy บน Vercel

1. เข้า **vercel.com** → **Add New → Project** → เลือก repo
2. Vercel ตรวจเจอ Next.js อัตโนมัติ (ไม่ต้องตั้ง build command เพิ่ม)
3. ไปที่ **Settings → Environment Variables** ใส่:
   - `DATABASE_URL` = pooled connection string
   - `DIRECT_URL` = direct connection string
   (ตั้งให้ครบทั้ง Production / Preview / Development)
4. กด **Deploy**

เสร็จ! ได้ URL `https://<project>.vercel.app` 🎉

---

## ✅ ทำไมโค้ดพร้อมอยู่แล้ว

- `postinstall: prisma generate` → Vercel gen Prisma client ให้ตอน build อัตโนมัติ
- `lib/db.ts` ใช้ singleton → reuse connection บน serverless
- Cookie ตั้ง `secure` อัตโนมัติเมื่อ production (Vercel เป็น HTTPS)
- `middleware.ts` รันบน Edge — กันหน้าไม่ล็อกอิน

---

## 📌 หลัง go-live ควรทำต่อ

- **Custom domain** — ผูกโดเมนตัวเองใน Vercel (Settings → Domains)
- **เปลี่ยนจาก `db push` → migrations** เพื่อประวัติการแก้ schema:
  ```bash
  npx prisma migrate dev --name init     # สร้าง migration แรก (ครั้งเดียว)
  ```
  แล้วตั้ง build command บน Vercel เป็น `prisma migrate deploy && next build`
- **อย่า seed ข้อมูล demo บน production จริง** (seed มีไว้ทดสอบ)
- ต่อ **Stripe** เก็บเงินจริง (ดู [docs/07](docs/07-saas-multitenancy.md))
- เปิด **backup อัตโนมัติ** ของ Postgres (Neon/Supabase มีให้)

---

## 💰 ค่าใช้จ่ายเริ่มต้น (โดยประมาณ)
- Vercel Hobby: **ฟรี** (เหมาะเริ่มต้น / เดโม) — ขึ้น Pro $20/เดือนเมื่อมีทราฟฟิกจริง
- Neon/Supabase free tier: **ฟรี** (0.5GB) — พอสำหรับหลายสิบโรงแรมช่วงแรก
