"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function DeletePaymentButton({ reservationId, paymentId, lang = "th" }: { reservationId: string; paymentId: string; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(lang === "en" ? "Delete this payment?" : "ลบรายการชำระนี้?")) return;
    setBusy(true);
    await fetch(`/api/reservations/${reservationId}/payments?paymentId=${paymentId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" onClick={del} disabled={busy} style={{ padding: "4px 10px", fontSize: 12 }}>
      {busy ? "..." : t("pf.delete")}
    </button>
  );
}
