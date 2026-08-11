"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function CancelButton({ id, lang = "th", otaLocked = false, paidAmount = 0 }: { id: string; lang?: Lang; otaLocked?: boolean; paidAmount?: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = makeT(lang);

  // การจองจาก OTA → ห้ามยกเลิกในระบบเรา (เสี่ยง overbooking) ต้องยกเลิกที่ OTA
  if (otaLocked) {
    return (
      <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }} title="OTA booking — cancel on the OTA only">
        {t("res.cancelOTA")}
      </span>
    );
  }

  async function cancel() {
    let refund = 0;
    if (paidAmount > 0) {
      const input = prompt(
        `ลูกค้าจ่ายมาแล้ว ฿${paidAmount.toLocaleString("th-TH")}\n\nคืนเงินเท่าไหร่? (ใส่ 0 = ไม่คืน/ริบมัดจำ)`,
        String(paidAmount),
      );
      if (input === null) return;
      refund = Math.max(0, Math.min(paidAmount, Number(input) || 0));
      if (!confirm(`ยกเลิกการจอง${refund > 0 ? ` + บันทึกคืนเงิน ฿${refund.toLocaleString("th-TH")}` : " (ไม่คืนเงิน)"}?`)) return;
    } else {
      if (!confirm("ยืนยันยกเลิกการจองนี้? ระบบจะคืนห้องกลับเข้าสต็อก")) return;
    }

    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refund }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!data.ok) { alert(data.message || "ยกเลิกไม่สำเร็จ"); return; }
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" onClick={cancel} disabled={busy}>
      {busy ? "..." : t("res.cancel")}
    </button>
  );
}
