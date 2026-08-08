"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddRoomTypeForm({ roomsUsed, maxRooms }: { roomsUsed: number; maxRooms: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [units, setUnits] = useState(1);
  const [price, setPrice] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const remaining = maxRooms - roomsUsed;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/room-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, units, price }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setMsg({ ok: true, text: `✅ เพิ่ม "${name}" แล้ว` });
      setName("");
      setCode("");
      router.refresh();
    } else {
      setMsg({ ok: false, text: `❌ ${data.message}` });
    }
  }

  return (
    <form onSubmit={submit} style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>+ เพิ่มประเภทห้อง <span className="muted" style={{ fontWeight: 400 }}>(เพิ่มได้อีก {remaining} ห้อง)</span></div>
      <div className="row-2" style={{ marginBottom: 12 }}>
        <div>
          <label>ชื่อประเภท</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Deluxe" required />
        </div>
        <div>
          <label>รหัส (เช่น DLX)</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DLX" required />
        </div>
      </div>
      <div className="row-2" style={{ marginBottom: 12 }}>
        <div>
          <label>จำนวนห้อง</label>
          <input type="number" min={1} max={remaining} value={units} onChange={(e) => setUnits(Number(e.target.value))} />
        </div>
        <div>
          <label>ราคา/คืน (บาท)</label>
          <input type="number" min={0} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
      </div>
      <button className="btn" disabled={busy || remaining <= 0}>
        {busy ? "กำลังเพิ่ม..." : remaining <= 0 ? "ถึงลิมิตแพ็กเกจแล้ว" : "เพิ่มประเภทห้อง"}
      </button>
      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </form>
  );
}
