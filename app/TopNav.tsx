"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "แดชบอร์ด" },
  { href: "/book", label: "จองห้อง" },
  { href: "/reservations", label: "การจอง" },
  { href: "/settings", label: "ตั้งค่า & แพ็กเกจ" },
];

export default function TopNav({
  hotelName,
  userName,
  userEmail,
  planName,
  trialing,
}: {
  hotelName: string;
  userName: string;
  userEmail: string;
  planName: string;
  trialing: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
            {l.label}
          </Link>
        ))}
      </div>
      <div className="org-chip">
        <span className={`plan-badge ${trialing ? "trial" : ""}`}>
          {trialing ? "ทดลองใช้" : planName}
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
