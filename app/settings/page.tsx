import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PLANS, getPlan, yearlyDiscountPct, YEARLY_MONTHS_CHARGED } from "@/lib/plans";
import AddRoomTypeForm from "./AddRoomTypeForm";
import PromptPayBilling from "./PromptPayBilling";
import IcalManager from "./IcalManager";
import ChannelWizard from "./ChannelWizard";
import RoomTypeRow from "./RoomTypeRow";
import EmailPanel from "./EmailPanel";
import { emailConfigured } from "@/lib/email";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const cls = pct >= 100 ? "full" : pct >= 80 ? "warn" : "";
  return (
    <div className={`meter ${cls}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const t = makeT(await getLang());
  const org = user.organization;
  const plan = getPlan(org.plan);

  const pendingReq = await prisma.paymentRequest.findFirst({
    where: { orgId: org.id, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { plan: true, cycle: true, amount: true },
  });

  const [property, roomTypes, roomCount, propCount, staffCount, channels] = await Promise.all([
    prisma.property.findFirst({ where: { orgId: org.id }, orderBy: { createdAt: "asc" } }),
    prisma.roomType.findMany({
      where: { property: { orgId: org.id } },
      include: { _count: { select: { rooms: true } } },
      orderBy: { basePrice: "asc" },
    }),
    prisma.room.count({ where: { property: { orgId: org.id } } }),
    prisma.property.count({ where: { orgId: org.id } }),
    prisma.appUser.count({ where: { orgId: org.id } }),
    prisma.channel.findMany({ where: { property: { orgId: org.id } } }),
  ]);

  const icalFeeds = await prisma.icalFeed.findMany({
    where: { property: { orgId: org.id } },
    include: { roomType: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / (24 * 3600 * 1000)))
    : null;

  return (
    <main className="container">
      <h1 className="page-title">{t("set.title")}</h1>
      <p className="page-sub">{org.name}</p>

      {/* ---- แพ็กเกจปัจจุบัน + usage ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h2>{t("set.currentPlan")}: {plan.name}</h2>
          <span className={`plan-badge ${org.planStatus === "trialing" ? "trial" : ""}`}>
            {org.planStatus === "trialing"
              ? `${t("set.trialLeft")} ${trialDaysLeft} ${t("set.trialDays")}`
              : org.planStatus === "active"
                ? t("set.active")
                : org.planStatus}
          </span>
        </div>
        <div className="card-body">
          <div className="stat-grid" style={{ marginBottom: 0 }}>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{t("set.rooms")}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{roomCount} / {plan.maxRooms}</div>
              <Meter used={roomCount} limit={plan.maxRooms} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{t("set.properties")}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{propCount} / {plan.maxProperties}</div>
              <Meter used={propCount} limit={plan.maxProperties} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{t("set.staff")}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{staffCount} / {plan.staffSeats}</div>
              <Meter used={staffCount} limit={plan.staffSeats} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{t("set.cm")}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{plan.channelManager ? t("set.cmYes") : t("set.cmNo")}</div>
            </div>
          </div>
          {org.currentPeriodEnd && org.planStatus === "active" && (
            <div style={{ marginTop: 16 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {t("set.validUntil")}: <b>{org.currentPeriodEnd.toISOString().slice(0, 10)}</b> ({org.billingCycle === "yearly" ? t("set.yearly") : t("set.monthly")})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- เลือก/เปลี่ยนแพ็กเกจ (PromptPay) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("set.allPlans")}</h2></div>
        <div className="card-body">
          <PromptPayBilling
            plans={Object.values(PLANS).map((p) => ({
              id: p.id,
              name: p.name,
              priceTHB: p.priceTHB,
              maxRooms: p.maxRooms,
              maxProperties: p.maxProperties,
              staffSeats: p.staffSeats,
              channelManager: p.channelManager,
            }))}
            currentPlanId={plan.id}
            pending={pendingReq}
            yearlyDiscount={yearlyDiscountPct()}
            yearlyMonths={YEARLY_MONTHS_CHARGED}
          />
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            {t("set.ppNote")} {yearlyDiscountPct()}%
          </p>
        </div>
      </div>

      {/* ---- ประเภทห้อง ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("set.roomTypes")} ({property?.name ?? "-"})</h2></div>
        <div className="card-body">
          {roomTypes.length > 0 ? (
            <div className="cal-wrap" style={{ marginBottom: 20 }}>
              <table className="table">
                <thead>
                  <tr><th>{t("set.rtName")}</th><th>{t("set.rtCode")}</th><th>{t("common.room")}</th><th>{t("set.rtPrice")}</th><th>{t("set.rtBuffer")}</th><th></th></tr>
                </thead>
                <tbody>
                  {roomTypes.map((rt) => (
                    <RoomTypeRow key={rt.id} id={rt.id} name={rt.name} code={rt.code} units={rt._count.rooms} price={rt.basePrice} buffer={rt.otaBuffer} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 16 }}>{t("set.noRoomTypes")}</p>
          )}
          {roomTypes.length > 0 && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              💡 <b>{t("set.rtBuffer")} (buffer)</b> = {t("set.bufferNote")}
            </p>
          )}
          <AddRoomTypeForm roomsUsed={roomCount} maxRooms={plan.maxRooms} />
        </div>
      </div>

      {/* ---- เชื่อม OTA อัตโนมัติ (iCal) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("set.icalTitle")}</h2></div>
        <div className="card-body">
          {roomTypes.length === 0 ? (
            <p className="muted">{t("set.addRoomFirst")}</p>
          ) : (
            <IcalManager
              roomTypes={roomTypes.map((rt) => ({ id: rt.id, name: rt.name, code: rt.code }))}
              feeds={icalFeeds.map((f) => ({ id: f.id, label: f.label, roomTypeName: f.roomType.name, url: f.url, lastResult: f.lastResult }))}
            />
          )}
        </div>
      </div>

      {/* ---- อีเมลยืนยันจอง ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("set.emailTitle")}</h2></div>
        <div className="card-body">
          <EmailPanel configured={emailConfigured()} />
        </div>
      </div>

      {/* ---- Channel Manager (Channex) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>{t("set.cmTitle")}</h2></div>
        <div className="card-body">
          <ChannelWizard />
        </div>
      </div>

      {/* ---- ช่องทาง OTA ---- */}
      <div className="card">
        <div className="card-head"><h2>{t("set.otaTitle")}</h2></div>
        <div className="card-body">
          {channels.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {channels.map((c) => (
                <span key={c.id} className="badge channel">{c.name} · {c.type}</span>
              ))}
            </div>
          ) : (
            <p className="muted">ยังไม่มีช่องทาง — การเชื่อม Airbnb/Booking.com จะเพิ่มในเฟส Channel Integration</p>
          )}
        </div>
      </div>
    </main>
  );
}
