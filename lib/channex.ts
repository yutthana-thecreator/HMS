// Channex Channel Manager API client (sandbox/production)
// ตั้ง env: CHANNEX_API_KEY, CHANNEX_BASE_URL (default = staging/sandbox)
const BASE = process.env.CHANNEX_BASE_URL || "https://staging.channex.io/api/v1";
const KEY = process.env.CHANNEX_API_KEY || "";

function headers() {
  return {
    "user-api-key": KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function channexConfigured(): boolean {
  return KEY.length > 0;
}

export function channexBaseUrl(): string {
  return BASE;
}

export type ChannexProperty = { id: string; title: string };

/** ทดสอบการเชื่อมต่อ — คืนรายชื่อ property ในบัญชี Channex */
export async function channexListProperties(): Promise<ChannexProperty[]> {
  const res = await fetch(`${BASE}/properties`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.errors?.title || body?.error || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return (body.data || []).map((p: { id: string; attributes?: { title?: string } }) => ({
    id: p.id,
    title: p.attributes?.title || "(no title)",
  }));
}

/** ดึง room type ของ property (ไว้ทำ mapping) */
export async function channexListRoomTypes(propertyId: string): Promise<{ id: string; title: string }[]> {
  const res = await fetch(`${BASE}/room_types?filter[property_id]=${propertyId}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.errors?.title || `HTTP ${res.status}`);
  return (body.data || []).map((r: { id: string; attributes?: { title?: string } }) => ({
    id: r.id,
    title: r.attributes?.title || "(no title)",
  }));
}

/** สร้าง property ใน Channex → คืน id (สำหรับ onboarding อัตโนมัติ) */
export async function channexCreateProperty(p: {
  title: string;
  currency: string;
  country: string;
  city: string;
  timezone: string;
  email: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/properties`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      property: {
        title: p.title,
        currency: p.currency,
        country: p.country,
        city: p.city,
        timezone: p.timezone,
        email: p.email,
        property_type: "hotel",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.errors?.title || `property HTTP ${res.status}`);
  return body.data.id;
}

/** ดู webhook ที่มีอยู่ของ property */
export async function channexListWebhooks(propertyId: string): Promise<{ id: string; callbackUrl: string }[]> {
  const res = await fetch(`${BASE}/webhooks?filter[property_id]=${propertyId}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return (body.data || []).map((w: { id: string; attributes?: { callback_url?: string } }) => ({
    id: w.id,
    callbackUrl: w.attributes?.callback_url || "",
  }));
}

/** ลงทะเบียน webhook รับการจอง */
export async function channexRegisterWebhook(propertyId: string, callbackUrl: string): Promise<void> {
  const res = await fetch(`${BASE}/webhooks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      webhook: { property_id: propertyId, callback_url: callbackUrl, event_mask: "booking", is_active: true },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`webhook HTTP ${res.status}: ${t.slice(0, 150)}`);
  }
}

/** ดู OTA channel ที่เชื่อมกับ property (นับว่ามีกี่เว็บเชื่อมแล้ว) */
export async function channexListChannels(propertyId: string): Promise<{ id: string; title: string }[]> {
  const res = await fetch(`${BASE}/channels?filter[property_id]=${propertyId}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return (body.data || []).map((c: { id: string; attributes?: { title?: string; channel?: string } }) => ({
    id: c.id,
    title: c.attributes?.title || c.attributes?.channel || "channel",
  }));
}

/** สร้าง room type ใน Channex → คืน id */
export async function channexCreateRoomType(
  propertyId: string,
  title: string,
  countOfRooms: number,
  occupancy: number,
): Promise<string> {
  const res = await fetch(`${BASE}/room_types`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      room_type: {
        property_id: propertyId,
        title,
        count_of_rooms: Math.max(1, countOfRooms),
        occ_adults: occupancy,
        occ_children: 0,
        occ_infants: 0,
        default_occupancy: occupancy,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.errors?.title || `room_type HTTP ${res.status}`);
  return body.data.id;
}

/** สร้าง rate plan ใน Channex → คืน id */
export async function channexCreateRatePlan(
  propertyId: string,
  roomTypeId: string,
  title: string,
  currency: string,
  rate: number,
): Promise<string> {
  const res = await fetch(`${BASE}/rate_plans`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      rate_plan: {
        property_id: propertyId,
        room_type_id: roomTypeId,
        title,
        currency,
        sell_mode: "per_room",
        rate_mode: "manual",
        options: [{ occupancy: 2, is_primary: true, rate: Math.round(rate) }],
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.errors?.title || `rate_plan HTTP ${res.status}`);
  return body.data.id;
}

/** push จำนวนห้องว่าง (ARI) ไป Channex → กระจายไปทุก OTA */
export async function channexUpdateAvailability(
  updates: { propertyId: string; roomTypeId: string; date: string; availability: number }[],
): Promise<void> {
  if (updates.length === 0) return;
  const values = updates.map((u) => ({
    property_id: u.propertyId,
    room_type_id: u.roomTypeId,
    date_from: u.date,
    date_to: u.date,
    availability: u.availability,
  }));
  const res = await fetch(`${BASE}/availability`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`availability update HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

/** push ราคา (rate) ไป Channex ต่อ rate plan → กระจายไปทุก OTA */
export async function channexUpdateRates(
  updates: { propertyId: string; ratePlanId: string; date: string; rate: number }[],
): Promise<void> {
  if (updates.length === 0) return;
  const values = updates.map((u) => ({
    property_id: u.propertyId,
    rate_plan_id: u.ratePlanId,
    date_from: u.date,
    date_to: u.date,
    rate: Math.round(u.rate),
  }));
  const res = await fetch(`${BASE}/restrictions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`rate update HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

/** ดึงรายละเอียดการจอง (สำหรับ webhook) */
export async function channexGetBooking(bookingId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/bookings/${bookingId}`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return body.data ?? null;
}
