import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { PLANS, PlanId } from "@/lib/plans";

export const runtime = "nodejs";

// admin จัดการโรงแรม: ระงับ/เปิด · เปลี่ยนแพ็ก · ต่ออายุ
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ ok: false, message: "ไม่พบโรงแรม" }, { status: 404 });

  switch (action) {
    case "suspend":
      await prisma.organization.update({ where: { id }, data: { suspended: true } });
      return NextResponse.json({ ok: true });

    case "unsuspend":
      await prisma.organization.update({ where: { id }, data: { suspended: false } });
      return NextResponse.json({ ok: true });

    case "setPlan": {
      const plan = String(body.plan ?? "") as PlanId;
      if (!PLANS[plan]) return NextResponse.json({ ok: false, message: "แพ็กไม่ถูกต้อง" }, { status: 400 });
      await prisma.organization.update({ where: { id }, data: { plan, planStatus: "active" } });
      return NextResponse.json({ ok: true });
    }

    case "extend": {
      const days = Math.max(1, Math.min(730, Number(body.days) || 30));
      const from = org.currentPeriodEnd && org.currentPeriodEnd > new Date() ? new Date(org.currentPeriodEnd) : new Date();
      from.setDate(from.getDate() + days);
      await prisma.organization.update({ where: { id }, data: { currentPeriodEnd: from, planStatus: "active" } });
      return NextResponse.json({ ok: true, until: from.toISOString().slice(0, 10) });
    }

    case "delete": {
      // ลบข้อมูลลูกตามลำดับ (กัน FK Restrict ที่ RoomType) แล้วค่อยลบ org
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { reservation: { property: { orgId: id } } } }),
        prisma.reservationRoom.deleteMany({ where: { reservation: { property: { orgId: id } } } }),
        prisma.reservation.deleteMany({ where: { property: { orgId: id } } }),
        prisma.channelMapping.deleteMany({ where: { channel: { property: { orgId: id } } } }),
        prisma.room.deleteMany({ where: { property: { orgId: id } } }),
        prisma.availability.deleteMany({ where: { property: { orgId: id } } }),
        prisma.icalFeed.deleteMany({ where: { property: { orgId: id } } }),
        prisma.channel.deleteMany({ where: { property: { orgId: id } } }),
        prisma.roomType.deleteMany({ where: { property: { orgId: id } } }),
        prisma.property.deleteMany({ where: { orgId: id } }),
        prisma.organization.delete({ where: { id } }), // cascade: AppUser, Session, PaymentRequest
      ]);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: false, message: "action ไม่ถูกต้อง" }, { status: 400 });
  }
}
