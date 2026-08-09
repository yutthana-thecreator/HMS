"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, {});

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>สมัครใช้งาน</h1>
        <p className="sub">ทดลองฟรี 14 วัน · ไม่ต้องใช้บัตรเครดิต</p>
        <form className="form-grid" action={formAction}>
          <div>
            <label>ชื่อโรงแรม / ที่พัก</label>
            <input name="hotelName" placeholder="เช่น บ้านสวนรีสอร์ท" required />
          </div>
          <div>
            <label>ชื่อของคุณ</label>
            <input name="fullName" placeholder="ชื่อ-นามสกุล" />
          </div>
          <div>
            <label>อีเมล</label>
            <input type="email" name="email" required />
          </div>
          <div>
            <label>รหัสผ่าน (อย่างน้อย 8 ตัว)</label>
            <input type="password" name="password" minLength={8} required />
          </div>
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending ? "กำลังสร้างบัญชี..." : "เริ่มทดลองใช้ฟรี"}
          </button>
          {state?.error && <div className="alert error">{state.error}</div>}
        </form>
        <div className="auth-foot">
          มีบัญชีอยู่แล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}
