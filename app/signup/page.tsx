"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [hotelName, setHotelName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelName, fullName, email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      window.location.href = "/settings";
      return;
    } else {
      setError(data.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>สมัครใช้งาน</h1>
        <p className="sub">ทดลองฟรี 14 วัน · ไม่ต้องใช้บัตรเครดิต</p>
        <form className="form-grid" onSubmit={submit}>
          <div>
            <label>ชื่อโรงแรม / ที่พัก</label>
            <input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="เช่น บ้านสวนรีสอร์ท" required />
          </div>
          <div>
            <label>ชื่อของคุณ</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" />
          </div>
          <div>
            <label>อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>รหัสผ่าน (อย่างน้อย 8 ตัว)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <button className="btn btn-block" disabled={busy}>
            {busy ? "กำลังสร้างบัญชี..." : "เริ่มทดลองใช้ฟรี"}
          </button>
          {error && <div className="alert error">{error}</div>}
        </form>
        <div className="auth-foot">
          มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}
