/**
 * Seeds demo users (one per role) using the Supabase Admin API, then creates
 * their profile + role rows. Requires a running local Supabase and the
 * service-role key in the environment.
 *
 * Set DEMO_PASSWORD to a unique value of at least 16 characters before use.
 * Remote Supabase targets are blocked unless ALLOW_REMOTE_DEMO_SEED=true.
 *
 * All accounts are SYNTHETIC demo data. Never run against production.
 */
import { createClient } from "@supabase/supabase-js";

type Role =
  | "SUPER_ADMIN"
  | "PROPERTY_ADMIN"
  | "TENANT"
  | "GUARD"
  | "MAINTENANCE";

interface DemoUser {
  email: string;
  password: string;
  displayName: string;
  role: Role;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!demoPassword || demoPassword.length < 16) {
    console.error("Set DEMO_PASSWORD to a unique value of at least 16 characters.");
    process.exit(1);
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
    process.exit(1);
  }
  if (
    !isLoopbackHostname(target.hostname) &&
    process.env.ALLOW_REMOTE_DEMO_SEED !== "true"
  ) {
    console.error(
      `Refusing to seed non-local Supabase host "${target.hostname}". Use a local instance; remote seeding requires explicit ALLOW_REMOTE_DEMO_SEED=true and must never target production.`,
    );
    process.exit(1);
  }

  const users: DemoUser[] = [
    { email: "superadmin@vertica.local", password: demoPassword, displayName: "Super Admin", role: "SUPER_ADMIN" },
    { email: "admin@vertica.local", password: demoPassword, displayName: "Property Admin", role: "PROPERTY_ADMIN" },
    { email: "tenant@vertica.local", password: demoPassword, displayName: "Demo Tenant", role: "TENANT" },
    { email: "guard@vertica.local", password: demoPassword, displayName: "Demo Guard", role: "GUARD" },
    { email: "maintenance@vertica.local", password: demoPassword, displayName: "Demo Maintenance", role: "MAINTENANCE" },
  ];

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of users) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.displayName },
    });

    let userId = created?.user?.id;

    if (createErr && !userId) {
      // Likely already exists — look it up.
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list?.users.find((x) => x.email === u.email)?.id;
      if (!userId) {
        console.error(`Failed to create or find ${u.email}:`, createErr.message);
        continue;
      }
    }

    await admin.from("profiles").upsert(
      {
        id: userId!,
        email: u.email,
        display_name: u.displayName,
        status: "ACTIVE",
        activated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    await admin.from("user_roles").upsert(
      { user_id: userId!, role: u.role },
      { onConflict: "user_id,role" },
    );

    // Tenant-facing APIs resolve ownership through tenants.profile_id. Keep the
    // demo resident usable after a fresh seed instead of creating an Auth-only
    // identity that can sign in but cannot access lease, billing, maintenance,
    // or gate-pass data.
    if (u.role === "TENANT") {
      const { data: existingTenant } = await admin
        .from("tenants")
        .select("id")
        .eq("profile_id", userId!)
        .maybeSingle();

      if (!existingTenant) {
        const { data: numberedTenant } = await admin
          .from("tenants")
          .select("id")
          .eq("tenant_number", "T-DEMO-001")
          .maybeSingle();

        if (numberedTenant) {
          await admin
            .from("tenants")
            .update({ profile_id: userId!, status: "ACTIVE" })
            .eq("id", numberedTenant.id);
        } else {
          await admin.from("tenants").insert({
            profile_id: userId!,
            tenant_number: "T-DEMO-001",
            status: "ACTIVE",
          });
        }
      }
    }

    console.log(`Seeded ${u.role.padEnd(15)} ${u.email}`);
  }

  console.log("Done. The demo password was not printed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
