import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n-server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/"); // ล็อกอินอยู่แล้ว → ไปแดชบอร์ด (ไม่ค้างหน้า login)
  const lang = await getLang();
  return <LoginForm lang={lang} />;
}
