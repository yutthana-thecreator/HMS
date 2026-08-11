import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import AdminLogout from "./AdminLogout";
import PaymentReview from "./PaymentReview";
import AdminOrgActions from "./AdminOrgActions";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

const statusTH: Record<string, string> = {
  trialing: "ทดลองใช้",
  active: "จ่ายเงินแล้ว",
  past_due: "ค้างชำระ",
  canceled: "ยกเลิก",
};

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login");

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { properties: true, users: true } } },
  });

  // สถิติต่อโรงแรม
  const rows = await Promise.all(
    orgs.map(async (o) => {
      const [rooms, reservations] = await Promise.all([
        prisma.room.count({ where: { property: { orgId: o.id } } }),
        prisma.reservation.count({ where: { property: { orgId: o.id }, status: { not: "cancelled" } } }),
      ]);
      return { org: o, rooms, reservations, plan: getPlan(o.plan) };
    }),
  );

  const mrr = rows.filter((r) => r.org.planStatus === "active").reduce((s, r) => s + r.plan.priceTHB, 0);
  const activeCount = rows.filter((r) => r.org.planStatus === "active").length;
  const trialCount = rows.filter((r) => r.org.planStatus === "trialing").length;

  const pendingPayments = await prisma.paymentRequest.findMany({
    where: { status: "pending" },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const paymentHistory = await prisma.paymentRequest.findMany({
    where: { status: { in: ["confirmed", "rejected"] } },
    include: { organization: { select: { name: true } } },
    orderBy: { reviewedAt: "desc" },
    take: 30,
  });

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 className="page-title">Admin · แพลตฟอร์ม</h1>
          <p className="page-sub">ภาพรวมทุกโรงแรมในระบบ</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn-ghost" href="/admin/flow" style={{ color: "var(--primary)", borderColor: "var(--border)" }}>
            📊 Flowchart ระบบ
          </Link>
          <AdminLogout />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">โรงแรมทั้งหมด</div>
          <div className="value">{orgs.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">จ่ายเงินอยู่ (active)</div>
          <div className="value">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">ทดลองใช้</div>
          <div className="value">{trialCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">รายได้/เดือน (MRR)</div>
          <div className="value">฿{money(mrr)}</div>
        </div>
      </div>

      {/* ---- รอยืนยันการชำระเงิน (PromptPay) ---- */}
      <div className="card" style={{ marginBottom: 24, borderColor: pendingPayments.length ? "var(--primary)" : undefined }}>
        <div className="card-head">
          <h2>💰 รอยืนยันการชำระเงิน {pendingPayments.length > 0 && <span className="badge pending">{pendingPayments.length}</span>}</h2>
        </div>
        <div className="cal-wrap">
          {pendingPayments.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>ไม่มีคำขอรอยืนยัน</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>โรงแรม</th><th>แพ็กเกจ</th><th>รอบ</th><th>ยอด</th><th>แจ้งเมื่อ</th><th></th></tr>
              </thead>
              <tbody>
                {pendingPayments.map((pr) => (
                  <tr key={pr.id}>
                    <td><strong>{pr.organization.name}</strong></td>
                    <td>{getPlan(pr.plan).name}</td>
                    <td>{pr.cycle === "yearly" ? "รายปี" : "รายเดือน"}</td>
                    <td style={{ fontWeight: 700 }}>฿{money(pr.amount)}</td>
                    <td className="mono">{pr.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td style={{ textAlign: "right" }}><PaymentReview id={pr.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>รายชื่อโรงแรม</h2></div>
        <div className="cal-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>โรงแรม</th><th>แพ็กเกจ</th><th>สถานะ</th><th>ห้อง</th><th>การจอง</th><th>ผู้ใช้</th><th>หมดอายุ</th><th>สมัครเมื่อ</th><th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ org, rooms, reservations, plan }) => (
                <tr key={org.id}>
                  <td><strong>{org.name}</strong></td>
                  <td>{plan.name}</td>
                  <td>
                    {org.suspended ? (
                      <span className="badge cancelled">ระงับ</span>
                    ) : (
                      <span className={`badge ${org.planStatus === "active" ? "confirmed" : org.planStatus === "trialing" ? "pending" : "cancelled"}`}>
                        {statusTH[org.planStatus] ?? org.planStatus}
                      </span>
                    )}
                  </td>
                  <td>{rooms}</td>
                  <td>{reservations}</td>
                  <td>{org._count.users}</td>
                  <td className="mono">{org.currentPeriodEnd ? org.currentPeriodEnd.toISOString().slice(0, 10) : "-"}</td>
                  <td className="mono">{org.createdAt.toISOString().slice(0, 10)}</td>
                  <td><AdminOrgActions id={org.id} name={org.name} plan={org.plan} suspended={org.suspended} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- ประวัติการชำระเงิน ---- */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-head"><h2>ประวัติการชำระเงิน</h2></div>
        <div className="cal-wrap">
          {paymentHistory.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>ยังไม่มีประวัติ</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>โรงแรม</th><th>แพ็กเกจ</th><th>รอบ</th><th>ยอด</th><th>สถานะ</th><th>ดำเนินการเมื่อ</th><th>โดย</th></tr>
              </thead>
              <tbody>
                {paymentHistory.map((pr) => (
                  <tr key={pr.id}>
                    <td>{pr.organization.name}</td>
                    <td>{getPlan(pr.plan).name}</td>
                    <td>{pr.cycle === "yearly" ? "รายปี" : "รายเดือน"}</td>
                    <td style={{ fontWeight: 600 }}>฿{money(pr.amount)}</td>
                    <td>
                      <span className={`badge ${pr.status === "confirmed" ? "confirmed" : "cancelled"}`}>
                        {pr.status === "confirmed" ? "ยืนยันแล้ว" : "ปฏิเสธ"}
                      </span>
                    </td>
                    <td className="mono">{pr.reviewedAt ? pr.reviewedAt.toISOString().slice(0, 16).replace("T", " ") : "-"}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{pr.reviewedBy ?? "-"}</td>
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
