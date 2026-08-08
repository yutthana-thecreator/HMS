"use client";

import { useEffect, useState } from "react";

type RoomType = { id: string; name: string; code: string; basePrice: number; maxOccupancy: number };
type Channel = { id: string; name: string; type: string };
type Meta = {
  property: { id: string; name: string; currency: string } | null;
  roomTypes: RoomType[];
  channels: Channel[];
};

function addDaysLocal(d: string, n: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export default function BookPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [channelId, setChannelId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(addDaysLocal(today, 1));
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/room-types")
      .then((r) => r.json())
      .then((m: Meta) => {
        setMeta(m);
        if (m.roomTypes[0]) setRoomTypeId(m.roomTypes[0].id);
        const direct = m.channels.find((c) => c.type === "direct");
        if (direct) setChannelId(direct.id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!meta?.property) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: meta.property.id,
          roomTypeId,
          channelId: channelId || null,
          checkinDate: checkin,
          checkoutDate: checkout,
          guestName,
          guestEmail: guestEmail || null,
          guestsCount: guests,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const r = data.reservation;
        setResult({
          ok: true,
          msg: `✅ จองสำเร็จ! รหัส ${r.code} · ${r.rooms[0].roomType.name} · ฿${new Intl.NumberFormat("th-TH").format(r.totalAmount)}`,
        });
        setGuestName("");
        setGuestEmail("");
      } else {
        setResult({ ok: false, msg: `❌ ${data.message}` });
      }
    } catch {
      setResult({ ok: false, msg: "❌ เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  const selected = meta?.roomTypes.find((rt) => rt.id === roomTypeId);

  return (
    <main className="container">
      <h1 className="page-title">สร้างการจอง</h1>
      <p className="page-sub">การจองทุกรายการจะผ่าน Reservation Engine ที่กัน overbooking แบบ atomic</p>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <form className="form-grid" onSubmit={submit}>
            <div>
              <label>ประเภทห้อง</label>
              <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
                {meta?.roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} · ฿{new Intl.NumberFormat("th-TH").format(rt.basePrice)}/คืน · พัก {rt.maxOccupancy} คน
                  </option>
                ))}
              </select>
            </div>

            <div className="row-2">
              <div>
                <label>เช็คอิน</label>
                <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
              </div>
              <div>
                <label>เช็คเอาต์</label>
                <input type="date" value={checkout} min={addDaysLocal(checkin, 1)} onChange={(e) => setCheckout(e.target.value)} />
              </div>
            </div>

            <div>
              <label>ชื่อผู้เข้าพัก</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="เช่น สมชาย ใจดี" required />
            </div>

            <div className="row-2">
              <div>
                <label>อีเมล (ไม่บังคับ)</label>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="guest@email.com" />
              </div>
              <div>
                <label>จำนวนผู้เข้าพัก</label>
                <input type="number" min={1} max={selected?.maxOccupancy ?? 4} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label>ช่องทางการจอง</label>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                {meta?.channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button className="btn" type="submit" disabled={busy || !meta?.property}>
              {busy ? "กำลังจอง..." : "ยืนยันการจอง"}
            </button>

            {result && <div className={`alert ${result.ok ? "success" : "error"}`}>{result.msg}</div>}
          </form>
        </div>
      </div>
    </main>
  );
}
