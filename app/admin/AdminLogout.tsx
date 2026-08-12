"use client";

import { useRouter } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";

export default function AdminLogout({ lang = "th" }: { lang?: Lang }) {
  const router = useRouter();
  const t = makeT(lang);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="btn btn-ghost" onClick={logout}>{t("common.logout")}</button>
  );
}
