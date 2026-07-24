"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/features/auth/actions";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";
import { Alert } from "@/components/design-system/Alert";

const initial: AuthFormState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Resident &amp; staff login</h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
          Sign in to access your Vertica portal.
        </p>
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
      />

      <Input
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
      />

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        Show password
      </label>

      <Button type="submit" loading={pending}>
        Sign in
      </Button>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/">Back to site</Link>
      </div>
    </form>
  );
}
