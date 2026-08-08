"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlanSelector({ planId, current }: { planId: string; current: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function choose() {
    setBusy(true);
    const res = await fetch("/api/billing/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) router.refresh();
    else alert(data.message ?? "เปลี่ยนแพ็กเกจไม่สำเร็จ");
  }

  if (current) {
    return <button className="btn btn-block" disabled style={{ background: "var(--text-muted)" }}>แพ็กเกจปัจจุบัน</button>;
  }
  return (
    <button className="btn btn-block" onClick={choose} disabled={busy}>
      {busy ? "..." : "เลือกแพ็กเกจนี้"}
    </button>
  );
}
