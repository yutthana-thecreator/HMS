"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>เข้าสู่ระบบ</h1>
        <p className="sub">จัดการโรงแรมของคุณ</p>
        <form className="form-grid" action={formAction}>
          <div>
            <label>อีเมล</label>
            <input type="email" name="email" required />
          </div>
          <div>
            <label>รหัสผ่าน</label>
            <input type="password" name="password" required />
          </div>
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          {state?.error && <div className="alert error">{state.error}</div>}
        </form>
        <div className="auth-foot">
          ยังไม่มีบัญชี? <Link href="/signup">สมัครใช้งานฟรี 14 วัน</Link>
        </div>
      </div>
    </div>
  );
}
