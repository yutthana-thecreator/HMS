import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkinReservation, FrontDeskError } from "@/lib/frontdesk";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const roomId = body.roomId ? String(body.roomId) : null;

  const res = await prisma.reservation.findFirst({ where: { id, property: { orgId: user.orgId } }, select: { id: true } });
  if (!res) return NextResponse.json({ ok: false, message: "ไม่พบการจอง" }, { status: 404 });

  try {
    await checkinReservation(id, roomId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof FrontDeskError ? (e as Error).message : "เช็คอินไม่สำเร็จ";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
