import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentStatus } from "@/lib/payments";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import CancelButton from "./CancelButton";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default async function ReservationsPage() {
  const user = await requireUser();
  const lang = await getLang();
  const t = makeT(lang);
  const list = await prisma.reservation.findMany({
    where: { property: { orgId: user.orgId } },
    include: { guest: true, channel: true, rooms: { include: { roomType: true } }, payments: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">{t("res.title")}</h1>
          <p className="page-sub">{list.length} {t("res.recent")}</p>
        </div>
        <Link href="/book" className="btn">{t("res.create")}</Link>
      </div>

      <div className="card">
        <div className="cal-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("res.code")}</th>
                <th>{t("res.guest")}</th>
                <th>{t("common.room")}</th>
                <th>{t("res.dates")}</th>
                <th>{t("res.channel")}</th>
                <th>{t("res.total")}</th>
                <th>{t("res.payment")}</th>
                <th>{t("res.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    {t("res.empty")}
                  </td>
                </tr>
              )}
              {list.map((r) => {
                const room = r.rooms[0];
                const paid = r.payments.reduce((s, p) => s + p.amount, 0);
                const pay = paymentStatus(r.totalAmount, paid);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/reservations/${r.id}`} className="mono" style={{ color: "var(--primary)", fontWeight: 600 }}>
                        {r.code}
                      </Link>
                    </td>
                    <td>{r.guest?.fullName ?? "-"}</td>
                    <td>{room?.roomType.name ?? "-"}</td>
                    <td className="mono">
                      {room ? `${room.checkinDate} → ${room.checkoutDate}` : "-"}
                    </td>
                    <td>
                      {r.channel ? <span className="badge channel">{r.channel.name}</span> : <span className="muted">-</span>}
                    </td>
                    <td>฿{money(r.totalAmount)}</td>
                    <td>
                      <span className={`badge ${pay.key === "paid" ? "confirmed" : pay.key === "partial" ? "pending" : "cancelled"}`}>
                        {t(`pay.${pay.key}`)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === "cancelled" ? "cancelled" : r.status === "pending" ? "pending" : "confirmed"}`}>
                        {t(`status.${r.status}`)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.status !== "cancelled" && <CancelButton id={r.id} lang={lang} otaLocked={!!r.externalRef} paidAmount={paid} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
