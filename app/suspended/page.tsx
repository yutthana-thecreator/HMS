import { getCurrentUser } from "@/lib/auth";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

// หน้าแจ้งบัญชีถูกระงับ (ไม่ใช้ requireUser เพื่อกัน loop)
export default async function SuspendedPage() {
  const user = await getCurrentUser();
  const lang = await getLang();
  const t = makeT(lang);
  const orgName = user?.organization?.name;

  return (
    <main className="container" style={{ maxWidth: 520, textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 56 }}>🚫</div>
      <h1 className="page-title" style={{ marginTop: 12 }}>{t("susp.title")}</h1>
      <p className="page-sub" style={{ marginBottom: 20 }}>
        {lang === "th"
          ? `บัญชี${orgName ? ` “${orgName}”` : ""} ถูกระงับชั่วคราวโดยผู้ดูแลระบบ`
          : `Your account${orgName ? ` “${orgName}”` : ""} has been temporarily suspended by an administrator`}
      </p>
      <p className="muted">{t("susp.contact")}</p>
      <div style={{ marginTop: 24 }}>
        <LogoutButton lang={lang} />
      </div>
    </main>
  );
}
