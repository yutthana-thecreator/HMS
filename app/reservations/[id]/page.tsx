import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nightCount } from "@/lib/dates";
import { paymentStatus, PAYMENT_METHODS } from "@/lib/payments";
import CancelButton from "../CancelButton";
import PaymentForm from "./PaymentForm";
import DeletePaymentButton from "./DeletePaymentButton";
import SendConfirmationButton from "./SendConfirmationButton";

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const r = await prisma.reservation.findFirst({
    where: { id, property: { orgId: user.orgId } },
    include: {
      guest: true,
      channel: true,
      rooms: { include: { roomType: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) notFound();

  const room = r.rooms[0];
  const nights = room ? nightCount(room.checkinDate, room.checkoutDate) : 0;
  const paid = r.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, r.totalAmount - paid);
  const payStatus = paymentStatus(r.totalAmount, paid);

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 className="page-title">การจอง {r.code}</h1>
        <Link href="/reservations" className="btn btn-ghost" style={{ color: "var(--primary)" }}>← กลับ</Link>
      </div>
      <p className="page-sub">
        <span className={`badge ${r.status === "cancelled" ? "cancelled" : r.status === "pending" ? "pending" : "confirmed"}`}>
          {statusLabel[r.status] ?? r.status}
        </span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div className="card">
          <div className="card-head"><h2>ผู้เข้าพัก</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label="ชื่อ" value={r.guest?.fullName ?? "-"} />
            <Row label="อีเมล" value={r.guest?.email ?? "-"} />
            <Row label="โทรศัพท์" value={r.guest?.phone ?? "-"} />
            <Row label="จำนวนผู้เข้าพัก" value={room?.guestsCount ?? "-"} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>ห้องพัก</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label="ประเภทห้อง" value={room?.roomType.name ?? "-"} />
            <Row label="เช็คอิน" value={<span className="mono">{room?.checkinDate ?? "-"}</span>} />
            <Row label="เช็คเอาต์" value={<span className="mono">{room?.checkoutDate ?? "-"}</span>} />
            <Row label="จำนวนคืน" value={`${nights} คืน`} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>การเงิน & ช่องทาง</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label="ช่องทาง" value={r.channel ? <span className="badge channel">{r.channel.name}</span> : "-"} />
            <Row label="ยอดรวม" value={`฿${money(r.totalAmount)}`} />
            <Row label="สร้างเมื่อ" value={<span className="mono">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>} />
            {r.notes && <Row label="หมายเหตุ" value={r.notes} />}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h2>การชำระเงิน</h2>
          <span className={`badge ${payStatus.key === "paid" ? "confirmed" : payStatus.key === "partial" ? "pending" : "cancelled"}`}>{payStatus.label}</span>
        </div>
        <div className="card-body">
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>ยอดรวม</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>฿{money(r.totalAmount)}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>จ่ายแล้ว</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--green)" }}>฿{money(paid)}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>คงเหลือ</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: remaining > 0 ? "var(--red)" : "var(--green)" }}>฿{money(remaining)}</div>
            </div>
          </div>

          {r.payments.length > 0 && (
            <div className="cal-wrap">
              <table className="table" style={{ marginBottom: 8 }}>
                <thead>
                  <tr><th>วันที่</th><th>วิธี</th><th>หมายเหตุ</th><th style={{ textAlign: "right" }}>จำนวน</th><th></th></tr>
                </thead>
                <tbody>
                  {r.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.createdAt.toISOString().slice(0, 10)}</td>
                      <td>{PAYMENT_METHODS[p.method] ?? p.method}</td>
                      <td className="muted">{p.note ?? "-"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>฿{money(p.amount)}</td>
                      <td style={{ textAlign: "right" }}><DeletePaymentButton reservationId={r.id} paymentId={p.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r.status !== "cancelled" && <PaymentForm reservationId={r.id} remaining={remaining} />}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {r.guest?.email && <SendConfirmationButton id={r.id} />}
        {r.status !== "cancelled" && <CancelButton id={r.id} otaLocked={!!r.externalRef} />}
      </div>
    </main>
  );
}
