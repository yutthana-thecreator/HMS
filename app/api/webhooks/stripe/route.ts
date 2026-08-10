import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

// map สถานะ subscription ของ Stripe → planStatus ของเรา
function mapStatus(s: string): string {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled"; // canceled | incomplete_expired
}

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, sig)) {
    return NextResponse.json({ ok: false, message: "invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload);
  const obj = event?.data?.object ?? {};

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const orgId = obj.client_reference_id || obj.metadata?.orgId;
        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: obj.customer ?? undefined,
              stripeSubscriptionId: obj.subscription ?? undefined,
              plan: obj.metadata?.plan ?? undefined,
              planStatus: "active",
            },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const orgId = obj.metadata?.orgId;
        const data: Record<string, unknown> = {
          planStatus: mapStatus(obj.status),
          stripeSubscriptionId: obj.id,
          currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : undefined,
        };
        if (obj.metadata?.plan) data.plan = obj.metadata.plan;
        if (orgId) await prisma.organization.update({ where: { id: orgId }, data });
        else if (obj.customer)
          await prisma.organization.updateMany({ where: { stripeCustomerId: obj.customer }, data });
        break;
      }
      case "customer.subscription.deleted": {
        const orgId = obj.metadata?.orgId;
        if (orgId) await prisma.organization.update({ where: { id: orgId }, data: { planStatus: "canceled" } });
        else if (obj.customer)
          await prisma.organization.updateMany({ where: { stripeCustomerId: obj.customer }, data: { planStatus: "canceled" } });
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook error:", (e as Error).message);
  }

  return NextResponse.json({ received: true });
}
