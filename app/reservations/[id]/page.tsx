import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nightCount } from "@/lib/dates";
import CancelButton from "../CancelButton";

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
    include: { guest: true, channel: true, rooms: { include: { roomType: true } } },
  });
  if (!r) notFound();

  const room = r.rooms[0];
  const nights = room ? nightCount(room.checkinDate, room.checkoutDate) : 0;

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

      {r.status !== "cancelled" && (
        <div style={{ marginTop: 20 }}>
          <CancelButton id={r.id} />
        </div>
      )}
    </main>
  );
}
