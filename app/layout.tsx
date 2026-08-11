import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import TopNav from "./TopNav";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "OneCloudStay — ระบบจัดการห้องพักบนคลาวด์",
  description: "OneCloudStay · จัดการห้องพักง่าย สะดวก มืออาชีพ บนคลาวด์ — จอง เช็คอิน เชื่อม OTA กัน overbooking ครบในที่เดียว",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const org = user?.organization;
  const plan = getPlan(org?.plan);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdminArea = pathname.startsWith("/admin");

  return (
    <html lang="th">
      <body>
        <header className="site-header">
          <nav className="nav">
            <div className="brand">
              <span className="logo">☁️</span> OneCloudStay
            </div>
            {user && org && !isAdminArea && (
              <TopNav
                hotelName={org.name}
                userName={user.name ?? ""}
                userEmail={user.email}
                planName={plan.name}
                trialing={org.planStatus === "trialing"}
              />
            )}
            {isAdminArea && <span className="muted" style={{ fontSize: 14 }}>ผู้ดูแลระบบ</span>}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
