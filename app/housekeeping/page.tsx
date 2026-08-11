import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import RoomStatusButton from "./RoomStatusButton";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = { clean: "confirmed", dirty: "pending", occupied: "channel", out_of_order: "cancelled" };
const STATUS_KEY: Record<string, string> = { clean: "hk.clean", dirty: "hk.dirty", occupied: "hk.occupied", out_of_order: "hk.ooo" };

export default async function HousekeepingPage() {
  const user = await requireUser();
  const lang = await getLang();
  const t = makeT(lang);
  const property = await prisma.property.findFirst({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } });
  if (!property) {
    return <main className="container"><h1 className="page-title">{t("hk.title")}</h1><p className="muted">{t("dash.noProperty")}</p></main>;
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
      <h1 className="page-title">{t("hk.title")}</h1>
      <p className="page-sub">{property.name}</p>

      <div className="stat-grid">
        {order.map((s) => (
          <div className="stat-card" key={s}>
            <div className="label">{t(STATUS_KEY[s])}</div>
            <div className="value">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h2>{t("hk.allRooms")} ({rooms.length})</h2></div>
        <div className="cal-wrap">
          {rooms.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>{t("hk.noRooms")}</p>
          ) : (
            <table className="table">
              <thead><tr><th>{t("common.room")}</th><th>{t("hk.type")}</th><th>{t("res.status")}</th><th></th></tr></thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.number}</strong></td>
                    <td>{r.roomType.name}</td>
                    <td><span className={`badge ${STATUS_CLS[r.status] ?? ""}`}>{t(STATUS_KEY[r.status] ?? r.status)}</span></td>
                    <td style={{ textAlign: "right" }}><RoomStatusButton id={r.id} lang={lang} status={r.status} /></td>
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
