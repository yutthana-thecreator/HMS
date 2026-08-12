"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

type PlanInfo = {
  id: string;
  name: string;
  priceTHB: number;
  maxRooms: number;
  maxProperties: number;
  staffSeats: number;
  channelManager: boolean;
};
type Pending = { plan: string; cycle: string; amount: number } | null;

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default function PromptPayBilling({
  plans,
  currentPlanId,
  pending,
  yearlyDiscount,
  yearlyMonths,
  lang = "th",
}: {
  plans: PlanInfo[];
  currentPlanId: string;
  pending: Pending;
  yearlyDiscount: number;
  yearlyMonths: number;
  lang?: Lang;
}) {
  const router = useRouter();
  const t = makeT(lang);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [qr, setQr] = useState<{ plan: string; planName: string; cycleLabel: string; amount: number; qrDataUrl: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [claimed, setClaimed] = useState(false);

  const price = (p: PlanInfo) => (cycle === "yearly" ? p.priceTHB * yearlyMonths : p.priceTHB);

  async function showQr(planId: string) {
    setBusy(planId);
    const d = await (await fetch("/api/billing/promptpay/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId, cycle }),
    })).json();
    setBusy("");
    if (d.ok) { setClaimed(false); setQr({ plan: planId, ...d }); }
    else alert(d.message ?? t("pp.qrFail"));
  }

  async function claim() {
    if (!qr) return;
    setBusy("claim");
    const d = await (await fetch("/api/billing/promptpay/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: qr.plan, cycle }),
    })).json();
    setBusy("");
    if (d.ok) { setClaimed(true); router.refresh(); }
    else alert(d.message ?? t("pp.claimFail"));
  }

  return (
    <div>
      {pending && (
        <div className="alert" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)", marginBottom: 16 }}>
          {t("pp.pendingPrefix")} {pending.plan} · ฿{money(pending.amount)} ({pending.cycle === "yearly" ? t("set.yearly") : t("set.monthly")})
        </div>
      )}

      {/* toggle รอบบิล */}
      <div style={{ display: "inline-flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 10, marginBottom: 18 }}>
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className="btn"
            style={{
              padding: "6px 16px",
              background: cycle === c ? "var(--primary)" : "transparent",
              color: cycle === c ? "#fff" : "var(--text-muted)",
            }}
          >
            {c === "monthly" ? t("set.monthly") : `${t("pp.yearlySave")} ${yearlyDiscount}%`}
          </button>
        ))}
      </div>

      <div className="plan-grid">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          return (
            <div key={p.id} className={`plan-tier ${isCurrent ? "current" : ""}`}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</div>
              <div className="price">
                ฿{money(price(p))}
                <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>/{cycle === "yearly" ? t("pp.perYear") : t("pp.perMonth")}</span>
              </div>
              {cycle === "yearly" && (
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>{t("pp.save")} ฿{money(p.priceTHB * 12 - p.priceTHB * yearlyMonths)}/{t("pp.perYearFull")}</div>
              )}
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "var(--green)", background: "rgba(22,163,74,0.1)", padding: "2px 8px", borderRadius: 6, marginTop: 6 }}>
                {t("pp.freeTrial")}
              </div>
              <ul>
                <li>{p.maxRooms} {t("pp.rooms")}</li>
                <li>{p.maxProperties} {t("pp.properties")}</li>
                <li>{p.staffSeats} {t("pp.staff")}</li>
                <li>{p.channelManager ? t("pp.otaRealtime") : t("pp.icalOnly")}</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                {isCurrent ? (
                  <button className="btn btn-block" disabled style={{ background: "var(--text-muted)" }}>{t("pp.currentPlan")}</button>
                ) : (
                  <button className="btn btn-block" onClick={() => showQr(p.id)} disabled={!!busy}>
                    {busy === p.id ? "..." : t("pp.choose")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QR ชำระเงิน */}
      {qr && (
        <div style={{ marginTop: 20, border: "1px solid var(--border)", borderRadius: 12, padding: 24, textAlign: "center", maxWidth: 420 }}>
          {claimed ? (
            <>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 18, margin: "8px 0" }}>{t("pp.claimedTitle")}</div>
              <p className="muted">{t("pp.claimedDesc")}</p>
              <button className="btn btn-ghost" onClick={() => setQr(null)}>{t("common.close")}</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{t("pp.scanTitle")}</div>
              <div className="muted" style={{ fontSize: 14 }}>{qr.planName} · {qr.cycleLabel}</div>
              <img src={qr.qrDataUrl} alt="PromptPay QR" style={{ width: 260, height: 260, margin: "8px auto" }} />
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>฿{money(qr.amount)}</div>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 16px" }}>
                {t("pp.scanHint")}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn" onClick={claim} disabled={busy === "claim"}>
                  {busy === "claim" ? t("pp.reporting") : t("pp.iPaid")}
                </button>
                <button className="btn btn-ghost" onClick={() => setQr(null)} disabled={busy === "claim"}>{t("common.cancel")}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
