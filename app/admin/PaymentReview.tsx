"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentReview({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function act(action: "confirm" | "reject") {
    if (action === "reject" && !confirm("ปฏิเสธคำขอนี้?")) return;
    setBusy(action);
    const res = await fetch(`/api/admin/payments/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy("");
    if (data.ok) router.refresh();
    else alert(data.message ?? "ไม่สำเร็จ");
  }

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn" onClick={() => act("confirm")} disabled={!!busy} style={{ padding: "6px 14px" }}>
        {busy === "confirm" ? "..." : "✓ ยืนยัน"}
      </button>
      <button className="btn btn-ghost" onClick={() => act("reject")} disabled={!!busy} style={{ padding: "6px 14px" }}>
        {busy === "reject" ? "..." : "ปฏิเสธ"}
      </button>
    </span>
  );
}
