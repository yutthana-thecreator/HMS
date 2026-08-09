import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { channexConfigured, channexListChannels } from "@/lib/channex";

export const runtime = "nodejs";

// สถานะการเชื่อม Channel Manager ของโรงแรมนี้ (ใช้ใน wizard)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const property = await prisma.property.findFirst({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "asc" },
    include: { roomTypes: { select: { channexRoomTypeId: true } } },
  });
  if (!property) return NextResponse.json({ ok: false, message: "ไม่พบที่พัก" }, { status: 404 });

  const connected = !!property.channexPropertyId;
  let channelsConnected = 0;
  if (connected) {
    try {
      channelsConnected = (await channexListChannels(property.channexPropertyId!)).length;
    } catch {
      channelsConnected = 0;
    }
  }

  return NextResponse.json({
    ok: true,
    configured: channexConfigured(),
    connected,
    channexPropertyId: property.channexPropertyId,
    roomTypesTotal: property.roomTypes.length,
    roomTypesMapped: property.roomTypes.filter((r) => r.channexRoomTypeId).length,
    channelsConnected,
  });
}
