"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function RoomStatusButton({ id, status, lang = "th" }: { id: string; status: string; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
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

  if (status === "occupied") return <span className="muted" style={{ fontSize: 12 }}>{t("hk.hasGuest")}</span>;

  const btn = { padding: "5px 12px", fontSize: 13 } as const;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {status === "dirty" && (
        <button className="btn" onClick={() => set("clean")} disabled={busy} style={btn}>{t("hk.markClean")}</button>
      )}
      {status === "clean" && (
        <button className="btn btn-ghost" onClick={() => set("dirty")} disabled={busy} style={btn}>{t("hk.markDirty")}</button>
      )}
      {status === "out_of_order" ? (
        <button className="btn btn-ghost" onClick={() => set("clean")} disabled={busy} style={{ ...btn, color: "var(--green)" }}>{t("hk.openRoom")}</button>
      ) : (
        <button className="btn btn-ghost" onClick={() => set("out_of_order")} disabled={busy} style={{ ...btn, color: "var(--red)" }}>{t("hk.closeRoom")}</button>
      )}
    </span>
  );
}
