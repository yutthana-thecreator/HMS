import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import AdminLogout from "./AdminLogout";

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

      <div className="card">
        <div className="card-head"><h2>รายชื่อโรงแรม</h2></div>
        <div className="cal-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>โรงแรม</th><th>แพ็กเกจ</th><th>สถานะ</th><th>ห้อง</th><th>การจอง</th><th>ผู้ใช้</th><th>สมัครเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ org, rooms, reservations, plan }) => (
                <tr key={org.id}>
                  <td><strong>{org.name}</strong></td>
                  <td>{plan.name}</td>
                  <td>
                    <span className={`badge ${org.planStatus === "active" ? "confirmed" : org.planStatus === "trialing" ? "pending" : "cancelled"}`}>
                      {statusTH[org.planStatus] ?? org.planStatus}
                    </span>
                  </td>
                  <td>{rooms}</td>
                  <td>{reservations}</td>
                  <td>{org._count.users}</td>
                  <td className="mono">{org.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
