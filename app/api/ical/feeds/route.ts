import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// เพิ่มลิงก์ iCal ของ OTA (สร้าง channel ประเภท ical ให้ด้วย)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const roomTypeId = String(body.roomTypeId ?? "");
  const label = String(body.label ?? "").trim();
  const url = String(body.url ?? "").trim();

  if (!roomTypeId || !label || !url) {
    return NextResponse.json({ ok: false, message: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, message: "ลิงก์ต้องขึ้นต้นด้วย http(s)://" }, { status: 400 });
  }

  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property) return NextResponse.json({ ok: false, message: "ไม่พบที่พัก" }, { status: 400 });

  const roomType = await prisma.roomType.findFirst({ where: { id: roomTypeId, propertyId: property.id } });
  if (!roomType) return NextResponse.json({ ok: false, message: "ไม่พบประเภทห้อง" }, { status: 400 });

  const channel = await prisma.channel.create({
    data: { propertyId: property.id, type: "ical", name: label },
  });
  await prisma.icalFeed.create({
    data: { propertyId: property.id, roomTypeId, channelId: channel.id, label, url },
  });

  return NextResponse.json({ ok: true });
}

// ลบลิงก์ iCal
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const feed = await prisma.icalFeed.findFirst({ where: { id, property: { orgId: user.orgId } } });
  if (!feed) return NextResponse.json({ ok: false, message: "ไม่พบลิงก์" }, { status: 404 });

  await prisma.icalFeed.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
