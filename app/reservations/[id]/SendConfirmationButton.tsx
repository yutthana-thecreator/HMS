"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

export default function SendConfirmationButton({ id, lang = "th" }: { id: string; lang?: Lang }) {
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    const d = await (await fetch(`/api/reservations/${id}/send-confirmation`, { method: "POST" })).json();
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: t("pf.sent") } : { ok: false, text: d.message || "-" });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-ghost" onClick={send} disabled={busy} style={{ color: "var(--primary)" }}>
        {busy ? t("pf.sending") : t("pf.sendConfirm")}
      </button>
      {msg && <span style={{ fontSize: 13, color: msg.ok ? "var(--green)" : "var(--red)" }}>{msg.text}</span>}
    </span>
  );
}
