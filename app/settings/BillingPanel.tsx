"use client";

import { useState } from "react";

export default function BillingPanel({ hasBilling }: { hasBilling: boolean }) {
  const [busy, setBusy] = useState(false);

  async function openPortal() {
    setBusy(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setBusy(false);
    alert(data.message ?? "เปิดหน้าจัดการไม่สำเร็จ");
  }

  if (!hasBilling) return null;
  return (
    <button className="btn btn-ghost" onClick={openPortal} disabled={busy} style={{ color: "var(--primary)" }}>
      {busy ? "..." : "💳 จัดการการชำระเงิน / ยกเลิก"}
    </button>
  );
}
