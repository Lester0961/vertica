# Vertica UI/UX and business-logic audit

Audit date: 2026-08-10

Environment: local Next.js application connected to the configured hosted Supabase project, followed by a production Vercel regression

Deployment: https://vertica-residences.vercel.app

Roles exercised: `PROPERTY_ADMIN`, `TENANT`, and `GUARD`

## Scope

Vertica is a school demonstration of a condominium management platform. The audit covered the public website, authentication, four protected portal areas, database-backed operations, and the procedural 3D experiences.

The project uses the Vercel-provided URL and the existing free Supabase project. No custom domain or paid hosting service is required. Transactional email can use the Supabase demo mailer or a verified Brevo single sender; SMTP credentials are intentionally not stored in this repository.

## Route and interaction inventory

Status key:

- `PASS`: worked during live verification.
- `FIXED`: failed or was incomplete initially and passed after implementation.
- `NOT RE-RUN`: implemented and covered by checks, but not submitted again in the final production pass.

### Public website

| Route | Interactions | Result |
| --- | --- | --- |
| `/` | Header navigation, logo, availability CTA, cinematic hero, parallax layers, animated statistics, feature links, footer | FIXED |
| `/units` | Unit type, price, area, floor, furnishing and availability filters; sorting; detail links | FIXED |
| `/units/[publicLabel]` | Dynamic unit details, 3D interior, inquiry, reservation and comparison actions | FIXED |
| `/explore` | Procedural building model, rotate, zoom, pan, hover tooltip, floor/status filtering and unit selection | FIXED |
| `/compare` | Guided unit picker, removal and side-by-side dynamic comparison | FIXED |
| `/recommend` | Ten-question intake, validation, hard constraints, weighted scoring and diversified top-three results | FIXED |
| `/reserve` | Direct unit chooser and selected-unit reservation form | FIXED |
| `/inquiry`, `/viewing` | Validated public forms with unit context | PASS |
| `/amenities`, `/location`, `/faq`, `/privacy`, `/terms` | Consistent public navigation and responsive content | PASS |
| Public header | Desktop navigation, mobile menu, Escape close, responsive CTAs | FIXED |

### Authentication

| Route | Interactions | Result |
| --- | --- | --- |
| `/login` | Email, password, show/hide password, validation, loading, error display and role redirect | FIXED |
| `/forgot-password` | Email validation and reset request state | FIXED |
| `/reset-password` | Password visibility, confirmation and validation | FIXED |

### Admin portal

| Route | Interactions | Result |
| --- | --- | --- |
| `/admin/dashboard` | Dynamic statistics, quick links, responsive portal navigation and logout | FIXED |
| `/admin/units` | Filters, create/edit/status dialogs, 3D status model and database propagation | FIXED |
| `/admin/clients` | Create, edit, archive and status management | FIXED |
| `/admin/inquiries` | Assignment, status and lifecycle actions | FIXED |
| `/admin/reservations` | Approve, reject, cancel and status-version protection | FIXED |
| `/admin/tenants` | Tenant list and dynamic operational state | FIXED |
| `/admin/leases` | Create, renew and terminate with unit/tenant relationships and compliance checks | FIXED |
| `/admin/billing` | Generate lease-aligned bills, line items, dates and status filters | FIXED |
| `/admin/payments` | Review, approve, partial and reject paths with duplicate-action protection | FIXED |
| `/admin/maintenance` | Submitted, in-progress and resolved lifecycle | FIXED |
| `/admin/gate-passes` | Pass visibility and revoke action | FIXED |
| `/admin/users` | Invite, role and account-status management | FIXED; invite email NOT RE-RUN |
| `/admin/announcements`, `/admin/reports`, `/admin/audit-logs` | Existing data views and actions | PASS |

### Tenant portal

| Route | Interactions | Result |
| --- | --- | --- |
| `/tenant/dashboard` | Lease-aware summary and quick links | PASS |
| `/tenant/unit` | Active-unit details | FIXED |
| `/tenant/lease` | Current lease terms and status | FIXED |
| `/tenant/bills` | Bills, line items, status and PDF invoice download | FIXED |
| `/tenant/payments` | Payment submission and refreshed history | FIXED |
| `/tenant/maintenance` | Validated repair request and lifecycle display | FIXED; submission NOT RE-RUN in final production pass |
| `/tenant/gate-passes` | Active-lease unit, visitor details, secure code creation and revoke | FIXED |
| `/tenant/announcements`, `/tenant/notifications`, `/tenant/profile` | Existing tenant views and profile controls | PASS |

### Guard and maintenance portals

| Route | Interactions | Result |
| --- | --- | --- |
| `/guard/verify` | Six-digit verification, invalid, early, valid, entry, exit and duplicate-exit handling | FIXED |
| `/guard/recent-verifications` | Verification and access-event history | FIXED |
| `/maintenance/assigned` | Assigned work queue and status controls | FIXED |
| `/maintenance/schedule` | Scheduled work view | FIXED |
| `/maintenance/completed` | Completed work history | FIXED |

## Major fixes

1. Rebuilt the landing experience with a production-style editorial layout, generated residential imagery, restrained parallax, 3D depth and responsive motion.
2. Removed the hero animation's duplicate opacity entrance that caused the visible double blink.
3. Unified typography, color tokens, panels, navigation, controls and feedback across public, authentication and portal layouts.
4. Replaced remaining static unit presentation with Supabase-backed filters, comparison, reservation selection and procedural 3D views.
5. Added guarded unit creation, editing and status transitions that update the public inventory and 3D model.
6. Completed client, inquiry, reservation, tenant, user and lease operational actions.
7. Added effective-dated compliance rules for lease deposits, advance rent and rent-increase boundaries.
8. Added lease-aligned bill generation, real PDF invoices, payment review and duplicate-review protection.
9. Added private realtime refresh broadcasts for units, bills, payments and maintenance requests.
10. Added cryptographically random gate-pass codes, SHA-256-only storage, entry/exit events and duplicate-exit rejection.
11. Corrected the recommendation engine's furnished filter, hard constraints, scoring order and diversified top-three output.
12. Updated dependencies and configuration to remove the previously reported dependency advisories.

## Live workflow evidence

- Admin 3D: rotate, zoom, pan, hover tooltip, unit selection and status color propagation were exercised.
- Public 3D: available-unit hover and selection opened the correct dynamic unit details.
- Unit propagation: Unit 202 was changed to maintenance, disappeared from public availability, then returned to available.
- Comparison: Unit 202 and Unit 203 rendered side by side with two procedural unit canvases.
- Lease: an active tenant lease was created for Unit 201 with valid dates, advance and deposit values.
- Billing: an out-of-term bill was rejected, then a lease-aligned PHP 17,500 bill was created.
- Payment: the tenant submitted PHP 17,500; the admin approved it; the second approval action was unavailable.
- Invoice: the tenant PDF download was invoked from the real billing record.
- Gate pass: raw code was displayed once, its SHA-256 hash was confirmed in storage, invalid and valid checks were exercised, and entry/exit events were recorded.
- Production: the landing page, inventory, Unit 202 WebGL view and password visibility control were verified at the Vercel URL.

## Verification

- `npm run check`: passed environment validation, lint, type checking and 13 tests.
- `npm run build`: passed; 43 application pages generated.
- `npm audit`: zero vulnerabilities.
- Migration ordering: 16 migrations passed.
- `0016_demo_operations_completion.sql`: applied to the configured hosted database.
- `/api/health`: healthy locally and on the deployed Vercel application.
- Production inventory: 20 currently available units loaded.
- Mobile landing, authentication and role-navigation layouts were exercised without horizontal overflow.

## Remaining verification boundaries

1. Brevo SMTP requires the project owner's verified sender and SMTP credential to be entered in Supabase Auth settings. No credential belongs in source control.
2. The admin invitation email was not sent during the final regression because it would create another external account.
3. Every CRM action and the maintenance lifecycle were implemented and checked, but were not all resubmitted during the last production-only pass.
4. Forced database outages and very slow network conditions were not induced against the hosted project. Loading, empty and ordinary error states remain implemented.
5. The procedural interiors are code-generated spatial previews, not photogrammetric scans or externally supplied architectural models.

## Release conclusion

The current `main` candidate provides a coherent school-demo experience across the public site and all roles, with dynamic Supabase data, responsive styling, procedural 3D interactions, guarded business workflows, secure gate-pass handling and a verified Vercel deployment. The external SMTP credential step remains intentionally outside source control.
