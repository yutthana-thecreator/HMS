import Link from "next/link";
import { PLANS, yearlyDiscountPct } from "@/lib/plans";
import type { Lang } from "@/lib/i18n";

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

const OTAS = ["Airbnb", "Booking.com", "Agoda", "Expedia", "Trip.com", "Tripadvisor"];

export default function Landing({ lang = "th" }: { lang?: Lang }) {
  const en = lang === "en";

  const features = en
    ? [
        { ic: "📅", h: "Calendar & anti-overbooking", p: "Real-time availability with atomic stock control — zero double-bookings, even across every channel." },
        { ic: "🔗", h: "Automatic OTA sync", p: "Push availability & rates to Airbnb, Booking.com and Agoda the moment anything changes, via Channel Manager." },
        { ic: "🛎️", h: "Check-in & housekeeping", p: "Run arrivals and departures from the front desk, with live room status for your housekeeping team." },
        { ic: "✉️", h: "Automatic confirmations", p: "Guests get a booking confirmation email instantly — sent from your own property's name." },
        { ic: "💳", h: "Get paid with PromptPay", p: "Generate PromptPay QR codes, track deposits and balances, and never lose sight of what's owed." },
        { ic: "📊", h: "Dashboard & reports", p: "Occupancy, revenue and bookings at a glance — the whole business on one screen, every day." },
      ]
    : [
        { ic: "📅", h: "ปฏิทิน & กัน overbooking", p: "ปฏิทินห้องว่างเรียลไทม์ ตัดสต็อกแบบ atomic กันจองซ้ำ 100% แม้จองพร้อมกันหลายช่องทาง" },
        { ic: "🔗", h: "เชื่อม OTA อัตโนมัติ", p: "sync ห้องว่าง/ราคาไป Airbnb, Booking.com, Agoda ทันทีที่มีการเปลี่ยนแปลง ผ่าน Channel Manager" },
        { ic: "🛎️", h: "เช็คอิน-เอาต์ & แม่บ้าน", p: "หน้าเคาน์เตอร์จัดการเช็คอิน/เช็คเอาต์ พร้อมสถานะห้องเรียลไทม์ให้ทีมแม่บ้าน" },
        { ic: "✉️", h: "อีเมลยืนยันอัตโนมัติ", p: "ส่งอีเมลยืนยันการจองให้ลูกค้าทันทีที่จอง — ในชื่อแบรนด์โรงแรมของคุณเอง" },
        { ic: "💳", h: "รับชำระผ่าน PromptPay", p: "สร้าง QR PromptPay เก็บเงินง่าย ติดตามมัดจำ/ยอดค้างชำระได้ครบทุกการจอง" },
        { ic: "📊", h: "แดชบอร์ด & รายงาน", p: "Occupancy รายได้ ยอดจอง เห็นภาพรวมธุรกิจทั้งหมดในหน้าเดียว ทุกวัน" },
      ];

  const steps = en
    ? [
        { h: "Sign up & add rooms", p: "Create a free account, add your room types and rates — takes just a few minutes." },
        { h: "Connect your OTAs", p: "One click connects the Channel Manager and pushes your rooms & rates to every site." },
        { h: "Start taking bookings", p: "Bookings from every channel flow in — anti-overbooking, emails and payments handled automatically." },
      ]
    : [
        { h: "สมัคร & ตั้งค่าห้อง", p: "สมัครฟรี เพิ่มประเภทห้องและราคา ใช้เวลาไม่กี่นาที" },
        { h: "เชื่อม OTA ของคุณ", p: "กดปุ่มเดียวเชื่อม Channel Manager ดันห้อง/ราคาขึ้นทุกเว็บอัตโนมัติ" },
        { h: "เริ่มรับจอง", p: "รับจองทุกช่องทาง ระบบกัน overbooking + ส่งอีเมล + เก็บเงินให้อัตโนมัติ" },
      ];

  const planFeatures = (id: string) => {
    const p = PLANS[id as keyof typeof PLANS];
    const rooms = p.maxRooms >= 9999 ? (en ? "Unlimited rooms" : "ห้องไม่จำกัด") : `${p.maxRooms} ${en ? "rooms" : "ห้อง"}`;
    const props = p.maxProperties >= 999 ? (en ? "Multiple properties" : "หลายที่พัก") : `${p.maxProperties} ${en ? "property" : "ที่พัก"}`;
    const staff = p.staffSeats >= 999 ? (en ? "Unlimited staff" : "ทีมไม่จำกัด") : `${p.staffSeats} ${en ? "staff seats" : "ผู้ใช้งาน"}`;
    return [rooms, props, staff, en ? "Real-time OTA sync" : "เชื่อม OTA เรียลไทม์", en ? "Email + PromptPay" : "อีเมล + PromptPay"];
  };

  return (
    <div className="lp">
      {/* ---------- HERO ---------- */}
      <section className="lp-section lp-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">☁️ {en ? "Cloud hotel management" : "ระบบจัดการโรงแรมบนคลาวด์"}</span>
            <h1 className="hero-title">
              {en ? <>Run your whole property — <span className="hl">overbooking gone for good</span></>
                  : <>บริหารที่พักครบวงจร <span className="hl">ไม่มี overbooking</span> อีกต่อไป</>}
            </h1>
            <p className="hero-sub">
              {en
                ? "Bookings, automatic Airbnb / Booking / Agoda sync, check-in, housekeeping, confirmation emails and payments — all in one system. Free 14-day trial."
                : "จองห้อง เชื่อม Airbnb / Booking / Agoda อัตโนมัติ เช็คอิน-เอาต์ งานแม่บ้าน อีเมลยืนยัน และเก็บเงิน — ครบในระบบเดียว ทดลองใช้ฟรี 14 วัน"}
            </p>
            <div className="hero-cta">
              <Link href="/signup" className="btn btn-lg">{en ? "Start free trial" : "เริ่มใช้ฟรี 14 วัน"}</Link>
              <Link href="#pricing" className="btn btn-ghost btn-lg">{en ? "See pricing" : "ดูแพ็กเกจ & ราคา"}</Link>
            </div>
            <div className="hero-stat">✓ {en ? "No credit card required · set up in 10 minutes" : "ไม่ต้องใช้บัตรเครดิต · ตั้งค่าเสร็จใน 10 นาที"}</div>

            <div className="trust">
              <div className="lbl">● {en ? "CONNECTED · your OTAs" : "CONNECTED · เชื่อมต่อ OTA"}</div>
              <div className="ota-logos">
                {OTAS.map((o) => <span key={o} className="ota-chip">{o}</span>)}
              </div>
            </div>
          </div>

          {/* product preview */}
          <div className="hero-visual">
            <div className="preview">
              <div className="preview-bar"><i></i><i></i><i></i><span>onecloudstay.com</span></div>
              <div className="preview-body">
                <div className="pv-stats">
                  <div className="pv-stat"><div className="k">Occupancy</div><div className="v">78%</div></div>
                  <div className="pv-stat"><div className="k">{en ? "Arrivals" : "เข้าพัก"}</div><div className="v">6</div></div>
                  <div className="pv-stat"><div className="k">{en ? "Revenue" : "รายได้"}</div><div className="v">฿284K</div></div>
                </div>
                <div className="pv-cal">
                  <div className="pv-cell ok">9</div><div className="pv-cell ok">7</div><div className="pv-cell low">2</div>
                  <div className="pv-cell full">0</div><div className="pv-cell ok">5</div><div className="pv-cell low">1</div><div className="pv-cell ok">8</div>
                </div>
              </div>
            </div>
            <div className="hero-float">📈 <span>{en ? "Revenue" : "รายได้"} <b>+25%</b></span></div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="lp-band alt" id="features">
        <div className="lp-section">
          <div className="band-head">
            <span className="eyebrow">{en ? "Everything in one place" : "ครบในระบบเดียว"}</span>
            <h2 className="band-title">{en ? "One system to run the whole property" : "ทุกอย่างที่ใช้บริหารโรงแรม อยู่ในที่เดียว"}</h2>
            <p className="band-sub">{en ? "From the first booking to check-out — OneCloudStay handles it, so you don't juggle spreadsheets and tabs." : "ตั้งแต่จองแรกจนถึงเช็คเอาต์ OneCloudStay จัดการให้หมด ไม่ต้องสลับหลายแอปหรือกรอก Excel เอง"}</p>
          </div>
          <div className="features">
            {features.map((f) => (
              <div className="feature-card" key={f.h}>
                <div className="feature-ic">{f.ic}</div>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- STEPS ---------- */}
      <section className="lp-band">
        <div className="lp-section">
          <div className="band-head">
            <span className="eyebrow">{en ? "Get started in 3 steps" : "เริ่มใช้ใน 3 ขั้นตอน"}</span>
            <h2 className="band-title">{en ? "Live in under 10 minutes" : "พร้อมรับจองภายใน 10 นาที"}</h2>
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <div className="step" key={s.h}>
                <div className="n">{i + 1}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section className="lp-band alt" id="pricing">
        <div className="lp-section">
          <div className="band-head">
            <span className="eyebrow">{en ? "Simple pricing" : "ราคาโปร่งใส"}</span>
            <h2 className="band-title">{en ? "Plans that grow with you" : "แพ็กเกจที่โตไปกับคุณ"}</h2>
            <p className="band-sub">{en ? `Pay monthly or save ${yearlyDiscountPct()}% yearly. Every plan starts with a free 14-day trial.` : `จ่ายรายเดือน หรือรายปีประหยัด ${yearlyDiscountPct()}% · ทุกแพ็กเกจทดลองฟรี 14 วัน`}</p>
          </div>
          <div className="lp-pricing">
            {(["starter", "pro", "enterprise"] as const).map((id) => {
              const p = PLANS[id];
              const pop = id === "pro";
              return (
                <div className={`price-card ${pop ? "pop" : ""}`} key={id} data-tag={en ? "Popular" : "ยอดนิยม"}>
                  <div className="tier">{p.name}</div>
                  <div className="amt">฿{money(p.priceTHB)}<small>/{en ? "mo" : "เดือน"}</small></div>
                  <ul>
                    {planFeatures(id).map((li) => <li key={li}>{li}</li>)}
                  </ul>
                  <Link href="/signup" className={`btn ${pop ? "" : "btn-ghost"} btn-block`}>{en ? "Start free" : "เริ่มใช้ฟรี"}</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="lp-band">
        <div className="lp-section">
          <div className="lp-final">
            <h2>{en ? "Ready to modernize your property?" : "พร้อมยกระดับการจัดการโรงแรมของคุณแล้วหรือยัง?"}</h2>
            <p>{en ? "Join hoteliers who stopped juggling channels and started growing. Free for 14 days, no card needed." : "เริ่มใช้ OneCloudStay วันนี้ เลิกปวดหัวกับ overbooking และงานซ้ำซ้อน · ฟรี 14 วัน ไม่ต้องใช้บัตร"}</p>
            <Link href="/signup" className="btn btn-lg">{en ? "Create your free account" : "สร้างบัญชีฟรี"}</Link>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="lp-footer">
        <div className="inner">
          <span>☁️ OneCloudStay · {en ? "Cloud hotel management" : "ระบบจัดการห้องพักบนคลาวด์"}</span>
          <span>© 2026 OneCloudStay · <Link href="/login" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>{en ? "Sign in" : "เข้าสู่ระบบ"}</Link></span>
        </div>
      </footer>
    </div>
  );
}
