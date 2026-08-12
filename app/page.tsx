import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { getPlan, isActiveSubscription } from "@/lib/plans";
import { rangeDates, todayStr, weekdayShortTH, isWeekend } from "@/lib/dates";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import Landing from "./Landing";

export const dynamic = "force-dynamic";

const DAYS = 14;

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default async function HomePage() {
  const lang = await getLang();
  // ผู้เยี่ยมชมที่ยังไม่ล็อกอิน → หน้า Landing (การตลาด) · ล็อกอินแล้ว → แดชบอร์ด
  const current = await getCurrentUser();
  if (!current) return <Landing lang={lang} />;

  const user = await requireUser();
  const t = makeT(lang);
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
        <h1 className="page-title">{t("dash.welcome")}</h1>
        <p className="page-sub">{t("dash.noProperty")}</p>
        <Link href="/settings" className="btn">{t("dash.goSettings")}</Link>
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

  // ---- รายได้ ----
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`);
  const [paidMonthAgg, bookedActiveAgg, paidActiveAgg] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { reservation: { propertyId: property.id }, createdAt: { gte: monthStart } } }),
    prisma.reservation.aggregate({ _sum: { totalAmount: true }, where: { propertyId: property.id, status: { not: "cancelled" } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { reservation: { propertyId: property.id, status: { not: "cancelled" } } } }),
  ]);
  const revenueMonth = paidMonthAgg._sum.amount ?? 0;
  const outstanding = Math.max(0, (bookedActiveAgg._sum.totalAmount ?? 0) - (paidActiveAgg._sum.amount ?? 0));
  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

  return (
    <main className="container">
      {!active && (
        <div className="alert error" style={{ marginBottom: 20 }}>
          ⚠️ {t("dash.trialExpired")} — <Link href="/settings" style={{ fontWeight: 700 }}>{t("dash.renewHere")}</Link>
        </div>
      )}

      <h1 className="page-title">{property.name}</h1>
      <p className="page-sub">{t("dash.subtitle")} · {today}</p>

      {roomTypes.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 17, fontWeight: 600 }}>{t("dash.noRoomTypes")}</p>
            <p className="muted">{t("dash.addFirstRoomType")}</p>
            <Link href="/settings" className="btn" style={{ marginTop: 12 }}>{t("dash.addRoomType")}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">{t("dash.occToday")}</div>
              <div className="value">{occ}% <small>({soldToday}/{totalUnitsToday})</small></div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.arrivalsToday")}</div>
              <div className="value">{arrivals}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.inhouse")}</div>
              <div className="value">{inhouse}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.totalBookings")}</div>
              <div className="value">{activeRes}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.revenueMonth")}</div>
              <div className="value" style={{ color: "var(--green)" }}>฿{fmt(revenueMonth)}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.outstanding")}</div>
              <div className="value" style={{ color: outstanding > 0 ? "var(--red)" : undefined }}>฿{fmt(outstanding)}</div>
            </div>
            <div className="stat-card">
              <div className="label">{t("dash.totalRooms")}</div>
              <div className="value">{totalRooms} <small>/ {plan.maxRooms}</small></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>{t("dash.calendar")} · {DAYS} {t("dash.daysAhead")}</h2>
              <Link href="/book" className="btn">{t("dash.createBooking")}</Link>
            </div>
            <div className="card-body">
              <div className="cal-wrap">
                <table className="cal">
                  <thead>
                    <tr>
                      <th className="rt-name">{t("dash.roomType")}</th>
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
                          <small>{rt._count.rooms} {t("dash.rooms")} · ฿{money(rt.basePrice)}</small>
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
                <span><span className="dot" style={{ background: "var(--green-soft)" }} /> {t("dash.legendFree")}</span>
                <span><span className="dot" style={{ background: "var(--amber-soft)" }} /> {t("dash.legendLow")} (1)</span>
                <span><span className="dot" style={{ background: "var(--red-soft)" }} /> {t("dash.legendFull")}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
