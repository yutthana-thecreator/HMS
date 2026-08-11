import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nightCount } from "@/lib/dates";
import { paymentStatus } from "@/lib/payments";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import CancelButton from "../CancelButton";
import PaymentForm from "./PaymentForm";
import DeletePaymentButton from "./DeletePaymentButton";
import SendConfirmationButton from "./SendConfirmationButton";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

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
  const lang = await getLang();
  const t = makeT(lang);
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
        <h1 className="page-title">{t("resd.booking")} {r.code}</h1>
        <Link href="/reservations" className="btn btn-ghost" style={{ color: "var(--primary)" }}>{t("common.back")}</Link>
      </div>
      <p className="page-sub">
        <span className={`badge ${r.status === "cancelled" ? "cancelled" : r.status === "pending" ? "pending" : "confirmed"}`}>
          {t(`status.${r.status}`)}
        </span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div className="card">
          <div className="card-head"><h2>{t("resd.guest")}</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label={t("resd.name")} value={r.guest?.fullName ?? "-"} />
            <Row label={t("resd.email")} value={r.guest?.email ?? "-"} />
            <Row label={t("resd.phone")} value={r.guest?.phone ?? "-"} />
            <Row label={t("resd.guests")} value={room?.guestsCount ?? "-"} />
            {r.guest?.idCardImage && (
              <div style={{ paddingTop: 12 }}>
                <div className="muted" style={{ marginBottom: 6 }}>{t("resd.idCard")}</div>
                <a href={r.guest.idCardImage} target="_blank" rel="noopener noreferrer">
                  <img src={r.guest.idCardImage} alt="ID card" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>{t("resd.room")}</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label={t("resd.roomType")} value={room?.roomType.name ?? "-"} />
            <Row label={t("resd.roomsCount")} value={`${r.rooms.length} ${t("common.rooms")}`} />
            <Row label={t("resd.checkin")} value={<span className="mono">{room?.checkinDate ?? "-"}</span>} />
            <Row label={t("resd.checkout")} value={<span className="mono">{room?.checkoutDate ?? "-"}</span>} />
            <Row label={t("resd.nights")} value={`${nights} ${t("resd.nightsUnit")}`} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>{t("resd.finance")}</h2></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <Row label={t("resd.channel")} value={r.channel ? <span className="badge channel">{r.channel.name}</span> : "-"} />
            <Row label={t("resd.total")} value={`฿${money(r.totalAmount)}`} />
            <Row label={t("resd.created")} value={<span className="mono">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>} />
            {r.notes && <Row label={t("resd.notes")} value={r.notes} />}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h2>{t("resd.payments")}</h2>
          <span className={`badge ${payStatus.key === "paid" ? "confirmed" : payStatus.key === "partial" ? "pending" : "cancelled"}`}>{t(`pay.${payStatus.key}`)}</span>
        </div>
        <div className="card-body">
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>{t("resd.total")}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>฿{money(r.totalAmount)}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>{t("resd.paid")}</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--green)" }}>฿{money(paid)}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>{t("resd.remaining")}</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: remaining > 0 ? "var(--red)" : "var(--green)" }}>฿{money(remaining)}</div>
            </div>
          </div>

          {r.payments.length > 0 && (
            <div className="cal-wrap">
              <table className="table" style={{ marginBottom: 8 }}>
                <thead>
                  <tr><th>{t("resd.date")}</th><th>{t("resd.method")}</th><th>{t("resd.note")}</th><th style={{ textAlign: "right" }}>{t("resd.amount")}</th><th></th></tr>
                </thead>
                <tbody>
                  {r.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.createdAt.toISOString().slice(0, 10)}</td>
                      <td>{t(`pmethod.${p.method}`)}</td>
                      <td className="muted">{p.note ?? "-"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: p.amount < 0 ? "var(--red)" : undefined }}>
                        {p.amount < 0 ? `-฿${money(-p.amount)}` : `฿${money(p.amount)}`}
                      </td>
                      <td style={{ textAlign: "right" }}><DeletePaymentButton reservationId={r.id} paymentId={p.id} lang={lang} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r.status !== "cancelled" && <PaymentForm reservationId={r.id} remaining={remaining} lang={lang} />}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {r.guest?.email && <SendConfirmationButton id={r.id} lang={lang} />}
        {r.status !== "cancelled" && <CancelButton id={r.id} lang={lang} otaLocked={!!r.externalRef} paidAmount={paid} />}
      </div>
    </main>
  );
}
