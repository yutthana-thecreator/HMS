"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function cancel() {
    if (!confirm("ยืนยันยกเลิกการจองนี้? ระบบจะคืนห้องกลับเข้าสต็อก")) return;
    setBusy(true);
    await fetch(`/api/reservations/${id}/cancel`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" onClick={cancel} disabled={busy}>
      {busy ? "..." : "ยกเลิก"}
    </button>
  );
}
