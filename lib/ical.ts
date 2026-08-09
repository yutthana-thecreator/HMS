// ยูทิลิตี้ iCal (RFC 5545) แบบเบา — parse VEVENT + build feed โดยไม่ต้องพึ่ง library

export type IcalEvent = {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (exclusive ตามมาตรฐาน DTEND ของ all-day)
  summary: string;
};

/** แกะ line folding (บรรทัดที่ขึ้นต้นด้วยช่องว่าง = ต่อจากบรรทัดก่อน) */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/** "20260809" หรือ "20260809T140000Z" → "2026-08-09" */
function toDate(val: string): string {
  const m = val.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : val;
}

export function parseIcal(text: string): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
    } else if (line === "END:VEVENT") {
      if (cur && cur.start && cur.end) {
        events.push({
          uid: cur.uid ?? `${cur.start}_${cur.end}`,
          start: cur.start,
          end: cur.end,
          summary: cur.summary ?? "OTA Booking",
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1).trim();
      if (key.startsWith("DTSTART")) cur.start = toDate(value);
      else if (key.startsWith("DTEND")) cur.end = toDate(value);
      else if (key === "UID") cur.uid = value;
      else if (key.startsWith("SUMMARY")) cur.summary = value;
    }
  }
  return events;
}

/** สร้างไฟล์ .ics จากช่วงวันที่จอง (ให้ OTA มา subscribe) */
export function buildIcal(opts: {
  calName: string;
  events: { uid: string; start: string; end: string; summary: string }[];
}): string {
  const fmt = (d: string) => d.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HMS//Hotel Management System//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${opts.calName}`,
  ];
  for (const e of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTART;VALUE=DATE:${fmt(e.start)}`,
      `DTEND;VALUE=DATE:${fmt(e.end)}`,
      `SUMMARY:${e.summary}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
