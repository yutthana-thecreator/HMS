import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n-server";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/"); // ล็อกอินอยู่แล้ว → ไปแดชบอร์ด
  const lang = await getLang();
  return <SignupForm lang={lang} />;
}
