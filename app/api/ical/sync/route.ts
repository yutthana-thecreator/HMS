import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncOrg } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sync ทุกลิงก์ iCal ของ org (กดจากหน้า settings)
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const results = await syncOrg(user.orgId);
  const totals = results.reduce(
    (a, r) => ({ imported: a.imported + r.imported, cancelled: a.cancelled + r.cancelled, conflicts: a.conflicts + r.conflicts }),
    { imported: 0, cancelled: 0, conflicts: 0 },
  );
  return NextResponse.json({ ok: true, results, totals });
}
