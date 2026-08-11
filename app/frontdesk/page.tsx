import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayStr } from "@/lib/dates";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import CheckInButton from "./CheckInButton";
import CheckOutButton from "./CheckOutButton";

export const dynamic = "force-dynamic";

export default async function FrontDeskPage() {
  const user = await requireUser();
  const lang = await getLang();
  const t = makeT(lang);
  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property) {
    return <main className="container"><h1 className="page-title">{t("fd.title")}</h1><p className="muted">{t("dash.noProperty")}</p></main>;
  }
  const today = todayStr(property.timezone);

  const [arrivals, inhouse, rooms] = await Promise.all([
    prisma.reservation.findMany({
      where: { propertyId: property.id, status: { in: ["confirmed", "pending"] }, rooms: { some: { checkinDate: { lte: today } } } },
      include: { guest: true, rooms: { include: { roomType: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: { propertyId: property.id, status: "checked_in" },
      include: { guest: true, rooms: { include: { roomType: true, room: true } } },
      orderBy: { checkinAt: "asc" },
    }),
    prisma.room.findMany({ where: { propertyId: property.id }, select: { id: true, number: true, status: true, roomTypeId: true }, orderBy: { number: "asc" } }),
  ]);

  const freeRoomsByType = new Map<string, { id: string; number: string }[]>();
  for (const r of rooms) {
    if (["occupied", "out_of_order"].includes(r.status)) continue;
    const list = freeRoomsByType.get(r.roomTypeId) ?? [];
    list.push({ id: r.id, number: r.number });
    freeRoomsByType.set(r.roomTypeId, list);
  }

  return (
    <main className="container">
      <h1 className="page-title">{t("fd.title")}</h1>
      <p className="page-sub">{property.name} · {today}</p>

      {/* Arrivals */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("fd.arrivals")} {arrivals.length > 0 && <span className="badge pending">{arrivals.length}</span>}</h2></div>
        <div className="cal-wrap">
          {arrivals.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>{t("fd.noArrivals")}</p>
          ) : (
            <table className="table">
              <thead><tr><th>{t("res.code")}</th><th>{t("res.guest")}</th><th>{t("common.room")}</th><th>{t("res.dates")}</th><th></th></tr></thead>
              <tbody>
                {arrivals.map((r) => {
                  const rr = r.rooms[0];
                  const free = freeRoomsByType.get(rr?.roomTypeId ?? "") ?? [];
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>{r.guest?.fullName ?? "-"}{rr && rr.checkinDate < today && <span className="badge cancelled" style={{ marginLeft: 6 }}>{t("fd.overdue")}</span>}</td>
                      <td>{rr?.roomType.name ?? "-"}</td>
                      <td className="mono">{rr?.checkinDate} → {rr?.checkoutDate}</td>
                      <td style={{ textAlign: "right" }}><CheckInButton reservationId={r.id} lang={lang} rooms={free} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* In-house */}
      <div className="card">
        <div className="card-head"><h2>{t("fd.inhouse")} {inhouse.length > 0 && <span className="badge confirmed">{inhouse.length}</span>}</h2></div>
        <div className="cal-wrap">
          {inhouse.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>{t("fd.noInhouse")}</p>
          ) : (
            <table className="table">
              <thead><tr><th>{t("res.code")}</th><th>{t("res.guest")}</th><th>{t("common.room")}</th><th>{t("fd.checkoutDate")}</th><th></th></tr></thead>
              <tbody>
                {inhouse.map((r) => {
                  const rr = r.rooms[0];
                  const leavingToday = rr?.checkoutDate === today;
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>{r.guest?.fullName ?? "-"}</td>
                      <td><strong>{rr?.room?.number ? `${t("common.room")} ${rr.room.number}` : rr?.roomType.name}</strong></td>
                      <td className="mono">{rr?.checkoutDate}{leavingToday && <span className="badge pending" style={{ marginLeft: 6 }}>{t("fd.leavingToday")}</span>}</td>
                      <td style={{ textAlign: "right" }}><CheckOutButton reservationId={r.id} lang={lang} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
