import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import RoomStatusButton from "./RoomStatusButton";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  clean: { label: "สะอาด · พร้อมขาย", cls: "confirmed" },
  dirty: { label: "รอทำความสะอาด", cls: "pending" },
  occupied: { label: "มีแขกพัก", cls: "channel" },
  out_of_order: { label: "ปิดปรับปรุง", cls: "cancelled" },
};

export default async function HousekeepingPage() {
  const user = await requireUser();
  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property) {
    return <main className="container"><h1 className="page-title">แม่บ้าน</h1><p className="muted">ยังไม่มีที่พัก</p></main>;
  }

  const rooms = await prisma.room.findMany({
    where: { propertyId: property.id },
    include: { roomType: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { number: "asc" }],
  });

  const counts = rooms.reduce((m, r) => { m[r.status] = (m[r.status] ?? 0) + 1; return m; }, {} as Record<string, number>);
  // เรียง: dirty ก่อน (ให้แม่บ้านเห็นงานที่ต้องทำก่อน)
  const order = ["dirty", "clean", "occupied", "out_of_order"];
  const sorted = [...rooms].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.number.localeCompare(b.number));

  return (
    <main className="container">
      <h1 className="page-title">แม่บ้าน (Housekeeping)</h1>
      <p className="page-sub">{property.name}</p>

      <div className="stat-grid">
        {order.map((s) => (
          <div className="stat-card" key={s}>
            <div className="label">{STATUS[s].label}</div>
            <div className="value">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h2>สถานะห้องทั้งหมด ({rooms.length})</h2></div>
        <div className="cal-wrap">
          {rooms.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>ยังไม่มีห้อง — เพิ่มประเภทห้องในหน้าตั้งค่า</p>
          ) : (
            <table className="table">
              <thead><tr><th>ห้อง</th><th>ประเภท</th><th>สถานะ</th><th></th></tr></thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.number}</strong></td>
                    <td>{r.roomType.name}</td>
                    <td><span className={`badge ${STATUS[r.status]?.cls ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</span></td>
                    <td style={{ textAlign: "right" }}><RoomStatusButton id={r.id} status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
