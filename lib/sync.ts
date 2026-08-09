// ดึงการจองจาก OTA (iCal) เข้าระบบ + คืนวันที่เมื่อ OTA ยกเลิก
import { prisma } from "./db";
import { parseIcal } from "./ical";
import { createReservation, cancelReservation, SoldOutError, InvalidDatesError } from "./reservations";

export type SyncResult = { label: string; imported: number; cancelled: number; conflicts: number; error?: string };

type FeedRow = {
  id: string;
  propertyId: string;
  roomTypeId: string;
  channelId: string | null;
  label: string;
  url: string;
};

export async function syncFeed(feed: FeedRow): Promise<SyncResult> {
  let imported = 0;
  let cancelled = 0;
  let conflicts = 0;

  try {
    const resp = await fetch(feed.url, { headers: { "User-Agent": "HMS-iCal-Sync" } });
    if (!resp.ok) throw new Error(`โหลดลิงก์ไม่สำเร็จ (HTTP ${resp.status})`);
    const text = await resp.text();
    const events = parseIcal(text);
    const seen = new Set<string>();

    for (const ev of events) {
      if (ev.end <= ev.start) continue; // ข้าม event ที่ไม่ถูกต้อง
      seen.add(ev.uid);
      try {
        const { idempotentHit } = await createReservation({
          propertyId: feed.propertyId,
          roomTypeId: feed.roomTypeId,
          checkinDate: ev.start,
          checkoutDate: ev.end,
          guestName: `${feed.label}: ${ev.summary || "Booking"}`.slice(0, 120),
          channelId: feed.channelId,
          externalRef: ev.uid,
        });
        if (!idempotentHit) imported++;
      } catch (e) {
        if (e instanceof SoldOutError) conflicts++; // วันที่นี้เราขายไปแล้ว = ชนกัน (กัน overbooking)
        else if (e instanceof InvalidDatesError) continue;
        else throw e;
      }
    }

    // การจองที่หายจาก feed = OTA ยกเลิก → คืนวันที่
    if (feed.channelId) {
      const existing = await prisma.reservation.findMany({
        where: { channelId: feed.channelId, status: { not: "cancelled" }, externalRef: { not: null } },
        select: { id: true, externalRef: true },
      });
      for (const r of existing) {
        if (r.externalRef && !seen.has(r.externalRef)) {
          await cancelReservation(r.id);
          cancelled++;
        }
      }
    }

    const result = `นำเข้า ${imported} · ยกเลิก ${cancelled} · ชน ${conflicts}`;
    await prisma.icalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastResult: result } });
    return { label: feed.label, imported, cancelled, conflicts };
  } catch (e) {
    const error = (e as Error).message ?? "sync ล้มเหลว";
    await prisma.icalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastResult: `❌ ${error}` } });
    return { label: feed.label, imported, cancelled, conflicts, error };
  }
}

/** sync ทุก feed ของ org */
export async function syncOrg(orgId: string): Promise<SyncResult[]> {
  const feeds = await prisma.icalFeed.findMany({ where: { property: { orgId } } });
  const results: SyncResult[] = [];
  for (const f of feeds) {
    results.push(await syncFeed(f));
  }
  return results;
}
