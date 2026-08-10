"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { PasswordField } from "@/components/design-system/PasswordField";
import { Alert } from "@/components/design-system/Alert";
import styles from "../auth.module.css";

const initial: AuthFormState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className={styles.form}>
      <div className={styles.formHeader}>
        <p>Secure portal</p>
        <h1>Welcome back to Vertica.</h1>
        <p>Use the account issued for your resident, administration, maintenance, or security role.</p>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        style={{ minHeight: 50 }}
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        required
      />

      <Button type="submit" loading={pending}>
        Sign in
      </Button>

      <div className={styles.formLinks}>
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/">Back to site</Link>
      </div>
    </form>
  );
}
