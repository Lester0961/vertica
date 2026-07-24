/**
 * Seeds demo users (one per role) using the Supabase Admin API, then creates
 * their profile + role rows. Requires a running local Supabase and the
 * service-role key in the environment.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npm run seed:users
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

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Vertica!Demo123";

const USERS: DemoUser[] = [
  { email: "superadmin@vertica.local", password: DEMO_PASSWORD, displayName: "Super Admin", role: "SUPER_ADMIN" },
  { email: "admin@vertica.local", password: DEMO_PASSWORD, displayName: "Property Admin", role: "PROPERTY_ADMIN" },
  { email: "tenant@vertica.local", password: DEMO_PASSWORD, displayName: "Demo Tenant", role: "TENANT" },
  { email: "guard@vertica.local", password: DEMO_PASSWORD, displayName: "Demo Guard", role: "GUARD" },
  { email: "maintenance@vertica.local", password: DEMO_PASSWORD, displayName: "Demo Maintenance", role: "MAINTENANCE" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of USERS) {
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

    console.log(`Seeded ${u.role.padEnd(15)} ${u.email}`);
  }

  console.log(`\nDemo password: ${DEMO_PASSWORD}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
