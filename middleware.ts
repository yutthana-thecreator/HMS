import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ตรวจแค่ว่ามี session cookie ไหม (การตรวจจริงทำใน server component ผ่าน requireUser)
// ปกป้องทุกหน้า ยกเว้น: api, static, login, signup
export function middleware(req: NextRequest) {
  const session = req.cookies.get("hms_session")?.value;
  const admin = req.cookies.get("hms_admin")?.value;
  // หน้าแรก "/" เปิด public (Landing การตลาด) — คนล็อกอินจะเห็นแดชบอร์ดผ่าน page.tsx เอง
  const isPublic = req.nextUrl.pathname === "/";
  if (!session && !admin && !isPublic) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  // ส่ง pathname ให้ layout รู้ (ไว้ซ่อนเมนูโรงแรมในหน้า /admin)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
};
