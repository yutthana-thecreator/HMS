"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "./actions";
import { makeT, type Lang } from "@/lib/i18n";

export default function SignupForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(signupAction, {});
  const t = makeT(lang);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t("auth.signupTitle")}</h1>
        <p className="sub">{t("auth.signupSub")}</p>
        <form className="form-grid" action={formAction}>
          <div>
            <label>{t("auth.hotelName")}</label>
            <input name="hotelName" placeholder={t("auth.hotelNamePh")} required />
          </div>
          <div>
            <label>{t("auth.yourName")}</label>
            <input name="fullName" placeholder={t("auth.yourNamePh")} />
          </div>
          <div>
            <label>{t("auth.email")}</label>
            <input type="email" name="email" required />
          </div>
          <div>
            <label>{t("auth.passwordMin")}</label>
            <input type="password" name="password" minLength={8} required />
          </div>
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending ? "..." : t("auth.signupBtn")}
          </button>
          {state?.error && <div className="alert error">{state.error}</div>}
        </form>
        <div className="auth-foot">
          {t("auth.haveAccount")} <Link href="/login">{t("auth.signinBtn")}</Link>
        </div>
      </div>
    </div>
  );
}
