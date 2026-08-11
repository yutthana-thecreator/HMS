// i18n เบา ๆ — พจนานุกรม th/en (client-safe · getLang อยู่ที่ i18n-server.ts)
export type Lang = "th" | "en";

const DICT: Record<string, { th: string; en: string }> = {
  // ---- nav ----
  "nav.dashboard": { th: "แดชบอร์ด", en: "Dashboard" },
  "nav.frontdesk": { th: "เคาน์เตอร์", en: "Front Desk" },
  "nav.book": { th: "จองห้อง", en: "New Booking" },
  "nav.reservations": { th: "การจอง", en: "Reservations" },
  "nav.housekeeping": { th: "แม่บ้าน", en: "Housekeeping" },
  "nav.settings": { th: "ตั้งค่า & แพ็กเกจ", en: "Settings & Plan" },
  "nav.logout": { th: "ออก", en: "Log out" },
  "nav.trial": { th: "ทดลองใช้", en: "Trial" },
  "nav.admin": { th: "ผู้ดูแลระบบ", en: "Admin" },

  // ---- login / signup ----
  "auth.signinTitle": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "auth.subtitle": { th: "จัดการโรงแรมของคุณ", en: "Manage your property" },
  "auth.email": { th: "อีเมล", en: "Email" },
  "auth.password": { th: "รหัสผ่าน", en: "Password" },
  "auth.signinBtn": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "auth.noAccount": { th: "ยังไม่มีบัญชี", en: "No account yet?" },
  "auth.signupFree": { th: "สมัครใช้งานฟรี 14 วัน", en: "Start 14-day free trial" },
  "auth.signupTitle": { th: "สมัครใช้งาน", en: "Sign up" },
  "auth.signupSub": { th: "ทดลองฟรี 14 วัน · ไม่ต้องใช้บัตรเครดิต", en: "14-day free trial · no credit card" },
  "auth.hotelName": { th: "ชื่อโรงแรม / ที่พัก", en: "Property name" },
  "auth.hotelNamePh": { th: "เช่น บ้านสวนรีสอร์ท", en: "e.g. Baan Suan Resort" },
  "auth.yourName": { th: "ชื่อของคุณ", en: "Your name" },
  "auth.yourNamePh": { th: "ชื่อ-นามสกุล", en: "Full name" },
  "auth.passwordMin": { th: "รหัสผ่าน (อย่างน้อย 8 ตัว)", en: "Password (min 8 chars)" },
  "auth.signupBtn": { th: "เริ่มทดลองใช้ฟรี", en: "Start free trial" },
  "auth.haveAccount": { th: "มีบัญชีอยู่แล้ว?", en: "Already have an account?" },

  // ---- dashboard ----
  "dash.subtitle": { th: "แดชบอร์ดภาพรวม", en: "Overview" },
  "dash.occToday": { th: "Occupancy วันนี้", en: "Occupancy today" },
  "dash.arrivalsToday": { th: "เข้าพักวันนี้", en: "Arrivals today" },
  "dash.inhouse": { th: "พักอยู่ (In-house)", en: "In-house" },
  "dash.totalBookings": { th: "การจองทั้งหมด", en: "Total bookings" },
  "dash.revenueMonth": { th: "รายได้เดือนนี้ (ชำระแล้ว)", en: "Revenue this month (paid)" },
  "dash.outstanding": { th: "ค้างชำระ (ทั้งหมด)", en: "Outstanding (total)" },
  "dash.totalRooms": { th: "ห้องทั้งหมด", en: "Total rooms" },
  "dash.calendar": { th: "ปฏิทินห้องว่าง", en: "Availability" },
  "dash.daysAhead": { th: "วันข้างหน้า", en: "days ahead" },
  "dash.createBooking": { th: "+ สร้างการจอง", en: "+ New booking" },
  "dash.welcome": { th: "ยินดีต้อนรับ 👋", en: "Welcome 👋" },
  "dash.noProperty": { th: "ยังไม่มีที่พัก — ไปที่หน้าตั้งค่าเพื่อเริ่มต้น", en: "No property yet — go to Settings to start" },
  "dash.goSettings": { th: "ไปตั้งค่า", en: "Go to Settings" },
  "dash.noRoomTypes": { th: "ยังไม่มีประเภทห้อง", en: "No room types yet" },
  "dash.addFirstRoomType": { th: "เพิ่มประเภทห้องแรกเพื่อเริ่มรับการจอง", en: "Add your first room type to start taking bookings" },
  "dash.addRoomType": { th: "+ เพิ่มประเภทห้อง", en: "+ Add room type" },
  "dash.trialExpired": { th: "การทดลองใช้/แพ็กเกจของคุณหมดอายุแล้ว", en: "Your trial/plan has expired" },
  "dash.renewHere": { th: "ต่ออายุที่นี่", en: "Renew here" },
  "dash.roomType": { th: "ประเภทห้อง", en: "Room type" },
  "dash.legendFree": { th: "ว่าง", en: "Available" },
  "dash.legendLow": { th: "เหลือน้อย", en: "Low" },
  "dash.legendFull": { th: "เต็ม / ปิดขาย", en: "Full / closed" },
  "dash.rooms": { th: "ห้อง", en: "rooms" },

  // ---- common ----
  "common.language": { th: "ภาษา", en: "Language" },
};

export function makeT(lang: Lang) {
  return (key: string): string => DICT[key]?.[lang] ?? key;
}
