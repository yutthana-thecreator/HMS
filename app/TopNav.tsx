"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

const links = [
  { href: "/", key: "nav.dashboard" },
  { href: "/frontdesk", key: "nav.frontdesk" },
  { href: "/book", key: "nav.book" },
  { href: "/reservations", key: "nav.reservations" },
  { href: "/housekeeping", key: "nav.housekeeping" },
  { href: "/settings", key: "nav.settings" },
];

export default function TopNav({
  lang,
  hotelName,
  userName,
  userEmail,
  planName,
  trialing,
}: {
  lang: Lang;
  hotelName: string;
  userName: string;
  userEmail: string;
  planName: string;
  trialing: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = makeT(lang);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="nav-links">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
            {t(l.key)}
          </Link>
        ))}
      </div>
      <div className="org-chip">
        <span className={`plan-badge ${trialing ? "trial" : ""}`}>
          {trialing ? t("nav.trial") : planName}
        </span>
        <div className="user-mini">
          <strong>{hotelName}</strong>
          {userName || userEmail}
        </div>
        <button className="btn btn-ghost" onClick={logout} style={{ color: "var(--text-muted)" }}>
          ออก
        </button>
      </div>
    </>
  );
}
