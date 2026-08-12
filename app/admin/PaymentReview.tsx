"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function PaymentReview({ id, lang = "th" }: { id: string; lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  const [busy, setBusy] = useState("");

  async function act(action: "confirm" | "reject") {
    if (action === "reject" && !confirm(t("pr.confirmReject"))) return;
    setBusy(action);
    const res = await fetch(`/api/admin/payments/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy("");
    if (data.ok) router.refresh();
    else alert(data.message ?? t("common.failed"));
  }

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn" onClick={() => act("confirm")} disabled={!!busy} style={{ padding: "6px 14px" }}>
        {busy === "confirm" ? "..." : t("pr.confirm")}
      </button>
      <button className="btn btn-ghost" onClick={() => act("reject")} disabled={!!busy} style={{ padding: "6px 14px" }}>
        {busy === "reject" ? "..." : t("pr.reject")}
      </button>
    </span>
  );
}
