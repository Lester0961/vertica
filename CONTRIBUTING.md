# Contributing to Vertica

Thank you for your interest in contributing to Vertica! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and professional in all interactions. We are committed to providing a welcoming and constructive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check existing [issues](https://github.com/Lester0961/vertica/issues) to avoid duplicates.
2. Open a new issue with a clear title and description.
3. Include steps to reproduce, expected behavior, and actual behavior.
4. Mention your environment (OS, Node.js version, browser).

### Suggesting Features

1. Open an issue with the `enhancement` label.
2. Describe the feature, its use case, and expected behavior.
3. Explain how it fits into the project's goals.

### Pull Requests

1. Fork the repository and create a branch from `main`.
2. Follow the existing code style and conventions.
3. Write clear commit messages.
4. Add or update tests as needed.
5. Ensure all checks pass (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`).
6. Open a pull request with a clear description of changes.

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vertica.git
cd vertica

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Configure with your Supabase credentials

# Apply migrations
npm run db:apply:reset

# Start development
npm run dev
```

## Code Style

- **TypeScript**: Strict mode enabled. No `any` types unless absolutely necessary.
- **Components**: Functional components with hooks. Use `"use client"` only when needed.
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files.
- **Imports**: Use `@/` path aliases. Group imports: external → internal → relative.
- **Styling**: Tailwind CSS utility classes. Follow existing patterns.
- **Validation**: Use Zod schemas for API input validation.

## Architecture

### Feature Modules

Each feature lives in `src/features/<name>/` with:
- `queries.ts` — Database queries and business logic
- `api.ts` — API route handlers (registered via `register()`)

### API Routes

- All endpoints under `/api/v1/`
- Use the custom router (`src/lib/api/router.ts`)
- Register routes in `src/app/api/v1/[...path]/route.ts`
- Return responses via `ok()` or `fail()` helpers

### Database

- Migrations in `supabase/migrations/`
- RLS policies on every table
- Use `createServiceRoleClient()` for server-side operations
- Use `createClient()` for RLS-scoped reads

### Authentication

- JWT-based via Supabase Auth
- `authenticate()` returns an `Actor` with `userId`, `email`, and `roles`
- `requirePageRole()` for page-level guard
- Never use `getSession()` for authorization

## Testing

```bash
# Unit tests
npm run test

# Database tests (requires Supabase)
npm run db:test
```

- Write tests for new features
- Follow existing test patterns in `*.test.ts` files
- Database tests use pgTAP

## Commit Messages

Use conventional commits:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Code style (formatting, semicolons, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Build process or auxiliary tool changes

Examples:
```
feat: Add gate pass verification endpoint
fix: Resolve lease overlap constraint error
docs: Update README with demo account instructions
```

## Pull Request Checklist

- [ ] Code follows the existing style
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] Tests added/updated
- [ ] No console.log or debugging code left
- [ ] No secrets or credentials committed
- [ ] All checks pass (`lint`, `typecheck`, `build`, `test`)

## Questions?

Open an issue or reach out to the maintainers.
