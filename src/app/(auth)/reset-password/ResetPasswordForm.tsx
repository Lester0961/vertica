"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Alert } from "@/components/design-system/Alert";

const initial: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Choose a new password</h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
          Enter a new password for your account.
        </p>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="At least 8 characters."
      />
      <Input
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Button type="submit" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
