// ยูทิลิตี้จัดการวันที่แบบ String "YYYY-MM-DD"
// เทียบช่วงวันแบบ lexicographic ได้ตรง (เลี่ยงปัญหา timezone ทั้งหมด)

/** วันที่ "วันนี้" ตาม timezone ที่กำหนด รูปแบบ YYYY-MM-DD */
export function todayStr(timeZone = "Asia/Bangkok"): string {
  // en-CA ให้ผลลัพธ์รูปแบบ YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** บวก/ลบจำนวนวัน คืนค่า YYYY-MM-DD */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** สร้างลิสต์วันที่ต่อเนื่อง count วัน เริ่มจาก start */
export function rangeDates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** ลิสต์ "คืน" ที่เข้าพัก (รวม checkin ถึง checkout-1) — checkout ไม่นับ */
export function nightsBetween(checkin: string, checkout: string): string[] {
  const nights: string[] = [];
  let cur = checkin;
  while (cur < checkout) {
    nights.push(cur);
    cur = addDays(cur, 1);
  }
  return nights;
}

/** จำนวนคืน */
export function nightCount(checkin: string, checkout: string): number {
  return nightsBetween(checkin, checkout).length;
}

/** ชื่อวันแบบสั้น (ไทย) เช่น "จ", "อ" */
export function weekdayShortTH(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][wd];
}

/** true ถ้าเป็นเสาร์/อาทิตย์ */
export function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
}
