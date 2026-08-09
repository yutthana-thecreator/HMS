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

/** push จำนวนห้องว่าง (ARI) ไป Channex → กระจายไปทุก OTA */
export async function channexUpdateAvailability(
  updates: { propertyId: string; roomTypeId: string; date: string; availability: number }[],
): Promise<void> {
  if (updates.length === 0) return;
  const values = updates.map((u) => ({
    property_id: u.propertyId,
    room_type_id: u.roomTypeId,
    date: u.date,
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
