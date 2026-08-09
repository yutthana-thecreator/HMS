"use client";

import { useState } from "react";

type Prop = { id: string; title: string };

export default function ChannexPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; properties?: Prop[]; base?: string } | null>(null);

  async function test() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/channex/test");
    const data = await res.json();
    setBusy(false);
    setResult(data);
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        เชื่อม Channel Manager (Channex) เพื่อ sync ห้องว่าง/ราคา + รับการจองจาก OTA แบบเรียลไทม์
      </p>

      <button className="btn" onClick={test} disabled={busy}>
        {busy ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ Channex"}
      </button>

      {result && !result.ok && (
        <div className="alert error" style={{ marginTop: 12 }}>❌ {result.message}</div>
      )}

      {result && result.ok && (
        <div className="alert success" style={{ marginTop: 12 }}>
          ✅ เชื่อมต่อสำเร็จ ({result.base})<br />
          {result.properties && result.properties.length > 0 ? (
            <>
              <b>Property ในบัญชี Channex:</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {result.properties.map((p) => (
                  <li key={p.id}>
                    {p.title} — <span className="mono">{p.id}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            "ยังไม่มี property ในบัญชี Channex — สร้างก่อนใน Channex dashboard"
          )}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 13 }} className="muted">
        <b>ตั้งค่า (ทำครั้งเดียว):</b>
        <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>สมัคร sandbox: <span className="mono">staging.channex.io</span></li>
          <li>Settings → API Keys → สร้าง key</li>
          <li>เอา key มาให้ผมตั้งใน Vercel (ADMIN) แล้วกดปุ่มทดสอบด้านบน</li>
        </ol>
      </div>
    </div>
  );
}
