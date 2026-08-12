"use client";

import { useState } from "react";
import { makeT, type Lang } from "@/lib/i18n";

export default function EmailPanel({ configured, lang = "th" }: { configured: boolean; lang?: Lang }) {
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function test() {
    setBusy(true);
    setMsg(null);
    const d = await (await fetch("/api/email/test", { method: "POST" })).json();
    setBusy(false);
    setMsg(d.ok ? { ok: true, text: t("ep.testSent") } : { ok: false, text: d.message });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        {t("ep.desc")}{" "}
        {configured ? <b style={{ color: "var(--green)" }}>{t("ep.ready")}</b> : <b style={{ color: "var(--red)" }}>{t("ep.notSet")}</b>}
      </p>

      {configured ? (
        <button className="btn" onClick={test} disabled={busy}>
          {busy ? t("ep.sending") : t("ep.sendTest")}
        </button>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>
          <b>{t("ep.setupTitle")}</b>
          <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>{t("ep.step1a")} <span className="mono">resend.com</span> {t("ep.step1b")}</li>
            <li>{t("ep.step2")}</li>
            <li>{t("ep.step3")}</li>
          </ol>
        </div>
      )}

      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </div>
  );
}
