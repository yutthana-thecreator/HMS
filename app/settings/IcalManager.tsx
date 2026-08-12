"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

type RT = { id: string; name: string; code: string };
type Feed = { id: string; label: string; roomTypeName: string; url: string; lastResult: string | null };

export default function IcalManager({ roomTypes, feeds, lang = "th" }: { roomTypes: RT[]; feeds: Feed[]; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
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
    if (!confirm(t("im.confirmDel"))) return;
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
      const tt = data.totals;
      setMsg({ ok: true, text: lang === "th"
        ? `✅ Sync เสร็จ — นำเข้า ${tt.imported} · ยกเลิก ${tt.cancelled} · ชน(กัน overbooking) ${tt.conflicts}`
        : `✅ Sync done — imported ${tt.imported} · cancelled ${tt.cancelled} · conflicts (blocked) ${tt.conflicts}` });
      router.refresh();
    } else setMsg({ ok: false, text: data.message ?? t("im.syncFail") });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 14 }}>{t("im.pull")}</span>
        <button className="btn" onClick={syncNow} disabled={syncing || feeds.length === 0}>
          {syncing ? t("im.syncing") : t("im.syncNow")}
        </button>
      </div>

      {/* ลิงก์ที่เพิ่มไว้ */}
      {feeds.length > 0 && (
        <div className="cal-wrap" style={{ marginBottom: 16 }}>
          <table className="table">
            <thead><tr><th>{t("im.channel")}</th><th>{t("common.room")}</th><th>{t("im.lastResult")}</th><th></th></tr></thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={f.id}>
                  <td><span className="badge channel">{f.label}</span></td>
                  <td>{f.roomTypeName}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{f.lastResult ?? t("im.notSynced")}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => removeFeed(f.id)} style={{ padding: "4px 10px", fontSize: 12 }}>{t("common.delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* เพิ่มลิงก์ import */}
      <form onSubmit={addFeed} style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>{t("im.addTitle")}</div>
        <div className="row-2" style={{ marginBottom: 10 }}>
          <div>
            <label>{t("book.roomType")}</label>
            <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
              {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label>{t("im.channel")}</label>
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              <option>Airbnb</option><option>Booking.com</option><option>Agoda</option><option>Expedia</option><option value="Other">{t("im.other")}</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>{t("im.icsLink")}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/....ics" required />
        </div>
        <button className="btn" disabled={busy || !roomTypeId}>{busy ? t("im.adding") : t("im.addLink")}</button>
        {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
      </form>

      {/* Export: ลิงก์ให้ OTA มา subscribe */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("im.exportTitle")}</div>
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
