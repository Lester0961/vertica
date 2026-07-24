"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authenticate } from "@/lib/security/authenticate";
import { resolveHomeRoute } from "@/lib/security/roles";

export interface AuthFormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  redirectTo: z.string().optional(),
});

function safeRedirectTarget(candidate: string | undefined): string | null {
  if (!candidate) return null;
  // Only allow internal absolute paths (prevents open-redirect).
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  return candidate;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Invalid credentials, or this account is disabled." };
  }

  // Resolve roles and route to the correct portal.
  const actor = await authenticate();
  if (!actor) {
    return { error: "Sign-in succeeded but no active identity was found." };
  }

  const requested = safeRedirectTarget(parsed.data.redirectTo);
  redirect(requested ?? resolveHomeRoute(actor.roles));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const emailSchema = z.object({ email: z.string().email("Enter a valid email address.") });

export async function requestPasswordResetAction(
  _prev: AuthFormState & { sent?: boolean },
  formData: FormData,
): Promise<AuthFormState & { sent?: boolean }> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Always report success to avoid leaking which emails exist.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  return { sent: true };
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Could not update password. The reset link may have expired." };
  }
  const actor = await authenticate();
  redirect(actor ? resolveHomeRoute(actor.roles) : "/login");
}
