/**
 * Verifies that required environment variables are present and that no
 * server-only secret is exposed under a public (NEXT_PUBLIC_) name.
 *
 * Run: npm run verify-env
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type EnvSpec = {
  name: string;
  required: boolean;
  serverOnly: boolean;
  description: string;
};

const SPECS: EnvSpec[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    serverOnly: false,
    description: "Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    required: true,
    serverOnly: false,
    description: "Supabase publishable/anon key (RLS-protected)",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: true,
    serverOnly: false,
    description: "Public application base URL",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: false,
    serverOnly: true,
    description: "Service-role key (server-only, bypasses RLS)",
  },
];

function loadEnvLocal(): Record<string, string> {
  const file = resolve(process.cwd(), ".env.local");
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (!existsSync(file)) return env;
  const content = readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in env) || env[key] === "") env[key] = value;
  }
  return env;
}

function main() {
  const env = loadEnvLocal();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of SPECS) {
    const value = env[spec.name];
    if (spec.required && (!value || value.trim() === "")) {
      warnings.push(`Missing (required at runtime): ${spec.name} — ${spec.description}`);
    }
  }

  // Guard: no server-only secret leaked under a NEXT_PUBLIC_ name.
  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && /SERVICE_ROLE|SECRET|PRIVATE_KEY/i.test(key)) {
      errors.push(`Secret exposed to browser via public name: ${key}`);
    }
  }

  if (warnings.length) {
    console.warn("\n[verify-env] Warnings:");
    warnings.forEach((w) => console.warn("  - " + w));
    console.warn(
      "\n  These are expected before local Supabase is running. Populate .env.local after `supabase start`.",
    );
  }

  if (errors.length) {
    console.error("\n[verify-env] FAILED:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  console.log("[verify-env] OK — no leaked secrets detected.");
}

main();
