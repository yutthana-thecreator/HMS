"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ id, otaLocked = false }: { id: string; otaLocked?: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // การจองจาก OTA → ห้ามยกเลิกในระบบเรา (เสี่ยง overbooking) ต้องยกเลิกที่ OTA
  if (otaLocked) {
    return (
      <span
        className="muted"
        style={{ fontSize: 13, whiteSpace: "nowrap" }}
        title="การจองนี้มาจาก OTA — ต้องยกเลิกที่ OTA เท่านั้น มิฉะนั้นเสี่ยง overbooking"
      >
        🔒 ยกเลิกที่ OTA
      </span>
    );
  }

  async function cancel() {
    if (!confirm("ยืนยันยกเลิกการจองนี้? ระบบจะคืนห้องกลับเข้าสต็อก")) return;
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!data.ok) {
      alert(data.message || "ยกเลิกไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" onClick={cancel} disabled={busy}>
      {busy ? "..." : "ยกเลิก"}
    </button>
  );
}
