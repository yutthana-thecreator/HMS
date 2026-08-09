"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RT = { id: string; name: string; code: string };
type Feed = { id: string; label: string; roomTypeName: string; url: string; lastResult: string | null };

export default function IcalManager({ roomTypes, feeds }: { roomTypes: RT[]; feeds: Feed[] }) {
  const router = useRouter();
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [label, setLabel] = useState("Airbnb");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/ical/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomTypeId, label, url }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setUrl("");
      router.refresh();
    } else setMsg({ ok: false, text: data.message });
  }

  async function removeFeed(id: string) {
    if (!confirm("ลบลิงก์นี้?")) return;
    await fetch(`/api/ical/feeds?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    setMsg(null);
    const res = await fetch("/api/ical/sync", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (data.ok) {
      const t = data.totals;
      setMsg({ ok: true, text: `✅ Sync เสร็จ — นำเข้า ${t.imported} · ยกเลิก ${t.cancelled} · ชน(กัน overbooking) ${t.conflicts}` });
      router.refresh();
    } else setMsg({ ok: false, text: data.message ?? "sync ล้มเหลว" });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 14 }}>ดึงวันที่ถูกจองจาก Airbnb/Booking เข้าระบบ</span>
        <button className="btn" onClick={syncNow} disabled={syncing || feeds.length === 0}>
          {syncing ? "กำลัง Sync..." : "🔄 Sync ตอนนี้"}
        </button>
      </div>

      {/* ลิงก์ที่เพิ่มไว้ */}
      {feeds.length > 0 && (
        <div className="cal-wrap" style={{ marginBottom: 16 }}>
          <table className="table">
            <thead><tr><th>ช่องทาง</th><th>ห้อง</th><th>ผล Sync ล่าสุด</th><th></th></tr></thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={f.id}>
                  <td><span className="badge channel">{f.label}</span></td>
                  <td>{f.roomTypeName}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{f.lastResult ?? "ยังไม่ sync"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => removeFeed(f.id)} style={{ padding: "4px 10px", fontSize: 12 }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* เพิ่มลิงก์ import */}
      <form onSubmit={addFeed} style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>+ เพิ่มลิงก์ iCal จาก OTA</div>
        <div className="row-2" style={{ marginBottom: 10 }}>
          <div>
            <label>ประเภทห้อง</label>
            <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
              {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label>ช่องทาง</label>
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              <option>Airbnb</option><option>Booking.com</option><option>Agoda</option><option>Expedia</option><option>อื่นๆ</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>ลิงก์ .ics จาก OTA</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/....ics" required />
        </div>
        <button className="btn" disabled={busy || !roomTypeId}>{busy ? "กำลังเพิ่ม..." : "เพิ่มลิงก์"}</button>
        {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
      </form>

      {/* Export: ลิงก์ให้ OTA มา subscribe */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>ลิงก์ Export (ให้ OTA มา subscribe เพื่อเห็นว่าเราจองแล้ว)</div>
        {roomTypes.map((rt) => (
          <div key={rt.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 13 }}>
            <span style={{ minWidth: 90, fontWeight: 600 }}>{rt.name}</span>
            <input readOnly value={`${origin}/api/ical/export/${rt.id}`} onFocus={(e) => e.target.select()} style={{ fontSize: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
