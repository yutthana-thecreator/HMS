"use client";

import { useEffect, useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type RoomType = { id: string; name: string; code: string; basePrice: number; maxOccupancy: number; _count?: { rooms: number } };
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

// ย่อรูปฝั่ง client ก่อนส่ง (กันไฟล์ใหญ่)
function resizeImage(file: File, maxDim = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [guestPhone, setGuestPhone] = useState("");
  const [guests, setGuests] = useState(1);
  const [units, setUnits] = useState(1);
  const [deposit, setDeposit] = useState("");
  const [idCard, setIdCard] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [lang, setLang] = useState<Lang>("th");
  const t = makeT(lang);

  useEffect(() => {
    setLang(document.cookie.includes("lang=en") ? "en" : "th");
  }, []);

  useEffect(() => {
    fetch("/api/room-types")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login"; // session หมด → ไปล็อกอินใหม่ (กัน crash)
          return null;
        }
        return r.json();
      })
      .then((m: Meta | null) => {
        if (!m || !Array.isArray(m.roomTypes)) return;
        setMeta(m);
        if (m.roomTypes[0]) setRoomTypeId(m.roomTypes[0].id);
        const direct = (m.channels ?? []).find((c) => c.type === "direct");
        if (direct) setChannelId(direct.id);
      })
      .catch(() => {});
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
          guestPhone: guestPhone || null,
          guestsCount: guests,
          units,
          depositAmount: Number(deposit) || 0,
          idCardImage: idCard || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const r = data.reservation;
        setResult({
          ok: true,
          msg: `✅ ${t("book.success")} ${r.code} · ${r.rooms.length} ${t("common.rooms")} ${r.rooms[0].roomType.name} · ฿${new Intl.NumberFormat("th-TH").format(r.totalAmount)}`,
        });
        setGuestName("");
        setGuestEmail("");
        setGuestPhone("");
        setDeposit("");
        setIdCard("");
        setUnits(1);
      } else {
        setResult({ ok: false, msg: `❌ ${data.message}` });
      }
    } catch {
      setResult({ ok: false, msg: `❌ ${t("book.connErr")}` });
    } finally {
      setBusy(false);
    }
  }

  const selected = meta?.roomTypes.find((rt) => rt.id === roomTypeId);

  return (
    <main className="container">
      <h1 className="page-title">{t("book.title")}</h1>
      <p className="page-sub">{t("book.subtitle")}</p>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <form className="form-grid" onSubmit={submit}>
            <div>
              <label>{t("book.roomType")}</label>
              <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
                {meta?.roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} · ฿{new Intl.NumberFormat("th-TH").format(rt.basePrice)}/{t("book.perNight")} · {t("book.occ")} {rt.maxOccupancy}
                  </option>
                ))}
              </select>
            </div>

            <div className="row-2">
              <div>
                <label>{t("book.checkin")}</label>
                <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
              </div>
              <div>
                <label>{t("book.checkout")}</label>
                <input type="date" value={checkout} min={addDaysLocal(checkin, 1)} onChange={(e) => setCheckout(e.target.value)} />
              </div>
            </div>

            <div>
              <label>{t("book.guestName")}</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder={t("book.guestNamePh")} required />
            </div>

            <div className="row-2">
              <div>
                <label>{t("book.emailOpt")}</label>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="guest@email.com" />
              </div>
              <div>
                <label>{t("book.phoneOpt")}</label>
                <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
              </div>
            </div>

            <div className="row-2">
              <div>
                <label>{t("book.roomsCount")}{selected?._count ? ` (${t("book.roomsAll")} ${selected._count.rooms})` : ""}</label>
                <input type="number" min={1} max={selected?._count?.rooms ?? 20} value={units} onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))} />
              </div>
              <div>
                <label>{t("book.guestsPerRoom")}</label>
                <input type="number" min={1} max={selected?.maxOccupancy ?? 4} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label>{t("book.deposit")}</label>
              <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder={t("book.depositPh")} />
            </div>

            <div>
              <label>{t("book.idCard")}</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={imgBusy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImgBusy(true);
                  try { setIdCard(await resizeImage(f)); } catch { alert(t("book.connErr")); }
                  setImgBusy(false);
                }}
              />
              {imgBusy && <span className="muted" style={{ fontSize: 12 }}>{t("book.processingImg")}</span>}
              {idCard && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={idCard} alt="ID card" style={{ maxWidth: 180, borderRadius: 8, border: "1px solid var(--border)" }} />
                  <button type="button" className="btn btn-ghost" onClick={() => setIdCard("")} style={{ fontSize: 12, padding: "4px 10px", color: "var(--red)" }}>{t("book.removeImg")}</button>
                </div>
              )}
            </div>

            <button className="btn" type="submit" disabled={busy || !meta?.property}>
              {busy ? t("book.submitting") : t("book.submit")}
            </button>

            {result && <div className={`alert ${result.ok ? "success" : "error"}`}>{result.msg}</div>}
          </form>
        </div>
      </div>
    </main>
  );
}
