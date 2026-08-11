"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_IDS: [string, string][] = [["starter", "Starter"], ["pro", "Pro"], ["enterprise", "Enterprise"]];

export default function AdminOrgActions({ id, name, plan, suspended }: { id: string; name: string; plan: string; suspended: boolean }) {
  const router = useRouter();
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
    else alert(d.message || "ไม่สำเร็จ");
  }

  function removeOrg() {
    const typed = prompt(`⚠️ ลบโรงแรมถาวร ลบข้อมูลทั้งหมด (การจอง/ห้อง/ผู้ใช้) กู้คืนไม่ได้!\n\nพิมพ์ชื่อโรงแรมให้ตรงเพื่อยืนยัน:\n${name}`);
    if (typed === null) return;
    if (typed.trim() !== name) { alert("ชื่อไม่ตรง — ยกเลิกการลบ"); return; }
    call("delete");
  }

  const btn = { padding: "4px 8px", fontSize: 12 } as const;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ padding: "4px 6px", fontSize: 12 }}>
        {PLAN_IDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => call("setPlan", { plan: sel })}>ตั้งแพ็ก</button>
      <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => call("extend", { days: 30 })}>+30วัน</button>
      {suspended ? (
        <button className="btn" style={{ ...btn, background: "var(--green)" }} disabled={busy} onClick={() => call("unsuspend")}>เปิดใช้</button>
      ) : (
        <button className="btn btn-ghost" style={{ ...btn, color: "var(--red)" }} disabled={busy} onClick={() => { if (confirm("ระงับโรงแรมนี้? ผู้ใช้จะเข้าระบบไม่ได้")) call("suspend"); }}>ระงับ</button>
      )}
      <button className="btn btn-ghost" style={{ ...btn, color: "var(--red)", borderColor: "var(--red)" }} disabled={busy} onClick={removeOrg}>🗑 ลบ</button>
    </div>
  );
}
