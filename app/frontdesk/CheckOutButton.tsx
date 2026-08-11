"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function CheckOutButton({ reservationId, lang = "th" }: { reservationId: string; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (!confirm(lang === "en" ? "Check out this booking? The room will be set to 'needs cleaning'." : "เช็คเอาต์การจองนี้? ห้องจะถูกตั้งเป็น 'รอทำความสะอาด'")) return;
    setBusy(true);
    const res = await fetch(`/api/reservations/${reservationId}/checkout`, { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (d.ok) router.refresh();
    else alert(d.message ?? "เช็คเอาต์ไม่สำเร็จ");
  }

  return (
    <button className="btn btn-ghost" onClick={checkout} disabled={busy} style={{ padding: "6px 14px", color: "var(--primary)" }}>
      {busy ? "..." : t("fd.checkout")}
    </button>
  );
}
