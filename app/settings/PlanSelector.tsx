"use client";

import { useState } from "react";

export default function PlanSelector({ planId, current }: { planId: string; current: boolean }) {
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    setBusy(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    if (data.ok && data.url) {
      window.location.href = data.url; // ไปหน้าจ่ายเงิน Stripe
      return;
    }
    setBusy(false);
    alert(data.message ?? "เริ่มการชำระเงินไม่สำเร็จ");
  }

  if (current) {
    return <button className="btn btn-block" disabled style={{ background: "var(--text-muted)" }}>แพ็กเกจปัจจุบัน</button>;
  }
  return (
    <button className="btn btn-block" onClick={subscribe} disabled={busy}>
      {busy ? "กำลังไปหน้าชำระเงิน..." : "เลือกแพ็กเกจนี้"}
    </button>
  );
}
