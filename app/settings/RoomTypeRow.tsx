"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomTypeRow({
  id, name, code, units, price, buffer,
}: { id: string; name: string; code: string; units: number; price: number; buffer: number }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [pr, setPr] = useState(String(price));
  const [u, setU] = useState(String(units));
  const [b, setB] = useState(String(buffer));
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = n.trim() !== name || Number(pr) !== price || Number(u) !== units || Number(b) !== buffer;
  const inp = { padding: "5px 8px", fontSize: 13 } as const;

  async function save() {
    setBusy("save"); setMsg(null);
    const d = await (await fetch(`/api/room-types/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, price: Number(pr), units: Number(u), otaBuffer: Number(b) }),
    })).json();
    setBusy("");
    if (d.ok) { setMsg({ ok: true, text: "บันทึกแล้ว ✓" }); router.refresh(); setTimeout(() => setMsg(null), 2000); }
    else setMsg({ ok: false, text: d.message ?? "ไม่สำเร็จ" });
  }

  async function del() {
    if (!confirm(`ลบประเภทห้อง “${name}” และห้องทั้งหมดในประเภทนี้?`)) return;
    setBusy("del"); setMsg(null);
    const d = await (await fetch(`/api/room-types/${id}`, { method: "DELETE" })).json();
    setBusy("");
    if (d.ok) router.refresh();
    else setMsg({ ok: false, text: d.message ?? "ลบไม่สำเร็จ" });
  }

  return (
    <tr>
      <td><input value={n} onChange={(e) => setN(e.target.value)} style={{ ...inp, width: 120 }} /></td>
      <td className="mono">{code}</td>
      <td><input type="number" min={1} value={u} onChange={(e) => setU(e.target.value)} style={{ ...inp, width: 60 }} /></td>
      <td><input type="number" min={0} value={pr} onChange={(e) => setPr(e.target.value)} style={{ ...inp, width: 90 }} /></td>
      <td><input type="number" min={0} value={b} onChange={(e) => setB(e.target.value)} style={{ ...inp, width: 60 }} /></td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button className="btn" onClick={save} disabled={!!busy || !dirty} style={{ padding: "4px 10px", fontSize: 12 }}>
          {busy === "save" ? "..." : "บันทึก"}
        </button>
        <button className="btn btn-ghost" onClick={del} disabled={!!busy} style={{ padding: "4px 10px", fontSize: 12, color: "var(--red)", marginLeft: 6 }}>
          {busy === "del" ? "..." : "ลบ"}
        </button>
        {msg && <div style={{ fontSize: 12, marginTop: 4, color: msg.ok ? "var(--green)" : "var(--red)" }}>{msg.text}</div>}
      </td>
    </tr>
  );
}
