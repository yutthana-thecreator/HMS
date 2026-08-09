"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePaymentButton({ reservationId, paymentId }: { reservationId: string; paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("ลบรายการชำระนี้?")) return;
    setBusy(true);
    await fetch(`/api/reservations/${reservationId}/payments?paymentId=${paymentId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" onClick={del} disabled={busy} style={{ padding: "4px 10px", fontSize: 12 }}>
      {busy ? "..." : "ลบ"}
    </button>
  );
}
