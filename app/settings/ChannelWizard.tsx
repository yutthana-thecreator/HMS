"use client";

import { useEffect, useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

type Status = {
  configured: boolean;
  connected: boolean;
  channexPropertyId: string | null;
  roomTypesTotal: number;
  roomTypesMapped: number;
  channelsConnected: number;
};

function StepDot({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <div
      style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 14,
        background: done ? "var(--green)" : active ? "var(--primary)" : "var(--border)",
        color: done || active ? "#fff" : "var(--muted)",
      }}
    >
      {done ? "✓" : n}
    </div>
  );
}

export default function ChannelWizard({ lang = "th" }: { lang?: Lang }) {
  const t = makeT(lang);
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const OTA_GUIDE = [
    { name: "Booking.com", how: t("cw.otaBookingHow") },
    { name: "Airbnb", how: t("cw.otaAirbnbHow") },
    { name: "Agoda", how: t("cw.otaAgodaHow") },
  ];

  async function load() {
    const d = await (await fetch("/api/channex/status")).json();
    if (d.ok) setSt(d);
  }
  useEffect(() => { load(); }, []);

  async function onboard() {
    setBusy("onboard");
    setMsg(null);
    const d = await (await fetch("/api/channex/onboard", { method: "POST" })).json();
    setBusy("");
    if (d.ok) {
      const n = d.roomTypesMapped ?? d.provisioned, tot = d.roomTypes;
      setMsg({ ok: true, text: lang === "th"
        ? `✅ เชื่อมสำเร็จ — สร้าง/map ${n}/${tot} ห้อง + push ห้องว่าง/ราคา + เปิดรับการจองแล้ว`
        : `✅ Connected — created/mapped ${n}/${tot} rooms + pushed availability/rates + open for bookings` });
      load();
    } else setMsg({ ok: false, text: d.message });
  }

  async function push() {
    setBusy("push");
    setMsg(null);
    const d = await (await fetch("/api/channex/push", { method: "POST" })).json();
    setBusy("");
    setMsg(d.ok
      ? { ok: true, text: lang === "th"
          ? `✅ push ${d.updates} รายการ (ห้องว่าง+ราคา) ไปทุก OTA`
          : `✅ Pushed ${d.updates} updates (availability + rates) to all OTAs` }
      : { ok: false, text: d.message });
  }

  if (!st) return <p className="muted">{t("common.loading")}</p>;
  if (!st.configured) return <div className="alert error">{t("cw.notConfigured")}</div>;

  const step1Done = st.connected && st.roomTypesMapped > 0;
  const step2Done = st.channelsConnected > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* STEP 1 */}
      <div style={{ display: "flex", gap: 14 }}>
        <StepDot n={1} done={step1Done} active={!step1Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("cw.step1Title")}</div>
          {step1Done ? (
            <div className="muted" style={{ fontSize: 14 }}>
              {lang === "th"
                ? `✓ เชื่อมแล้ว · map ${st.roomTypesMapped}/${st.roomTypesTotal} ห้อง · เปิดรับการจอง OTA · push ห้องว่าง/ราคาอัตโนมัติ`
                : `✓ Connected · mapped ${st.roomTypesMapped}/${st.roomTypesTotal} rooms · open for OTA bookings · auto-push availability/rates`}
            </div>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
                {t("cw.step1Desc")}
              </div>
              <button className="btn" onClick={onboard} disabled={!!busy}>
                {busy === "onboard" ? t("cw.connecting") : t("cw.startConnect")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* STEP 2 */}
      <div style={{ display: "flex", gap: 14, opacity: step1Done ? 1 : 0.45 }}>
        <StepDot n={2} done={step2Done} active={step1Done && !step2Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {t("cw.step2Title")}{step2Done && <span style={{ color: "var(--green)" }}> {lang === "th" ? `— เชื่อมแล้ว ${st.channelsConnected} เว็บ ✓` : `— ${st.channelsConnected} connected ✓`}</span>}
          </div>
          <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
            {t("cw.step2Desc")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {OTA_GUIDE.map((o) => (
              <div key={o.name} style={{ fontSize: 13, padding: "8px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <b>{o.name}:</b> <span className="muted">{o.how}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {t("cw.step2Note")}
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div style={{ display: "flex", gap: 14, opacity: step1Done ? 1 : 0.45 }}>
        <StepDot n={3} done={step1Done} active={step1Done} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("cw.step3Title")}</div>
          <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
            {t("cw.step3Desc")}
          </div>
          {step1Done && (
            <button className="btn btn-ghost" onClick={push} disabled={!!busy} style={{ color: "var(--primary)" }}>
              {busy === "push" ? t("cw.pushing") : t("cw.pushNow")}
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </div>
  );
}
