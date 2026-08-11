import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

// หน้าแจ้งบัญชีถูกระงับ (ไม่ใช้ requireUser เพื่อกัน loop)
export default async function SuspendedPage() {
  const user = await getCurrentUser();

  return (
    <main className="container" style={{ maxWidth: 520, textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 56 }}>🚫</div>
      <h1 className="page-title" style={{ marginTop: 12 }}>บัญชีถูกระงับการใช้งาน</h1>
      <p className="page-sub" style={{ marginBottom: 20 }}>
        บัญชี{user?.organization?.name ? ` “${user.organization.name}”` : ""} ถูกระงับชั่วคราวโดยผู้ดูแลระบบ
      </p>
      <p className="muted">กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานอีกครั้ง (เช่น ค้างชำระ หรือมีปัญหาบัญชี)</p>
      <div style={{ marginTop: 24 }}>
        <LogoutButton />
      </div>
    </main>
  );
}
