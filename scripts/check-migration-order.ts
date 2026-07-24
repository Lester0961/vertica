/**
 * Ensures Supabase migrations are forward-only and ordered by a numeric,
 * monotonically increasing prefix. Never reorder applied migrations.
 *
 * Run: npm run check:migrations
 */
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function main() {
  const dir = resolve(process.cwd(), "supabase", "migrations");
  if (!existsSync(dir)) {
    console.log("[check-migrations] No migrations directory yet — skipping.");
    return;
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("[check-migrations] No migrations found — skipping.");
    return;
  }

  const errors: string[] = [];
  let previous = -1;

  for (const file of files) {
    const match = /^(\d+)/.exec(file);
    if (!match) {
      errors.push(`Migration is missing a numeric prefix: ${file}`);
      continue;
    }
    const prefix = Number(match[1]);
    if (prefix <= previous) {
      errors.push(
        `Migration prefix not strictly increasing: ${file} (prefix ${prefix} <= ${previous})`,
      );
    }
    previous = prefix;
  }

  if (errors.length) {
    console.error("[check-migrations] FAILED:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  console.log(`[check-migrations] OK — ${files.length} migration(s) in order.`);
}

main();
