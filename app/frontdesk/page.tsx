import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayStr } from "@/lib/dates";
import CheckInButton from "./CheckInButton";
import CheckOutButton from "./CheckOutButton";

export const dynamic = "force-dynamic";

export default async function FrontDeskPage() {
  const user = await requireUser();
  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property) {
    return <main className="container"><h1 className="page-title">หน้าเคาน์เตอร์</h1><p className="muted">ยังไม่มีที่พัก</p></main>;
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
      <h1 className="page-title">หน้าเคาน์เตอร์</h1>
      <p className="page-sub">{property.name} · {today}</p>

      {/* Arrivals */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>รอเช็คอิน {arrivals.length > 0 && <span className="badge pending">{arrivals.length}</span>}</h2></div>
        <div className="cal-wrap">
          {arrivals.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>ไม่มีแขกรอเช็คอิน</p>
          ) : (
            <table className="table">
              <thead><tr><th>รหัส</th><th>ผู้เข้าพัก</th><th>ห้อง</th><th>เข้า → ออก</th><th></th></tr></thead>
              <tbody>
                {arrivals.map((r) => {
                  const rr = r.rooms[0];
                  const free = freeRoomsByType.get(rr?.roomTypeId ?? "") ?? [];
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>{r.guest?.fullName ?? "-"}{rr && rr.checkinDate < today && <span className="badge cancelled" style={{ marginLeft: 6 }}>เกินกำหนด</span>}</td>
                      <td>{rr?.roomType.name ?? "-"}</td>
                      <td className="mono">{rr?.checkinDate} → {rr?.checkoutDate}</td>
                      <td style={{ textAlign: "right" }}><CheckInButton reservationId={r.id} rooms={free} /></td>
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
        <div className="card-head"><h2>พักอยู่ (In-house) {inhouse.length > 0 && <span className="badge confirmed">{inhouse.length}</span>}</h2></div>
        <div className="cal-wrap">
          {inhouse.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>ไม่มีแขกพักอยู่</p>
          ) : (
            <table className="table">
              <thead><tr><th>รหัส</th><th>ผู้เข้าพัก</th><th>ห้อง</th><th>ออกวันที่</th><th></th></tr></thead>
              <tbody>
                {inhouse.map((r) => {
                  const rr = r.rooms[0];
                  const leavingToday = rr?.checkoutDate === today;
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>{r.guest?.fullName ?? "-"}</td>
                      <td><strong>{rr?.room?.number ? `ห้อง ${rr.room.number}` : rr?.roomType.name}</strong></td>
                      <td className="mono">{rr?.checkoutDate}{leavingToday && <span className="badge pending" style={{ marginLeft: 6 }}>ออกวันนี้</span>}</td>
                      <td style={{ textAlign: "right" }}><CheckOutButton reservationId={r.id} /></td>
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
