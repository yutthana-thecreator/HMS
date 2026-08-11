"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomStatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    setBusy(true);
    const res = await fetch(`/api/rooms/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.ok) router.refresh();
    else alert(d.message ?? "อัปเดตไม่สำเร็จ");
  }

  if (status === "occupied") return <span className="muted" style={{ fontSize: 12 }}>มีแขกพัก</span>;

  const btn = { padding: "5px 12px", fontSize: 13 } as const;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {status === "dirty" && (
        <button className="btn" onClick={() => set("clean")} disabled={busy} style={btn}>✓ ทำความสะอาดแล้ว</button>
      )}
      {status === "clean" && (
        <button className="btn btn-ghost" onClick={() => set("dirty")} disabled={busy} style={btn}>แจ้งสกปรก</button>
      )}
      {status === "out_of_order" ? (
        <button className="btn btn-ghost" onClick={() => set("clean")} disabled={busy} style={{ ...btn, color: "var(--green)" }}>เปิดใช้งาน</button>
      ) : (
        <button className="btn btn-ghost" onClick={() => set("out_of_order")} disabled={busy} style={{ ...btn, color: "var(--red)" }}>ปิดปรับปรุง</button>
      )}
    </span>
  );
}
