"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

const PLAN_IDS: [string, string][] = [["starter", "Starter"], ["pro", "Pro"], ["enterprise", "Enterprise"]];

export default function AdminOrgActions({ id, name, plan, suspended, lang = "th" }: { id: string; name: string; plan: string; suspended: boolean; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(plan);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch(`/api/admin/orgs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.ok) router.refresh();
    else alert(d.message || t("common.failed"));
  }

  function removeOrg() {
    const c1 = lang === "th"
      ? `⚠️ ลบโรงแรม “${name}” ถาวร?\n\nจะลบข้อมูลทั้งหมด (การจอง/ห้อง/ผู้ใช้) — กู้คืนไม่ได้!`
      : `⚠️ Permanently delete hotel “${name}”?\n\nThis removes all data (bookings/rooms/users) — cannot be undone!`;
    const c2 = lang === "th"
      ? `ยืนยันอีกครั้ง — ลบ “${name}” จริงหรือไม่?`
      : `Confirm again — really delete “${name}”?`;
    if (!confirm(c1)) return;
    if (!confirm(c2)) return;
    call("delete");
  }

  const btn = { padding: "4px 8px", fontSize: 12 } as const;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ padding: "4px 6px", fontSize: 12 }}>
        {PLAN_IDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => call("setPlan", { plan: sel })}>{t("aoa.setPlan")}</button>
      <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => call("extend", { days: 30 })}>{t("aoa.extend30")}</button>
      {suspended ? (
        <button className="btn" style={{ ...btn, background: "var(--green)" }} disabled={busy} onClick={() => call("unsuspend")}>{t("aoa.enable")}</button>
      ) : (
        <button className="btn btn-ghost" style={{ ...btn, color: "var(--red)" }} disabled={busy} onClick={() => { if (confirm(t("aoa.confirmSuspend"))) call("suspend"); }}>{t("aoa.suspend")}</button>
      )}
      <button className="btn btn-ghost" style={{ ...btn, color: "var(--red)", borderColor: "var(--red)" }} disabled={busy} onClick={removeOrg}>{t("aoa.delete")}</button>
    </div>
  );
}
