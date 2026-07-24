import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/security/authenticate";
import { resolveHomeRoute } from "@/lib/security/roles";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  // Already signed in? Send to the correct portal.
  const actor = await authenticate();
  if (actor) redirect(resolveHomeRoute(actor.roles));

  const { redirectTo } = await searchParams;
  return <LoginForm redirectTo={redirectTo} />;
}
