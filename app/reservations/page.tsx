import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentStatus } from "@/lib/payments";
import CancelButton from "./CancelButton";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

const statusLabel: Record<string, string> = {
  confirmed: "ยืนยันแล้ว",
  pending: "รอดำเนินการ",
  cancelled: "ยกเลิกแล้ว",
  checked_in: "เช็คอินแล้ว",
  checked_out: "เช็คเอาต์แล้ว",
  no_show: "ไม่มาเข้าพัก",
};

export default async function ReservationsPage() {
  const user = await requireUser();
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
          <h1 className="page-title">การจองทั้งหมด</h1>
          <p className="page-sub">{list.length} รายการล่าสุด</p>
        </div>
        <Link href="/book" className="btn">+ สร้างการจอง</Link>
      </div>

      <div className="card">
        <div className="cal-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ผู้เข้าพัก</th>
                <th>ห้อง</th>
                <th>เช็คอิน → เช็คเอาต์</th>
                <th>ช่องทาง</th>
                <th>ยอดรวม</th>
                <th>การชำระ</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    ยังไม่มีการจอง — <Link href="/book" style={{ color: "var(--primary)" }}>สร้างรายการแรก</Link>
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
                        {pay.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === "cancelled" ? "cancelled" : r.status === "pending" ? "pending" : "confirmed"}`}>
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.status !== "cancelled" && <CancelButton id={r.id} otaLocked={!!r.externalRef} paidAmount={paid} />}
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
