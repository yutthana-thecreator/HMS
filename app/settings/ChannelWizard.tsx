"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  connected: boolean;
  channexPropertyId: string | null;
  roomTypesTotal: number;
  roomTypesMapped: number;
  channelsConnected: number;
};

const OTA_GUIDE = [
  { name: "Booking.com", how: "Booking Extranet → Account → Connectivity provider → ค้นหา \"Channex\" → Connect" },
  { name: "Airbnb", how: "เพิ่ม Airbnb ใน Channex → Login/Authorize (OAuth) → import listing → map ห้อง" },
  { name: "Agoda", how: "Agoda YCS → ขอเปิด XML/Channel Manager → เลือก Channex → map ห้อง" },
];

function StepDot({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <div
      style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 14,
        background: done ? "var(--green)" : active ? "var(--primary)" : "var(--border)",
        color: done || active ? "#fff" : "var(--muted)",
      }}
    >
      {done ? "✓" : n}
    </div>
  );
}

export default function ChannelWizard() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const d = await (await fetch("/api/channex/status")).json();
    if (d.ok) setSt(d);
  }
  useEffect(() => { load(); }, []);

  async function onboard() {
    setBusy("onboard");
    setMsg(null);
    const d = await (await fetch("/api/channex/onboard", { method: "POST" })).json();
    setBusy("");
    if (d.ok) {
      setMsg({ ok: true, text: `✅ เชื่อมสำเร็จ — สร้าง/map ${d.roomTypesMapped ?? d.provisioned}/${d.roomTypes} ห้อง + push ห้องว่าง/ราคา + เปิดรับการจองแล้ว` });
      load();
    } else setMsg({ ok: false, text: d.message });
  }

  async function push() {
    setBusy("push");
    setMsg(null);
    const d = await (await fetch("/api/channex/push", { method: "POST" })).json();
    setBusy("");
    setMsg(d.ok ? { ok: true, text: `✅ push ${d.updates} รายการ (ห้องว่าง+ราคา) ไปทุก OTA` } : { ok: false, text: d.message });
  }

  if (!st) return <p className="muted">กำลังโหลด...</p>;
  if (!st.configured) return <div className="alert error">ระบบยังไม่ได้ตั้งค่า Channel Manager — ติดต่อผู้ดูแลระบบ</div>;

  const step1Done = st.connected && st.roomTypesMapped > 0;
  const step2Done = st.channelsConnected > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* STEP 1 */}
      <div style={{ display: "flex", gap: 14 }}>
        <StepDot n={1} done={step1Done} active={!step1Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>เชื่อมระบบกับ Channel Manager</div>
          {step1Done ? (
            <div className="muted" style={{ fontSize: 14 }}>
              ✓ เชื่อมแล้ว · map {st.roomTypesMapped}/{st.roomTypesTotal} ห้อง · เปิดรับการจอง OTA · push ห้องว่าง/ราคาอัตโนมัติ
            </div>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
                กดปุ่มเดียว — ระบบจะสร้างที่พักใน Channel Manager + ส่งห้อง/ราคา + เปิดรับการจองให้อัตโนมัติ
              </div>
              <button className="btn" onClick={onboard} disabled={!!busy}>
                {busy === "onboard" ? "กำลังเชื่อม..." : "🚀 เริ่มเชื่อม Channel Manager"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* STEP 2 */}
      <div style={{ display: "flex", gap: 14, opacity: step1Done ? 1 : 0.45 }}>
        <StepDot n={2} done={step2Done} active={step1Done && !step2Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            เชื่อม OTA (Booking.com / Airbnb / Agoda){step2Done && <span style={{ color: "var(--green)" }}> — เชื่อมแล้ว {st.channelsConnected} เว็บ ✓</span>}
          </div>
          <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
            ขั้นนี้ทำใน Channel Manager (เพราะบัญชี OTA เป็นของโรงแรม ต้อง authorize เอง):
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {OTA_GUIDE.map((o) => (
              <div key={o.name} style={{ fontSize: 13, padding: "8px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <b>{o.name}:</b> <span className="muted">{o.how}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            * ต้องมี listing บน OTA อยู่แล้ว และใช้ Channel Manager แบบ production
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div style={{ display: "flex", gap: 14, opacity: step1Done ? 1 : 0.45 }}>
        <StepDot n={3} done={step1Done} active={step1Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>พร้อมขาย — sync อัตโนมัติ</div>
          <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
            จองตรง/ยกเลิก → push ห้องว่าง/ราคาไปทุก OTA อัตโนมัติ · จองจาก OTA → เข้าระบบ + ตัดห้องกัน overbooking
          </div>
          {step1Done && (
            <button className="btn btn-ghost" onClick={push} disabled={!!busy} style={{ color: "var(--primary)" }}>
              {busy === "push" ? "กำลัง push..." : "🔄 Push ห้องว่าง/ราคาเดี๋ยวนี้"}
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </div>
  );
}
