import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./TopNav";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Hotel Management System",
  description: "ระบบบริหารจัดการห้องพัก SaaS + กัน Overbooking + เชื่อม OTA",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const org = user?.organization;
  const plan = getPlan(org?.plan);

  return (
    <html lang="th">
      <body>
        <header className="site-header">
          <nav className="nav">
            <div className="brand">
              <span className="logo">🏨</span> HMS
            </div>
            {user && org && (
              <TopNav
                hotelName={org.name}
                userName={user.name ?? ""}
                userEmail={user.email}
                planName={plan.name}
                trialing={org.planStatus === "trialing"}
                showAdmin={isSuperAdmin(user.email)}
              />
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
