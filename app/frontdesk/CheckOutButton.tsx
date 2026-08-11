"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckOutButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (!confirm("เช็คเอาต์การจองนี้? ห้องจะถูกตั้งเป็น 'รอทำความสะอาด'")) return;
    setBusy(true);
    const res = await fetch(`/api/reservations/${reservationId}/checkout`, { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (d.ok) router.refresh();
    else alert(d.message ?? "เช็คเอาต์ไม่สำเร็จ");
  }

  return (
    <button className="btn btn-ghost" onClick={checkout} disabled={busy} style={{ padding: "6px 14px", color: "var(--primary)" }}>
      {busy ? "..." : "เช็คเอาต์"}
    </button>
  );
}
