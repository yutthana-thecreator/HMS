// อ่านภาษาปัจจุบันจาก cookie (server only)
import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value;
  return c === "en" ? "en" : "th";
}
