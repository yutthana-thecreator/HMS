// ============================================================================
//  แพ็กเกจ (Flat pricing) + Entitlements
//  ราคา/ลิมิตนิยามที่นี่ที่เดียว → บังคับใช้ในโค้ด และเตรียม map กับ Stripe Price
// ============================================================================
export type PlanId = "starter" | "pro" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceTHB: number; // ต่อเดือน
  maxProperties: number;
  maxRooms: number; // รวมทุก property
  staffSeats: number;
  channelManager: boolean; // เชื่อม OTA แบบเรียลไทม์ (Channel Manager) หรือได้แค่ iCal
  // stripePriceId?: string;  // ← เติมตอนต่อ Stripe จริง (เฟสถัดไป)
};

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceTHB: 990,
    maxProperties: 1,
    maxRooms: 15,
    staffSeats: 3,
    channelManager: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceTHB: 2900,
    maxProperties: 3,
    maxRooms: 80,
    staffSeats: 15,
    channelManager: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceTHB: 7900,
    maxProperties: 999,
    maxRooms: 9999,
    staffSeats: 999,
    channelManager: true,
  },
};

export function getPlan(planId: string | null | undefined): Plan {
  return PLANS[(planId as PlanId) ?? "starter"] ?? PLANS.starter;
}

/** true ถ้าเข้าถึงระบบได้ (trial ยังไม่หมด หรือจ่ายเงินอยู่) */
export function isActiveSubscription(planStatus: string, trialEndsAt: Date | null): boolean {
  if (planStatus === "active") return true;
  if (planStatus === "trialing") {
    return !trialEndsAt || trialEndsAt > new Date();
  }
  return false; // past_due | canceled
}
