"use client";

import { useState } from "react";

export default function EmailPanel({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function test() {
    setBusy(true);
    setMsg(null);
    const d = await (await fetch("/api/email/test", { method: "POST" })).json();
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: "✅ ส่งอีเมลทดสอบแล้ว — เช็คกล่องอีเมลของคุณ (รวม Spam)" } : { ok: false, text: d.message });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        ส่งอีเมลยืนยันการจองให้ลูกค้าอัตโนมัติทันทีที่จองสำเร็จ{" "}
        {configured ? <b style={{ color: "var(--green)" }}>· พร้อมใช้งาน ✓</b> : <b style={{ color: "var(--red)" }}>· ยังไม่ได้ตั้งค่า</b>}
      </p>

      {configured ? (
        <button className="btn" onClick={test} disabled={busy}>
          {busy ? "กำลังส่ง..." : "ส่งอีเมลทดสอบหาตัวเอง"}
        </button>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>
          <b>ตั้งค่า (ทำครั้งเดียว):</b>
          <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>สมัคร <span className="mono">resend.com</span> (ฟรี 3,000 เมล/เดือน)</li>
            <li>API Keys → Create → ก๊อป key</li>
            <li>ส่ง key มาให้ผู้ดูแลตั้งใน Vercel แล้วกดปุ่มทดสอบ</li>
          </ol>
        </div>
      )}

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </div>
  );
}
