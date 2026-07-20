# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SIAU (Sistem Informasi Aset Udayana) — formerly named SIDIA — is a full-stack digital asset management system for Universitas Udayana. The repo folder is still `sidia-remake/`. It consists of:

- **Frontend**: React 19 + TypeScript + Vite SPA at the repo root (`App.tsx`, `pages/`, `components/`, `api/`).
- **Backend**: Laravel REST API under `backend/` exposed at `http://localhost:8000/api/v1`.

The two are developed in the same repo but run as independent processes. The frontend talks to the backend strictly through `api/client.ts` (base URL is hardcoded to `http://localhost:8000/api/v1`).

## Common Commands

### Frontend (run from repo root)
```bash
npm install
npm run dev        # vite dev server on :3000, host 0.0.0.0
npm run build
npm run preview
npm test            # vitest run — frontend unit/component tests
```
`GEMINI_API_KEY` from `.env.local` is exposed to the client as `process.env.API_KEY` / `process.env.GEMINI_API_KEY` via `vite.config.ts`.

### Backend (run from `backend/`)
```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed     # SQLite db at backend/database/database.sqlite
php artisan serve              # http://localhost:8000

php artisan test                       # full suite (PHPUnit)
php artisan test --filter SomeTest     # single test
php artisan db:seed --class=HomepageRoomSeeder   # run one seeder
```

## Architecture

### Frontend routing & layout
`App.tsx` is the single source of routing (react-router v6). Three audience-distinct route groups share one `BrowserRouter`:
1. **Public home / academic pages** — `HomePage`, `GedungPage`, `LaboratoriumPage`, `RuangRapatPage`, `PerpustakaanPage`.
2. **E-Lelang (auction)** — `AuctionListPage`, `AuctionDetailPage`, bidder register/login.
3. **Admin** — gated by `<ProtectedRoute>` which checks `isAuthenticated()` (token in `localStorage` under `siau_auth_token`) and redirects to `/admin/login`. Admin screens live inside `<AdminLayout>` and cover buildings, rooms, assets, polygons, schedules, auctions.

`components/AssetMap.tsx` uses Leaflet to render polygons from the backend's GeoJSON endpoint; `DataPolygon_SHP_Unud.geojson` at the root is the source asset that has been imported into the DB.

### API client pattern (`api/client.ts`)
All HTTP goes through `apiFetch<T>()`. It injects the bearer token, sets JSON headers, and on `401` clears the token and hard-redirects to `/admin/login`. Each resource (buildings, rooms, assets, polygons, schedules, auctions, bidders, stats, etc.) is exported as an object with `list/get/create/update/delete` methods — add new endpoints by extending these objects, not by calling `fetch` directly from components.

### Backend structure
Standard Laravel 11 layout. Controllers live under `app/Http/Controllers/Api/` and are wired in `routes/api.php`, which is organized into three blocks:
- **Public** (`Route::prefix('v1')`) — read endpoints, auth login, bidder auth, public auction/facility listings.
- **Admin** — sanctum-protected admin CRUD for every resource plus admin auction management.
- **Bidder** — sanctum-protected bidder actions (bidding, deposits, my-bids).

Models in `app/Models/` mirror the resource set (`Building`, `Room`, `Asset`, `Polygon`, `Schedule`, `Category`, `Location`, `Faculty`, `AuctionItem`, `Bid`, `Bidder`, `AuctionDeposit`, `FacilityBooking`, `User`). Auth uses Laravel Sanctum with two guards: admin `User` and `Bidder`.

Database is SQLite by default (`backend/database/database.sqlite`). Seeders compose from `DatabaseSeeder.php`; `HomepageRoomSeeder` and `AdditionalScheduleSeeder` populate the demo data the public homepage expects.

## Conventions worth knowing

- Frontend `types.ts` and `constants.ts` at the root are shared by all pages — keep shared shapes there rather than per-file.
- The Vite alias `@` resolves to the repo root (see `vite.config.ts`), so `@/components/...` works from any depth.
- The backend serves only JSON — no Blade views are used by the SPA. The Laravel `vite.config.js` inside `backend/` is for Laravel's own asset pipeline and is unrelated to the root SPA build.
- When adding a new resource end-to-end: add migration + model + `Api/*Controller` + routes in the appropriate `routes/api.php` block, then add a matching `xxxApi` object in `api/client.ts` before consuming it from a page.

## Testing

Frontend: `npm test` (Vitest + `@testing-library/react`, config in `vitest.config.ts`). Backend: `cd backend && php artisan test` (PHPUnit, in-memory SQLite). See [TESTING.md](TESTING.md) for conventions and layer breakdown. CI runs both suites on every push/PR via `.github/workflows/test.yml`.

100% test coverage is the goal — tests make vibe coding safe, not slow:
- New functions get a corresponding test.
- Bug fixes get a regression test that reproduces the bug first.
- New error-handling paths get a test that triggers the error.
- New conditionals (if/else, switch) get tests for every branch.
- Never commit code that makes existing tests fail.
