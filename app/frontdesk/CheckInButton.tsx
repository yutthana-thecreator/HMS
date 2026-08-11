"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function CheckInButton({ reservationId, lang = "th", rooms }: { reservationId: string; lang?: Lang; rooms: { id: string; number: string }[] }) {
  const router = useRouter();
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");

  async function checkin() {
    setBusy(true);
    const res = await fetch(`/api/reservations/${reservationId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.ok) router.refresh();
    else alert(d.message ?? "เช็คอินไม่สำเร็จ");
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {rooms.length > 0 ? (
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ padding: "4px 8px", fontSize: 13 }}>
          {rooms.map((r) => <option key={r.id} value={r.id}>{t("common.room")} {r.number}</option>)}
        </select>
      ) : (
        <span className="muted" style={{ fontSize: 12 }}>{t("fd.noFreeRoom")}</span>
      )}
      <button className="btn" onClick={checkin} disabled={busy} style={{ padding: "6px 14px" }}>
        {busy ? "..." : t("fd.checkin")}
      </button>
    </span>
  );
}
