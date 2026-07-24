/**
 * Applies Vertica migrations (and optionally seeds) to a remote Postgres over
 * the session-mode pooler. No Docker required.
 *
 * Usage:
 *   tsx scripts/db-apply.ts [--reset] [--seed]
 *
 * Reads DIRECT_URL from the environment (session-mode pooler, port 5432).
 * `--reset` recreates the public + app schemas and restores Supabase default
 * privileges. `--seed` runs supabase/seed/*.sql after migrations.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { Client } from "pg";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const file = resolve(process.cwd(), ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!env[k]) env[k] = v;
    }
  }
  return env;
}

const RESET_SQL = `
drop schema if exists app cascade;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to postgres, anon, authenticated, service_role;
`;

async function main() {
  const env = loadEnv();
  const conn = env.DIRECT_URL || env.DATABASE_URL;
  if (!conn) {
    console.error("Missing DIRECT_URL (or DATABASE_URL) in environment/.env.local.");
    process.exit(1);
  }
  const reset = process.argv.includes("--reset");
  const seed = process.argv.includes("--seed");

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("[db-apply] Connected.");

  try {
    if (reset) {
      console.log("[db-apply] Resetting public + app schemas…");
      await client.query(RESET_SQL);
    }

    const migDir = resolve(process.cwd(), "supabase", "migrations");
    const migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of migrations) {
      const sql = readFileSync(join(migDir, f), "utf8");
      process.stdout.write(`[db-apply] migration ${f} … `);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
        console.log("ok");
      } catch (e) {
        await client.query("rollback");
        console.log("FAILED");
        throw e;
      }
    }

    if (seed) {
      const seedDir = resolve(process.cwd(), "supabase", "seed");
      if (existsSync(seedDir)) {
        const seeds = readdirSync(seedDir).filter((f) => f.endsWith(".sql")).sort();
        for (const f of seeds) {
          const sql = readFileSync(join(seedDir, f), "utf8");
          process.stdout.write(`[db-apply] seed ${f} … `);
          await client.query(sql);
          console.log("ok");
        }
      }
    }

    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    console.log(`[db-apply] Done. public base tables: ${rows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\n[db-apply] Error:", e.message);
  process.exit(1);
});
