"use client";

import { useState } from "react";

export default function SendConfirmationButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    const d = await (await fetch(`/api/reservations/${id}/send-confirmation`, { method: "POST" })).json();
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: "✅ ส่งอีเมลยืนยันแล้ว" } : { ok: false, text: d.message || "ส่งไม่สำเร็จ" });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-ghost" onClick={send} disabled={busy} style={{ color: "var(--primary)" }}>
        {busy ? "กำลังส่ง..." : "✉️ ส่งอีเมลยืนยัน"}
      </button>
      {msg && <span style={{ fontSize: 13, color: msg.ok ? "var(--green)" : "var(--red)" }}>{msg.text}</span>}
    </span>
  );
}
