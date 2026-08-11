"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
}: {
  plans: PlanInfo[];
  currentPlanId: string;
  pending: Pending;
  yearlyDiscount: number;
  yearlyMonths: number;
}) {
  const router = useRouter();
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
    else alert(d.message ?? "สร้าง QR ไม่สำเร็จ");
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
    else alert(d.message ?? "แจ้งชำระไม่สำเร็จ");
  }

  return (
    <div>
      {pending && (
        <div className="alert" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)", marginBottom: 16 }}>
          ⏳ มีคำขอชำระเงินรอผู้ดูแลยืนยัน — แพ็ก {pending.plan} · ฿{money(pending.amount)} ({pending.cycle === "yearly" ? "รายปี" : "รายเดือน"})
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
            {c === "monthly" ? "รายเดือน" : `รายปี · ลด ${yearlyDiscount}%`}
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
                <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>/{cycle === "yearly" ? "ปี" : "เดือน"}</span>
              </div>
              {cycle === "yearly" && (
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>ประหยัด ฿{money(p.priceTHB * 12 - p.priceTHB * yearlyMonths)}/ปี</div>
              )}
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "var(--green)", background: "rgba(22,163,74,0.1)", padding: "2px 8px", borderRadius: 6, marginTop: 6 }}>
                🎁 ทดลองฟรี 14 วัน
              </div>
              <ul>
                <li>{p.maxRooms} ห้อง</li>
                <li>{p.maxProperties} ที่พัก</li>
                <li>{p.staffSeats} ผู้ใช้งาน</li>
                <li>{p.channelManager ? "เชื่อม OTA เรียลไทม์" : "iCal เท่านั้น"}</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                {isCurrent ? (
                  <button className="btn btn-block" disabled style={{ background: "var(--text-muted)" }}>แพ็กเกจปัจจุบัน</button>
                ) : (
                  <button className="btn btn-block" onClick={() => showQr(p.id)} disabled={!!busy}>
                    {busy === p.id ? "..." : "เลือกแพ็กเกจนี้"}
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
              <div style={{ fontWeight: 700, fontSize: 18, margin: "8px 0" }}>แจ้งชำระเงินแล้ว</div>
              <p className="muted">รอผู้ดูแลตรวจสอบและยืนยัน — แพ็กเกจจะเปิดใช้งานหลังยืนยัน (จะมีอีเมลแจ้ง)</p>
              <button className="btn btn-ghost" onClick={() => setQr(null)}>ปิด</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 17 }}>สแกนจ่ายด้วย PromptPay</div>
              <div className="muted" style={{ fontSize: 14 }}>{qr.planName} · {qr.cycleLabel}</div>
              <img src={qr.qrDataUrl} alt="PromptPay QR" style={{ width: 260, height: 260, margin: "8px auto" }} />
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>฿{money(qr.amount)}</div>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 16px" }}>
                เปิดแอปธนาคาร → สแกน QR → โอนตามยอด → กดปุ่มด้านล่าง
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn" onClick={claim} disabled={busy === "claim"}>
                  {busy === "claim" ? "กำลังแจ้ง..." : "ฉันโอนแล้ว"}
                </button>
                <button className="btn btn-ghost" onClick={() => setQr(null)} disabled={busy === "claim"}>ยกเลิก</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
