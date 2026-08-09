"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Prop = { id: string; title: string };

export default function ChannexPanel({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [props, setProps] = useState<Prop[] | null>(null);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function test() {
    setBusy("test");
    setMsg(null);
    const data = await (await fetch("/api/channex/test")).json();
    setBusy("");
    if (data.ok) {
      setProps(data.properties);
      if (data.properties?.[0]) setSelected(data.properties[0].id);
      setMsg({ ok: true, text: `เชื่อมต่อสำเร็จ (${data.base})` });
    } else setMsg({ ok: false, text: data.message });
  }

  async function connect() {
    if (!selected) return;
    setBusy("connect");
    setMsg(null);
    const data = await (await fetch("/api/channex/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channexPropertyId: selected }),
    })).json();
    setBusy("");
    if (data.ok) {
      setMsg({ ok: true, text: `✅ เชื่อมแล้ว — สร้าง/map ${data.provisioned}/${data.roomTypes} ห้อง + push ห้องว่างเรียบร้อย` });
      router.refresh();
    } else setMsg({ ok: false, text: data.message });
  }

  async function push() {
    setBusy("push");
    setMsg(null);
    const data = await (await fetch("/api/channex/push", { method: "POST" })).json();
    setBusy("");
    setMsg(data.ok ? { ok: true, text: `✅ push ห้องว่าง ${data.updates} รายการไป Channex` } : { ok: false, text: data.message });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        sync ห้องว่าง/ราคา + รับการจองจาก OTA แบบเรียลไทม์ {connected && <b style={{ color: "var(--green)" }}>· เชื่อมแล้ว ✓</b>}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button className="btn btn-ghost" onClick={test} disabled={!!busy} style={{ color: "var(--primary)" }}>
          {busy === "test" ? "..." : "1. ทดสอบการเชื่อมต่อ"}
        </button>
        {connected && (
          <button className="btn" onClick={push} disabled={!!busy}>
            {busy === "push" ? "กำลัง push..." : "🔄 Push ห้องว่างไป Channex"}
          </button>
        )}
      </div>

      {/* เลือก property + เชื่อม */}
      {props && props.length > 0 && !connected && (
        <div className="row-2" style={{ marginBottom: 10, alignItems: "end" }}>
          <div>
            <label>เลือก property ใน Channex</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {props.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <button className="btn" onClick={connect} disabled={!!busy}>
            {busy === "connect" ? "กำลังเชื่อม..." : "2. เชื่อมโรงแรมนี้"}
          </button>
        </div>
      )}

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}

      {/* Webhook URL */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 14, fontSize: 13 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Webhook รับการจองจาก OTA</div>
        <div className="muted" style={{ marginBottom: 4 }}>ก๊อปลิงก์นี้ไปใส่ใน Channex → Property Webhooks (event: booking):</div>
        <input readOnly value={`${origin}/api/webhooks/channex`} onFocus={(e) => e.target.select()} style={{ fontSize: 12 }} />
      </div>
    </div>
  );
}
