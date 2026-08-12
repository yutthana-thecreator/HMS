import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import AdminLogout from "./AdminLogout";
import PaymentReview from "./PaymentReview";
import AdminOrgActions from "./AdminOrgActions";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login");
  const lang = await getLang();
  const t = makeT(lang);

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
          <h1 className="page-title">{t("adm.title")}</h1>
          <p className="page-sub">{t("adm.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn-ghost" href="/admin/flow" style={{ color: "var(--primary)", borderColor: "var(--border)" }}>
            {t("adm.flowchart")}
          </Link>
          <AdminLogout lang={lang} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">{t("adm.totalHotels")}</div>
          <div className="value">{orgs.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">{t("adm.activePaying")}</div>
          <div className="value">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">{t("adm.trialing")}</div>
          <div className="value">{trialCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">{t("adm.mrr")}</div>
          <div className="value">฿{money(mrr)}</div>
        </div>
      </div>

      {/* ---- รอยืนยันการชำระเงิน (PromptPay) ---- */}
      <div className="card" style={{ marginBottom: 24, borderColor: pendingPayments.length ? "var(--primary)" : undefined }}>
        <div className="card-head">
          <h2>💰 {t("adm.pendingPay")} {pendingPayments.length > 0 && <span className="badge pending">{pendingPayments.length}</span>}</h2>
        </div>
        <div className="cal-wrap">
          {pendingPayments.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>{t("adm.noPending")}</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>{t("adm.hotel")}</th><th>{t("adm.plan")}</th><th>{t("adm.cycle")}</th><th>{t("adm.amount")}</th><th>{t("adm.notifiedAt")}</th><th></th></tr>
              </thead>
              <tbody>
                {pendingPayments.map((pr) => (
                  <tr key={pr.id}>
                    <td><strong>{pr.organization.name}</strong></td>
                    <td>{getPlan(pr.plan).name}</td>
                    <td>{pr.cycle === "yearly" ? t("set.yearly") : t("set.monthly")}</td>
                    <td style={{ fontWeight: 700 }}>฿{money(pr.amount)}</td>
                    <td className="mono">{pr.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td style={{ textAlign: "right" }}><PaymentReview id={pr.id} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t("adm.hotelList")}</h2></div>
        <div className="cal-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("adm.hotel")}</th><th>{t("adm.plan")}</th><th>{t("adm.statusCol")}</th><th>{t("adm.roomsCol")}</th><th>{t("adm.bookingsCol")}</th><th>{t("adm.usersCol")}</th><th>{t("adm.expiry")}</th><th>{t("adm.signupAt")}</th><th>{t("adm.manage")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ org, rooms, reservations, plan }) => (
                <tr key={org.id}>
                  <td><strong>{org.name}</strong></td>
                  <td>{plan.name}</td>
                  <td>
                    {org.suspended ? (
                      <span className="badge cancelled">{t("adm.suspended")}</span>
                    ) : (
                      <span className={`badge ${org.planStatus === "active" ? "confirmed" : org.planStatus === "trialing" ? "pending" : "cancelled"}`}>
                        {t(`st.${org.planStatus}`)}
                      </span>
                    )}
                  </td>
                  <td>{rooms}</td>
                  <td>{reservations}</td>
                  <td>{org._count.users}</td>
                  <td className="mono">{org.currentPeriodEnd ? org.currentPeriodEnd.toISOString().slice(0, 10) : "-"}</td>
                  <td className="mono">{org.createdAt.toISOString().slice(0, 10)}</td>
                  <td><AdminOrgActions id={org.id} name={org.name} plan={org.plan} suspended={org.suspended} lang={lang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- ประวัติการชำระเงิน ---- */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-head"><h2>{t("adm.payHistory")}</h2></div>
        <div className="cal-wrap">
          {paymentHistory.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>{t("adm.noHistory")}</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>{t("adm.hotel")}</th><th>{t("adm.plan")}</th><th>{t("adm.cycle")}</th><th>{t("adm.amount")}</th><th>{t("adm.statusCol")}</th><th>{t("adm.reviewedAt")}</th><th>{t("adm.by")}</th></tr>
              </thead>
              <tbody>
                {paymentHistory.map((pr) => (
                  <tr key={pr.id}>
                    <td>{pr.organization.name}</td>
                    <td>{getPlan(pr.plan).name}</td>
                    <td>{pr.cycle === "yearly" ? t("set.yearly") : t("set.monthly")}</td>
                    <td style={{ fontWeight: 600 }}>฿{money(pr.amount)}</td>
                    <td>
                      <span className={`badge ${pr.status === "confirmed" ? "confirmed" : "cancelled"}`}>
                        {pr.status === "confirmed" ? t("adm.confirmed") : t("adm.rejected")}
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
