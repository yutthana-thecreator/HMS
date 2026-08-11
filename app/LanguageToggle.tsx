"use client";

import { useRouter } from "next/navigation";

export default function LanguageToggle({ lang }: { lang: "th" | "en" }) {
  const router = useRouter();
  function set(l: "th" | "en") {
    if (l === lang) return;
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  const item = (active: boolean) => ({
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    borderRadius: 6,
    cursor: "pointer",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "#fff" : "var(--text-muted)",
    border: "none",
  });
  return (
    <div style={{ display: "inline-flex", gap: 2, background: "var(--surface-2)", padding: 2, borderRadius: 8 }}>
      <button style={item(lang === "th")} onClick={() => set("th")}>ไทย</button>
      <button style={item(lang === "en")} onClick={() => set("en")}>EN</button>
    </div>
  );
}
