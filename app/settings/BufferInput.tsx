"use client";

import { useState } from "react";

export default function BufferInput({ id, value }: { id: string; value: number }) {
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(nv: number) {
    if (nv === value) return;
    setSaving(true);
    setSaved(false);
    await fetch(`/api/room-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otaBuffer: nv }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        min={0}
        max={50}
        value={v}
        onChange={(e) => setV(Math.max(0, Number(e.target.value)))}
        onBlur={() => save(v)}
        style={{ width: 64, padding: "4px 8px" }}
      />
      {saving && <span className="muted" style={{ fontSize: 12 }}>...</span>}
      {saved && <span style={{ color: "var(--green)", fontSize: 12 }}>✓</span>}
    </div>
  );
}
