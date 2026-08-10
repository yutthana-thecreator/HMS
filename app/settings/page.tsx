import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PLANS, getPlan } from "@/lib/plans";
import AddRoomTypeForm from "./AddRoomTypeForm";
import PlanSelector from "./PlanSelector";
import IcalManager from "./IcalManager";
import ChannelWizard from "./ChannelWizard";
import BufferInput from "./BufferInput";

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
        </div>
      </div>

      {/* ---- เลือก/เปลี่ยนแพ็กเกจ ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>แพ็กเกจทั้งหมด</h2></div>
        <div className="card-body">
          <div className="plan-grid">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className={`plan-tier ${p.id === plan.id ? "current" : ""}`}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</div>
                <div className="price">฿{money(p.priceTHB)}<span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>/เดือน</span></div>
                <ul>
                  <li>{p.maxRooms} ห้อง</li>
                  <li>{p.maxProperties} ที่พัก</li>
                  <li>{p.staffSeats} ผู้ใช้งาน</li>
                  <li>{p.channelManager ? "เชื่อม OTA เรียลไทม์" : "iCal เท่านั้น"}</li>
                </ul>
                <div style={{ marginTop: 14 }}>
                  <PlanSelector planId={p.id} current={p.id === plan.id} />
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            💳 การชำระเงินจริงผ่าน Stripe จะเชื่อมในเฟสถัดไป — ตอนนี้เปลี่ยนแพ็กเกจได้เพื่อทดสอบ limit
          </p>
        </div>
      </div>

      {/* ---- ประเภทห้อง ---- */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h2>ประเภทห้อง ({property?.name ?? "-"})</h2></div>
        <div className="card-body">
          {roomTypes.length > 0 ? (
            <table className="table" style={{ marginBottom: 20 }}>
              <thead>
                <tr><th>ชื่อ</th><th>รหัส</th><th>จำนวนห้อง</th><th>ราคา/คืน</th><th>กัน OTA (buffer)</th></tr>
              </thead>
              <tbody>
                {roomTypes.map((rt) => (
                  <tr key={rt.id}>
                    <td>{rt.name}</td>
                    <td className="mono">{rt.code}</td>
                    <td>{rt._count.rooms}</td>
                    <td>฿{money(rt.basePrice)}</td>
                    <td><BufferInput id={rt.id} value={rt.otaBuffer} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
