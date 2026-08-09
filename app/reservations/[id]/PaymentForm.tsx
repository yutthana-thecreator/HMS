"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/payments";

export default function PaymentForm({ reservationId, remaining }: { reservationId: string; remaining: number }) {
  const router = useRouter();
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
      <div style={{ fontWeight: 600, marginBottom: 10 }}>+ บันทึกการชำระเงิน</div>
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label>จำนวนเงิน (บาท)</label>
          <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label>วิธีชำระ</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>หมายเหตุ (ไม่บังคับ)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น มัดจำ 50%" />
      </div>
      <button className="btn" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกการชำระ"}</button>
      {msg && <div className={`alert ${msg.ok ? "success" : "error"}`}>{msg.text}</div>}
    </form>
  );
}
