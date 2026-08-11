// Stripe subscription billing (raw REST + manual webhook verify — ไม่ต้องลง SDK)
// env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.STRIPE_SECRET_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hotel-management-system-topaz-xi.vercel.app";

export function stripeConfigured(): boolean {
  return SECRET.length > 0;
}

// แปลง object ซ้อน → form params แบบ Stripe (key[a][b])
function toForm(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") out.push(...toForm(item as Record<string, unknown>, `${key}[${i}]`));
        else out.push([`${key}[${i}]`, String(item)]);
      });
    } else if (v && typeof v === "object") {
      out.push(...toForm(v as Record<string, unknown>, key));
    } else {
      out.push([key, String(v)]);
    }
  }
  return out;
}

async function stripeApi(path: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(toForm(params)).toString();
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data?.error?.message as string) || `Stripe HTTP ${res.status}`);
  return data;
}

/** สร้าง Checkout Session (subscription รายเดือน THB) → คืน url ให้ redirect */
export async function createCheckoutSession(opts: {
  orgId: string;
  plan: string;
  planName: string;
  priceTHB: number;
  customerId?: string | null;
  customerEmail?: string;
}): Promise<string> {
  const params: Record<string, unknown> = {
    mode: "subscription",
    client_reference_id: opts.orgId,
    success_url: `${APP_URL}/settings?billing=success`,
    cancel_url: `${APP_URL}/settings?billing=cancel`,
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: Math.round(opts.priceTHB * 100),
          recurring: { interval: "month" },
          product_data: { name: `OneCloudStay ${opts.planName}` },
        },
      },
    ],
    subscription_data: { metadata: { orgId: opts.orgId, plan: opts.plan } },
    metadata: { orgId: opts.orgId, plan: opts.plan },
  };
  if (opts.customerId) params.customer = opts.customerId;
  else if (opts.customerEmail) params.customer_email = opts.customerEmail;

  const s = await stripeApi("checkout/sessions", params);
  return s.url as string;
}

/** Customer Portal (จัดการ/ยกเลิก/เปลี่ยนบัตร) → คืน url */
export async function createPortalSession(customerId: string): Promise<string> {
  const s = await stripeApi("billing_portal/sessions", { customer: customerId, return_url: `${APP_URL}/settings` });
  return s.url as string;
}

/** ตรวจลายเซ็น webhook ของ Stripe (Stripe-Signature: t=...,v1=...) */
export function verifyStripeSignature(payload: string, sigHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(",")) {
    const [k, val] = kv.split("=");
    if (k && val) parts[k.trim()] = val.trim();
  }
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}
