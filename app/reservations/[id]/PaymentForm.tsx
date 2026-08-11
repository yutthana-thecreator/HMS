"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/payments";
import { makeT, type Lang } from "@/lib/i18n";

export default function PaymentForm({ reservationId, remaining, lang = "th" }: { reservationId: string; remaining: number; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/reservations/${reservationId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), method, note }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setNote("");
      router.refresh();
    } else {
      setMsg({ ok: false, text: data.message });
    }
  }

  return (
    <form onSubmit={submit} style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{t("pf.add")}</div>
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label>{t("pf.amount")}</label>
          <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label>{t("pf.method")}</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.keys(PAYMENT_METHODS).filter((k) => k !== "refund").map((k) => (
              <option key={k} value={k}>{t(`pmethod.${k}`)}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>{t("pf.noteOpt")}</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pf.notePh")} />
      </div>
      <button className="btn" disabled={busy}>{busy ? t("pf.saving") : t("pf.save")}</button>
      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </form>
  );
}
