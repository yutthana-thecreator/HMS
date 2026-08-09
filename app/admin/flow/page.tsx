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
    desc: "ทุกช่องทางการจองไหลเข้า “จุดเดียว” (Reservation Engine + ฐานข้อมูลกลาง)",
    chart: `flowchart TB
  subgraph SRC["ช่องทางจอง"]
    A["Airbnb / Booking / Agoda"]
    D["เว็บจองตรง"]
  end
  A <-->|"iCal / Channel Manager"| ADP["Channel Adapter"]
  D --> ENG
  ADP --> ENG["Reservation Engine<br/>กัน Overbooking"]
  ENG --> DB[("PostgreSQL / Supabase<br/>แหล่งข้อมูลกลางเดียว")]
  ENG --> MSG["แจ้งลูกค้า<br/>Email / LINE / SMS"]
  DB --> DASH["แดชบอร์ด + ปฏิทินห้องว่าง"]`,
  },
  {
    id: "flow-overbooking",
    step: "ภาพที่ 2",
    title: "การจอง + กัน Overbooking",
    desc: "ตัดสต็อกแบบ atomic ในทรานแซกชัน — ถ้าห้องเต็มแม้แต่คืนเดียว ยกเลิกทั้งหมด",
    chart: `flowchart TD
  S["รับคำขอจอง"] --> T["เริ่ม Transaction"]
  T --> U["ตัดสต็อกทุกคืน<br/>เงื่อนไข unitsSold+1 ≤ unitsTotal"]
  U --> C{"ครบทุกคืน?"}
  C -->|"ไม่ (บางคืนเต็ม)"| R["Rollback → แจ้ง ห้องเต็ม"]
  C -->|"ใช่"| I["สร้างการจอง"]
  I --> K["Commit → แจ้งลูกค้า + sync OTA"]`,
  },
  {
    id: "flow-tenant",
    step: "ภาพที่ 3",
    title: "หลายโรงแรม (Multi-tenant) + Admin",
    desc: "แต่ละโรงแรมสมัคร + login เอง ข้อมูลแยกด้วย orgId · admin เห็นภาพรวมทุกโรงแรม",
    chart: `flowchart TB
  U["สมัคร /signup"] --> O["สร้าง Organization<br/>= 1 โรงแรม"]
  O --> L["Login → session"]
  L --> SC["ทุก query ผูก orgId<br/>แยกข้อมูลแต่ละโรงแรม"]
  SC --> APP["แดชบอร์ด / จอง / ตั้งค่า"]
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
          <p className="page-sub">3 ภาพเข้าใจทั้งระบบ</p>
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
