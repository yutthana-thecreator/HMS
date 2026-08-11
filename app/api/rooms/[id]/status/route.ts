import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED = ["clean", "dirty", "out_of_order"];

// อัปเดตสถานะห้อง (แม่บ้าน) — เฉพาะห้องของ org ที่ล็อกอิน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  if (!ALLOWED.includes(status)) return NextResponse.json({ ok: false, message: "สถานะไม่ถูกต้อง" }, { status: 400 });

  const room = await prisma.room.findFirst({ where: { id, property: { orgId: user.orgId } }, select: { id: true, status: true } });
  if (!room) return NextResponse.json({ ok: false, message: "ไม่พบห้อง" }, { status: 404 });
  if (room.status === "occupied") {
    return NextResponse.json({ ok: false, message: "ห้องมีแขกพักอยู่ — เช็คเอาต์ก่อน" }, { status: 409 });
  }

  await prisma.room.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
