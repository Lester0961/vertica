"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { PasswordField } from "@/components/design-system/PasswordField";
import { Alert } from "@/components/design-system/Alert";
import styles from "../auth.module.css";

const initial: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);

  return (
    <form action={action} className={styles.form}>
      <div className={styles.formHeader}>
        <p>Account security</p>
        <h1>Choose a new password.</h1>
        <p>Use at least eight characters and save it in your password manager.</p>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="At least 8 characters."
      />
      <PasswordField
        label="Confirm password"
        name="confirm"
        autoComplete="new-password"
        minLength={8}
        required
        toggleLabel="confirmation password"
      />
      <Button type="submit" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
