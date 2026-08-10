import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import Mermaid from "./Mermaid";

export const dynamic = "force-dynamic";

const DIAGRAMS = [
  {
    id: "flow-overview",
    step: "ภาพที่ 1",
    title: "ภาพรวมระบบ",
    desc: "ทุกช่องทางการจองไหลเข้า “จุดเดียว” (Reservation Engine + ฐานข้อมูลกลาง) แล้วกระจายกลับออก",
    chart: `flowchart TB
  subgraph SRC["ช่องทางจอง"]
    A["OTA: Airbnb / Booking / Agoda"]
    D["จองตรง / หน้าเคาน์เตอร์"]
  end
  A <-->|"Channel Manager เรียลไทม์<br/>+ iCal (สำรอง)"| ADP["Channel Adapter"]
  D --> ENG
  ADP --> ENG["Reservation Engine<br/>กัน Overbooking (atomic)"]
  ENG --> DB[("Supabase / PostgreSQL<br/>ฐานข้อมูลกลางเดียว")]
  DB --> DASH["แดชบอร์ด + ปฏิทินห้องว่าง"]
  DB --> PAY["เก็บเงิน + สถานะชำระ"]
  ENG -->|"push ห้องว่าง(หัก buffer) + ราคา"| ADP
  ENG --> MAIL["อีเมล: ยืนยันจอง + เตือนเช็คอิน"]`,
  },
  {
    id: "flow-overbooking",
    step: "ภาพที่ 2",
    title: "การจอง + กัน Overbooking",
    desc: "ตัดสต็อกแบบ atomic ในทรานแซกชัน — ถ้าห้องเต็มแม้แต่คืนเดียว ยกเลิกทั้งหมด แล้วจึง sync ออก",
    chart: `flowchart TD
  S["รับคำขอจอง (ทุกช่องทาง)"] --> T["เริ่ม Transaction"]
  T --> U["ตัดสต็อกทุกคืน<br/>เงื่อนไข unitsSold+1 ≤ unitsTotal"]
  U --> C{"ครบทุกคืน?"}
  C -->|"ไม่ (บางคืนเต็ม)"| R["Rollback → แจ้ง ห้องเต็ม"]
  C -->|"ใช่"| I["สร้างการจอง"]
  I --> K["Commit"]
  K --> P["push ห้องว่าง(หัก buffer) + ราคา → OTA"]
  K --> M["อีเมลยืนยัน → ลูกค้า"]`,
  },
  {
    id: "flow-channel",
    step: "ภาพที่ 3",
    title: "Channel Manager 2 ทาง (เรียลไทม์)",
    desc: "ขายปุ๊บ → บอกทุก OTA ให้ปิดขายทันที · รับจองจาก OTA เข้าระบบผ่าน webhook (มี secret)",
    chart: `flowchart TB
  subgraph OUT["us → OTA : ขาย แล้วบอกทุกเว็บ"]
    B1["จองตรง / ยกเลิก / แก้ buffer"] --> B2["push availability(หัก buffer) + rate"]
    B2 --> CM1["Channel Manager (Channex)"]
    CM1 --> OTA1["Booking / Airbnb / Agoda<br/>ปิดขายเมื่อเต็ม"]
  end
  subgraph IN["OTA → us : รับจอง"]
    OTA2["ลูกค้าจองบน OTA"] --> CM2["Channex"]
    CM2 -->|"webhook + secret"| WH["ระบบเรา: ตัดห้อง<br/>กัน overbooking"]
    WH --> B2
  end`,
  },
  {
    id: "flow-automation",
    step: "ภาพที่ 4",
    title: "อีเมล + งานอัตโนมัติ (Cron)",
    desc: "อีเมลยืนยันตอนจอง · Cron รายชั่วโมงดึง iCal · Cron รายวันส่งเตือนก่อนเช็คอิน 1 วัน",
    chart: `flowchart TB
  subgraph CRON["Vercel Cron"]
    H["ทุกชั่วโมง"] --> SY["sync iCal จาก OTA"]
    DAY["ทุกวัน 10:00"] --> RM["หาแขกที่เช็คอินพรุ่งนี้"]
  end
  BK["จองสำเร็จ"] --> CF["อีเมลยืนยันจอง (Resend)"]
  RM --> RE["อีเมลเตือนก่อนเช็คอิน"]
  CF --> G["ลูกค้า"]
  RE --> G
  SY --> DB[("ฐานข้อมูลกลาง")]`,
  },
  {
    id: "flow-tenant",
    step: "ภาพที่ 5",
    title: "หลายโรงแรม (Multi-tenant) + Admin",
    desc: "แต่ละโรงแรมสมัคร + login เอง ข้อมูลแยกด้วย orgId · admin เห็นภาพรวมทุกโรงแรม",
    chart: `flowchart TB
  U["สมัคร /signup"] --> O["สร้าง Organization<br/>= 1 โรงแรม"]
  O --> L["Login → session"]
  L --> SC["ทุก query ผูก orgId<br/>แยกข้อมูลแต่ละโรงแรม"]
  SC --> APP["แดชบอร์ด / จอง / ตั้งค่า / Channel Manager"]
  ADM["เจ้าของแพลตฟอร์ม"] --> AP["/admin<br/>ทุกโรงแรม + รายได้ MRR"]`,
  },
];

export default async function FlowPage() {
  if (!(await isAdmin())) redirect("/login");

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Flowchart ระบบ</h1>
          <p className="page-sub">5 ภาพเข้าใจทั้งระบบ</p>
        </div>
        <Link href="/admin" className="btn btn-ghost" style={{ color: "var(--primary)" }}>← กลับ Admin</Link>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {DIAGRAMS.map((d) => (
          <div key={d.id} className="card">
            <div className="card-head" style={{ display: "block", paddingBottom: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{d.step}</div>
              <h2>{d.title}</h2>
              <p className="muted" style={{ fontSize: 14, margin: "2px 0 0" }}>{d.desc}</p>
            </div>
            <div className="card-body">
              <div style={{ background: "#fff", borderRadius: 10, padding: 14, overflowX: "auto", border: "1px solid var(--border)" }}>
                <Mermaid id={d.id} chart={d.chart} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
