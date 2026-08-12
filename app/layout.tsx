import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import "./globals.css";
import TopNav from "./TopNav";
import LanguageToggle from "./LanguageToggle";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

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
  const lang = await getLang();
  const t = makeT(lang);

  return (
    <html lang={lang}>
      <body>
        <header className="site-header">
          <nav className="nav">
            <div className="brand">
              <span className="logo">☁️</span> OneCloudStay
            </div>
            {user && org && !isAdminArea && (
              <TopNav
                lang={lang}
                hotelName={org.name}
                userName={user.name ?? ""}
                userEmail={user.email}
                planName={plan.name}
                trialing={org.planStatus === "trialing"}
              />
            )}
            {isAdminArea && <span className="muted" style={{ fontSize: 14 }}>{t("nav.admin")}</span>}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              {!user && !isAdminArea && (
                <div className="header-cta">
                  <Link href="/login" className="signin">{t("auth.signinBtn")}</Link>
                  <Link href="/signup" className="btn">{lang === "en" ? "Start free" : "เริ่มใช้ฟรี"}</Link>
                </div>
              )}
              <LanguageToggle lang={lang} />
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
