"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      router.push(data.admin ? "/admin" : "/");
      router.refresh();
    } else {
      setError(data.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>เข้าสู่ระบบ</h1>
        <p className="sub">จัดการโรงแรมของคุณ</p>
        <form className="form-grid" onSubmit={submit}>
          <div>
            <label>อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-block" disabled={busy}>
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          {error && <div className="alert error">{error}</div>}
        </form>
        <div className="auth-foot">
          ยังไม่มีบัญชี? <Link href="/signup">สมัครใช้งานฟรี 14 วัน</Link>
        </div>
      </div>
    </div>
  );
}
