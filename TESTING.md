# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast,
trust your instincts, and ship with confidence — without them, vibe coding is
just yolo coding. With tests, it's a superpower.

## Frontend (repo root)

Framework: **Vitest** + **@testing-library/react** + jsdom.

```bash
npm test          # vitest run — single pass, exits with a status code
npx vitest        # watch mode
```

Config: `vitest.config.ts` (reuses the Vite React plugin + `@` alias),
`vitest.setup.ts` (loads `@testing-library/jest-dom` matchers).

- **Unit tests** — pure functions and business logic (e.g. xlsx-parsing
  utilities). Colocate as `ComponentOrModule.test.ts(x)` next to the file
  under test.
- **Component tests** — render with `@testing-library/react`, query by role/
  text like a user would, assert on rendered output — not implementation
  details.

Conventions: `describe`/`it`, `expect(...).toBe(...)` / `toMatchObject(...)`,
one `describe` block per exported function/component.

## Backend (`backend/`)

Framework: **PHPUnit** (already configured — this predates this bootstrap).

```bash
cd backend && php artisan test                    # full suite
php artisan test --filter SomeTest                 # single test
```

Config: `backend/phpunit.xml` (uses `DB_CONNECTION=sqlite`,
`DB_DATABASE=:memory:` — no database setup needed to run tests).

## CI

`.github/workflows/test.yml` runs both suites on every push and PR.
