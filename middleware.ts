import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ตรวจแค่ว่ามี session cookie ไหม (การตรวจจริงทำใน server component ผ่าน requireUser)
// ปกป้องทุกหน้า ยกเว้น: api, static, login, signup
export function middleware(req: NextRequest) {
  const session = req.cookies.get("hms_session")?.value;
  const admin = req.cookies.get("hms_admin")?.value;
  if (!session && !admin) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
};
