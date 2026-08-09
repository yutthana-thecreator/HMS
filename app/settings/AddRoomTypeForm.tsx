"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ตัวเลือกประเภทห้องมาตรฐาน (ชื่อ + รหัสอัตโนมัติ)
const ROOM_TYPES = [
  { name: "Standard", code: "STD" },
  { name: "Superior", code: "SUP" },
  { name: "Deluxe", code: "DLX" },
  { name: "Junior Suite", code: "JST" },
  { name: "Suite", code: "STE" },
  { name: "Family", code: "FAM" },
  { name: "Twin", code: "TWN" },
  { name: "Triple", code: "TRP" },
  { name: "Studio", code: "STU" },
  { name: "Villa", code: "VIL" },
  { name: "Bungalow", code: "BGL" },
  { name: "Dormitory", code: "DOM" },
];

export default function AddRoomTypeForm({ roomsUsed, maxRooms }: { roomsUsed: number; maxRooms: number }) {
  const router = useRouter();
  const [name, setName] = useState(ROOM_TYPES[0].name);
  const [code, setCode] = useState(ROOM_TYPES[0].code);
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
          <select
            value={name}
            onChange={(e) => {
              const t = ROOM_TYPES.find((x) => x.name === e.target.value);
              setName(e.target.value);
              if (t) setCode(t.code);
            }}
          >
            {ROOM_TYPES.map((t) => (
              <option key={t.code} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>รหัส (แก้ได้)</label>
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
