# Vertica

Web-Based Condominium Property-Management Information System.

- **Stack:** Next.js 16 (App Router) + TypeScript + Supabase (PostgreSQL / Auth / Storage)
- **Architecture:** Modular monolith
- **Scope (current):** One fictional building, 24 units — Studio / One-Bedroom / Two-Bedroom
- **Baseline:** Vertica Specification v2.0.0

## Prerequisites

- Node.js >= 20.9
- npm
- [Supabase CLI](https://supabase.com/docs/guides/local-development) (`npx supabase`)
- Docker (required for local Supabase: `supabase start`, `db reset`)

## Getting started

```bash
npm install
cp .env.example .env.local        # then fill in values

# Local database (requires Docker running):
npx supabase start                # prints the publishable/anon key + URL
# copy the keys into .env.local
npx supabase db reset             # applies migrations + seeds

npm run dev                       # http://localhost:3000
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run check` | verify-env + lint + typecheck + test |
| `npm run verify-env` | Validate env + detect leaked secrets |
| `npm run check:migrations` | Ensure migrations are forward-only/ordered |
| `npm run db:reset` | `supabase db reset` |

## Authentication boundary

- Request boundary lives in **`proxy.ts`** (Next.js 16 renamed `middleware` → `proxy`).
- Cookie-refresh logic is in `src/lib/supabase/proxy.ts`.
- Authorization uses **`supabase.auth.getClaims()`**, never `getSession()`.
- `authenticate()` in `src/lib/security/authenticate.ts` is the shared
  role-resolution source of truth for Server Components and API routes.
- The service-role key is confined to `src/lib/supabase/service.ts`
  (`import "server-only"`) and must never appear in client-importable code.

## Security notes

- Never commit `.env.local` or any real key.
- Every exposed table must have RLS enabled with per-role policies.
- Private storage buckets only; access via short-lived signed URLs.

## Project status

Building iteratively through the phases in the master blueprint. See `VERIFY.md`
for legal/privacy/asset blockers that must be resolved before production.
