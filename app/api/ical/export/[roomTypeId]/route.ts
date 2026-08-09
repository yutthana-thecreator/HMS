import { prisma } from "@/lib/db";
import { buildIcal } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Export .ics ของห้องประเภทนี้ (public — ให้ OTA มา subscribe)
export async function GET(_req: Request, { params }: { params: Promise<{ roomTypeId: string }> }) {
  const { roomTypeId } = await params;

  const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
  if (!roomType) return new Response("Not found", { status: 404 });

  const rooms = await prisma.reservationRoom.findMany({
    where: { roomTypeId, reservation: { status: { not: "cancelled" } } },
    include: { reservation: { select: { code: true } } },
  });

  const ics = buildIcal({
    calName: `${roomType.name} — HMS`,
    events: rooms.map((r) => ({
      uid: `hms-${r.id}@hms`,
      start: r.checkinDate,
      end: r.checkoutDate,
      summary: `Booked (${r.reservation.code})`,
    })),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${roomType.code}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
