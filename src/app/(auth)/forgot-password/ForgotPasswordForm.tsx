"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Alert } from "@/components/design-system/Alert";
import styles from "../auth.module.css";

const initial: AuthFormState & { sent?: boolean } = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  if (state.sent) {
    return (
      <div className={styles.form}>
        <Alert tone="success">
          If an account exists for that email, a password-reset link has been sent.
        </Alert>
        <Link href="/login">Back to login</Link>
      </div>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <div className={styles.formHeader}>
        <p>Account recovery</p>
        <h1>Reset your password.</h1>
        <p>Enter your account email and we&apos;ll send a secure reset link.</p>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input label="Email" name="email" type="email" autoComplete="email" required style={{ minHeight: 50 }} />
      <Button type="submit" loading={pending}>
        Send reset link
      </Button>
      <div className={styles.formLinks}><Link href="/login">Back to login</Link></div>
    </form>
  );
}
