"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Alert } from "@/components/design-system/Alert";

const initial: AuthFormState & { sent?: boolean } = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  if (state.sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Alert tone="success">
          If an account exists for that email, a password-reset link has been sent.
        </Alert>
        <Link href="/login">Back to login</Link>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Reset your password</h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Button type="submit" loading={pending}>
        Send reset link
      </Button>
      <Link href="/login" style={{ fontSize: 14 }}>
        Back to login
      </Link>
    </form>
  );
}
