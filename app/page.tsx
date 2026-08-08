import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPlan, isActiveSubscription } from "@/lib/plans";
import { rangeDates, todayStr, weekdayShortTH, isWeekend } from "@/lib/dates";

export const dynamic = "force-dynamic";

const DAYS = 14;

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const org = user.organization;
  const plan = getPlan(org.plan);
  const active = isActiveSubscription(org.planStatus, org.trialEndsAt);

  const property = await prisma.property.findFirst({
    where: { orgId: org.id },
    orderBy: { createdAt: "asc" },
  });

  if (!property) {
    return (
      <main className="container">
        <h1 className="page-title">ยินดีต้อนรับ 👋</h1>
        <p className="page-sub">ยังไม่มีที่พัก — ไปที่หน้าตั้งค่าเพื่อเริ่มต้น</p>
        <Link href="/settings" className="btn">ไปตั้งค่า</Link>
      </main>
    );
  }

  const today = todayStr(property.timezone);
  const dates = rangeDates(today, DAYS);

  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId: property.id },
    orderBy: { basePrice: "asc" },
    include: { _count: { select: { rooms: true } } },
  });

  const avail = await prisma.availability.findMany({
    where: { propertyId: property.id, date: { in: dates } },
  });

  const map = new Map<string, { free: number; price: number; stopSell: boolean }>();
  for (const a of avail) {
    map.set(`${a.roomTypeId}|${a.date}`, {
      free: a.unitsTotal - a.unitsSold,
      price: a.price,
      stopSell: a.stopSell,
    });
  }

  const todayRows = avail.filter((a) => a.date === today);
  const totalUnitsToday = todayRows.reduce((s, a) => s + a.unitsTotal, 0);
  const soldToday = todayRows.reduce((s, a) => s + a.unitsSold, 0);
  const occ = totalUnitsToday ? Math.round((soldToday / totalUnitsToday) * 100) : 0;
  const totalRooms = roomTypes.reduce((s, rt) => s + rt._count.rooms, 0);

  const [arrivals, inhouse, activeRes] = await Promise.all([
    prisma.reservationRoom.count({
      where: { checkinDate: today, reservation: { propertyId: property.id, status: { in: ["confirmed", "checked_in"] } } },
    }),
    prisma.reservationRoom.count({
      where: {
        checkinDate: { lte: today },
        checkoutDate: { gt: today },
        reservation: { propertyId: property.id, status: { in: ["confirmed", "checked_in"] } },
      },
    }),
    prisma.reservation.count({ where: { propertyId: property.id, status: { not: "cancelled" } } }),
  ]);

  return (
    <main className="container">
      {!active && (
        <div className="alert error" style={{ marginBottom: 20 }}>
          ⚠️ การทดลองใช้/แพ็กเกจของคุณหมดอายุแล้ว — <Link href="/settings" style={{ fontWeight: 700 }}>ต่ออายุที่นี่</Link> เพื่อใช้งานต่อ
        </div>
      )}

      <h1 className="page-title">{property.name}</h1>
      <p className="page-sub">แดชบอร์ดภาพรวม · {today}</p>

      {roomTypes.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 17, fontWeight: 600 }}>ยังไม่มีประเภทห้อง</p>
            <p className="muted">เพิ่มประเภทห้องแรกเพื่อเริ่มรับการจอง</p>
            <Link href="/settings" className="btn" style={{ marginTop: 12 }}>+ เพิ่มประเภทห้อง</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Occupancy วันนี้</div>
              <div className="value">{occ}% <small>({soldToday}/{totalUnitsToday})</small></div>
            </div>
            <div className="stat-card">
              <div className="label">เข้าพักวันนี้</div>
              <div className="value">{arrivals}</div>
            </div>
            <div className="stat-card">
              <div className="label">พักอยู่ (In-house)</div>
              <div className="value">{inhouse}</div>
            </div>
            <div className="stat-card">
              <div className="label">การจองทั้งหมด</div>
              <div className="value">{activeRes}</div>
            </div>
            <div className="stat-card">
              <div className="label">ห้องทั้งหมด</div>
              <div className="value">{totalRooms} <small>/ {plan.maxRooms}</small></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>ปฏิทินห้องว่าง · {DAYS} วันข้างหน้า</h2>
              <Link href="/book" className="btn">+ สร้างการจอง</Link>
            </div>
            <div className="card-body">
              <div className="cal-wrap">
                <table className="cal">
                  <thead>
                    <tr>
                      <th className="rt-name">ประเภทห้อง</th>
                      {dates.map((d) => (
                        <th key={d} className={isWeekend(d) ? "weekend" : ""}>
                          <div>{weekdayShortTH(d)}</div>
                          <div>{d.slice(8, 10)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((rt) => (
                      <tr key={rt.id}>
                        <td className="rt-name">
                          {rt.name}
                          <small>{rt._count.rooms} ห้อง · ฿{money(rt.basePrice)}</small>
                        </td>
                        {dates.map((d) => {
                          const cell = map.get(`${rt.id}|${d}`);
                          const free = cell?.free ?? 0;
                          const cls = cell?.stopSell || free <= 0 ? "full" : free <= 1 ? "low" : "ok";
                          return (
                            <td key={d}>
                              <div className={`cell ${cls}`}>
                                <div className="avail">{cell?.stopSell ? "×" : free}</div>
                                <div className="price">฿{money(cell?.price ?? 0)}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="legend" style={{ marginTop: 14 }}>
                <span><span className="dot" style={{ background: "var(--green-soft)" }} /> ว่าง</span>
                <span><span className="dot" style={{ background: "var(--amber-soft)" }} /> เหลือน้อย (1)</span>
                <span><span className="dot" style={{ background: "var(--red-soft)" }} /> เต็ม / ปิดขาย</span>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
