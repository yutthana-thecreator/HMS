"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";
import { makeT, type Lang } from "@/lib/i18n";

export default function LoginForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const t = makeT(lang);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t("auth.signinTitle")}</h1>
        <p className="sub">{t("auth.subtitle")}</p>
        <form className="form-grid" action={formAction}>
          <div>
            <label>{t("auth.email")}</label>
            <input type="email" name="email" required />
          </div>
          <div>
            <label>{t("auth.password")}</label>
            <input type="password" name="password" required />
          </div>
          <button className="btn btn-block" type="submit" disabled={pending}>
            {pending ? "..." : t("auth.signinBtn")}
          </button>
          {state?.error && <div className="alert error">{state.error}</div>}
        </form>
        <div className="auth-foot">
          {t("auth.noAccount")} <Link href="/signup">{t("auth.signupFree")}</Link>
        </div>
      </div>
    </div>
  );
}
