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
      <h1 className="page-title">ตั้งค่า & แพ็กเกจ</h1>
      <p className="page-sub">{org.name}</p>

      {/* ---- แพ็กเกจปัจจุบัน + usage ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h2>แพ็กเกจปัจจุบัน: {plan.name}</h2>
          <span className={`plan-badge ${org.planStatus === "trialing" ? "trial" : ""}`}>
            {org.planStatus === "trialing"
              ? `ทดลองใช้ · เหลือ ${trialDaysLeft} วัน`
              : org.planStatus === "active"
                ? "ใช้งานอยู่"
                : org.planStatus}
          </span>
        </div>
        <div className="card-body">
          <div className="stat-grid" style={{ marginBottom: 0 }}>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>ห้องพัก</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{roomCount} / {plan.maxRooms}</div>
              <Meter used={roomCount} limit={plan.maxRooms} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>ที่พัก (Property)</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{propCount} / {plan.maxProperties}</div>
              <Meter used={propCount} limit={plan.maxProperties} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>ผู้ใช้งาน (Staff)</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{staffCount} / {plan.staffSeats}</div>
              <Meter used={staffCount} limit={plan.staffSeats} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Channel Manager</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{plan.channelManager ? "✓ ใช้ได้" : "✗ (เฉพาะ iCal)"}</div>
            </div>
          </div>
          {org.currentPeriodEnd && org.planStatus === "active" && (
            <div style={{ marginTop: 16 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                ใช้งานได้ถึง: <b>{org.currentPeriodEnd.toISOString().slice(0, 10)}</b> ({org.billingCycle === "yearly" ? "รายปี" : "รายเดือน"})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- เลือก/เปลี่ยนแพ็กเกจ (PromptPay) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>แพ็กเกจทั้งหมด</h2></div>
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
            💳 ชำระผ่าน PromptPay — สแกน QR จ่ายตามยอด แล้วผู้ดูแลยืนยัน · รายปีประหยัด {yearlyDiscountPct()}%
          </p>
        </div>
      </div>

      {/* ---- ประเภทห้อง ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>ประเภทห้อง ({property?.name ?? "-"})</h2></div>
        <div className="card-body">
          {roomTypes.length > 0 ? (
            <div className="cal-wrap" style={{ marginBottom: 20 }}>
              <table className="table">
                <thead>
                  <tr><th>ชื่อ</th><th>รหัส</th><th>ห้อง</th><th>ราคา/คืน (฿)</th><th>กัน OTA</th><th></th></tr>
                </thead>
                <tbody>
                  {roomTypes.map((rt) => (
                    <RoomTypeRow key={rt.id} id={rt.id} name={rt.name} code={rt.code} units={rt._count.rooms} price={rt.basePrice} buffer={rt.otaBuffer} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 16 }}>ยังไม่มีประเภทห้อง — เพิ่มด้านล่างเพื่อเริ่มรับการจอง</p>
          )}
          {roomTypes.length > 0 && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              💡 <b>กัน OTA (buffer)</b> = กันห้องไว้ไม่ขายบน OTA (เช่น 1 = กันห้องสุดท้าย) → กัน overbooking · จองตรงยังขายได้ · 0 = ขายเต็ม
            </p>
          )}
          <AddRoomTypeForm roomsUsed={roomCount} maxRooms={plan.maxRooms} />
        </div>
      </div>

      {/* ---- เชื่อม OTA อัตโนมัติ (iCal) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>เชื่อม OTA อัตโนมัติ (iCal)</h2></div>
        <div className="card-body">
          {roomTypes.length === 0 ? (
            <p className="muted">เพิ่มประเภทห้องก่อน แล้วจึงเชื่อม OTA ได้</p>
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
        <div className="card-head"><h2>อีเมลยืนยันการจอง</h2></div>
        <div className="card-body">
          <EmailPanel configured={emailConfigured()} />
        </div>
      </div>

      {/* ---- Channel Manager (Channex) ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>Channel Manager — เชื่อม OTA (เรียลไทม์)</h2></div>
        <div className="card-body">
          <ChannelWizard />
        </div>
      </div>

      {/* ---- ช่องทาง OTA ---- */}
      <div className="card">
        <div className="card-head"><h2>ช่องทางการจอง (OTA)</h2></div>
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
