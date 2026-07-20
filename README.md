# SIAU — Sistem Informasi Aset Udayana

SIAU (formerly SIDIA) is a full-stack digital asset management system for
**Universitas Udayana**. It gives students, staff, and administrators a public,
map-based way to explore university land, buildings, laboratories, meeting
rooms, and libraries — all backed by live data from the university's existing
SIISYANA (asset registry) and SIPIRANG (room booking) systems — plus an admin
back office and a public asset auction (e-lelang) module.

The repo folder is still named `sidia-remake/`.

## Architecture

Three independent services, developed together in this repo:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐      ┌────────────────────┐
│  Frontend (SPA)  │─────▶│  Backend (Laravel) │─────▶│  SIAU Gateway (LV)   │─────▶│  SIISYANA / SIPIRANG │
│  React + Vite    │ REST │  api/v1/*          │ REST │  read-only proxy     │ SQL  │  university DBs      │
│  :3000           │      │  :8000             │      │  :8765               │      │  (external, RO creds)│
└─────────────────┘      └──────────────────┘      └─────────────────────┘      └────────────────────┘
        │                          │
        │                          ├── SQLite (own tables: buildings, rooms, assets, polygons,
        │                          │            auctions, bidders, schedules, admin users)
        └── talks ONLY through api/client.ts
```

- **Frontend** — React 19 + TypeScript SPA at the repo root. Talks to the backend
  exclusively through [`api/client.ts`](api/client.ts) (base URL hardcoded to
  `http://localhost:8000/api/v1`).
- **Backend** (`backend/`) — Laravel 12 REST API. Owns its own SQLite database
  for locally-managed resources (buildings, rooms, assets, polygons, auctions,
  bidders, schedules) and proxies read-only calls to the SIAU Gateway for live
  university data.
- **SIAU Gateway** (`siau-gateway/`) — a separate Laravel 12 service that holds
  the **read-only** credentials to the university's SIISYANA and SIPIRANG
  databases. It never writes to those databases; it maps, caches, and
  rate-limits reads, and strips PII before anything reaches the backend.

The frontend never talks to the gateway directly — every SIISYANA/SIPIRANG-backed
read is proxied through the backend (`/api/v1/siau/*`) so there is one place that
enforces auth, CORS, and rate limits for the public site.

## What the app does

### Public site (no login required)

| Route | What it shows |
|---|---|
| `/` | Homepage: category menu, global **"Cari Aset"** search, interactive land map, paginated/filterable room-and-asset table |
| `/gedung` | Interactive campus map of **all** building footprints (from SIISYANA), with a synced sidebar list |
| `/lab`, `/laboratorium` | Same map, sidebar scoped to **Laboratorium** rooms only |
| `/ruang-rapat` | Same map, sidebar scoped to **Ruang Rapat/Pertemuan** rooms only |
| `/perpus`, `/perpustakaan` | Same map, sidebar scoped to **UPT Perpustakaan** rooms only |
| `/lelang` | Public asset auction (e-lelang) listing |
| `/lelang/:id` | Auction item detail + bidding |
| `/lelang/register`, `/lelang/login` | Bidder registration / login |

**Interactive maps** (Leaflet, OSM + Google-satellite base layers):
- The homepage map shows **land parcels** (tanah) — SHP/KIB, total area, unused
  area — pulled live from SIISYANA `tanahs`.
- `/gedung` and the three category pages share one component
  ([`AssetCategoryMapPage`](components/AssetCategoryMapPage.tsx)) that renders
  **building footprint polygons** (from SIISYANA `denah_asets` ⨝ `tb_m_gedung`).
  Clicking a building opens a **Detail Informasi** modal: KIB, photo gallery,
  printable-detail PDF, and a room list. On category pages the room list (and
  the sidebar) is filtered to that category's `jenis_ruangan`; the map itself
  always shows every building.
- Clicking any room opens its **live 7-day booking schedule and real-time
  availability**, sourced from SIPIRANG (`tb_transaksi_pinjam`) via the gateway.

**Global search ("Cari Aset")** on the homepage is a debounced, categorized
search across SIISYANA: Gedung, Ruangan, Tanah, and Aset (physical inventory
items, resolved to their current room). Results open the relevant detail modal.

### Admin back office (`/admin/*`, requires login)

Gated by `<ProtectedRoute>` (Sanctum token in `localStorage`, key
`siau_auth_token`; redirects to `/admin/login` when missing/expired).

- **Dashboard** — summary stats.
- **Buildings / Rooms / Assets** — CRUD over the backend's own SQLite tables.
- **Validate Rooms** — reconciles local room identity against SIISYANA.
- **Penyusutan Aset** — asset depreciation view.
- **Polygons** — import/edit map polygons (GeoJSON), including mapping each
  polygon to its SIISYANA `gedung`/`tanah` id and asset type so the public
  maps can enrich it.
- **Schedules** — facility booking schedules.
- **Auctions** — manage e-lelang listings, bids, and deposits.
- **Cetak DBR** (`/admin/cetak/dbr/:roomId`) — standalone, print-friendly
  Daftar Barang Ruangan (BMN export) view, outside the admin chrome so it
  prints clean.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router 6, Tailwind (via CDN/utility classes), Leaflet, lucide-react |
| Backend | Laravel 12, PHP 8.2+, SQLite (default), Sanctum |
| SIAU Gateway | Laravel 12, PHP 8.2+, read-only MySQL connections to SIISYANA/SIPIRANG |

## Repository layout

```
sidia-remake/
├── App.tsx                 # single source of routing (react-router v6)
├── api/client.ts            # ALL frontend HTTP goes through here
├── components/               # shared UI (AssetMap, AssetCategoryMapPage, MapDetailModal, ...)
├── pages/                    # route-level pages (public, e-lelang, admin/)
├── types.ts, constants.ts    # shared types/constants across the whole frontend
├── backend/                  # Laravel API (:8000) — owns its own SQLite DB
│   ├── app/Http/Controllers/Api/
│   ├── database/migrations/, seeders/
│   └── routes/api.php        # public / admin / bidder route blocks
└── siau-gateway/              # Laravel service (:8765) — read-only SIISYANA/SIPIRANG proxy
    ├── app/Http/Controllers/Api/V1/
    ├── app/Domain/Mapping/    # *Mapper classes: raw DB rows -> whitelisted API shapes
    └── routes/api.php
```

## Getting started

### Prerequisites

- Node.js (for the frontend)
- PHP 8.2+ and Composer (for `backend/` and `siau-gateway/`)
- Read-only network access + credentials for the SIISYANA/SIPIRANG databases
  (only needed if you want live university data through the gateway; the rest
  of the app works against the backend's own SQLite data without it)

### 1. Frontend (repo root)

```bash
npm install
npm run dev        # http://localhost:3000 (host 0.0.0.0)
npm run build       # production build
npm run preview     # preview a production build
```

Set `GEMINI_API_KEY` in `.env.local` if you use the Gemini-powered features —
Vite exposes it to client code as `process.env.API_KEY` /
`process.env.GEMINI_API_KEY` (see `vite.config.ts`).

### 2. Backend (`backend/`)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed        # creates backend/database/database.sqlite
php artisan serve                 # http://localhost:8000
```

Useful seeders: `php artisan db:seed --class=HomepageRoomSeeder`.

Point the backend at your gateway instance via `backend/.env`:
`SIAU_GATEWAY_URL=http://localhost:8765/api/v1`.

### 3. SIAU Gateway (`siau-gateway/`) — optional for live SIISYANA/SIPIRANG data

```bash
cd siau-gateway
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate               # gateway-owned tables only (room_identity_map, etc.)
php artisan serve --port=8765     # MUST be 8765 — the backend expects it there
```

Fill in `siau-gateway/.env`:
- `GATEWAY_DB_*` — the gateway's own database (SQLite by default).
- `SIISYANA_RO_*` / `SIPIRANG_RO_*` — **read-only** credentials to the
  university's asset/booking databases. Never use write-capable credentials
  here; the gateway is designed to only ever `SELECT`.
- `SIISYANA_STORAGE_BASE_URL` — public base URL for SIISYANA-hosted media
  (building galleries, `file_rincian_gedung` PDFs).

Handy diagnostic command: `php artisan siau:inspect siisyana_ro <table>` dumps
a table's real column list — useful when a mapper needs updating for a schema
you haven't seen before.

### Running all three together

```bash
# terminal 1
cd siau-gateway && php artisan serve --port=8765
# terminal 2
cd backend && php artisan serve
# terminal 3
npm run dev
```

Then open **http://localhost:3000**.

## Testing

```bash
# backend
cd backend && php artisan test                       # full suite
php artisan test --filter SomeTest                     # single test

# siau-gateway
cd siau-gateway && php artisan test
```

## Conventions worth knowing

- **All frontend HTTP goes through `api/client.ts`.** Add new backend
  endpoints by extending the relevant resource object there (e.g. `roomsApi`,
  `siauApi`) — never call `fetch` directly from a component.
- **Shared frontend types/constants** live in `types.ts` and `constants.ts` at
  the root, not duplicated per-file.
- The Vite alias `@` resolves to the repo root, so `@/components/...` works
  from any depth.
- The backend and gateway serve JSON only — no Blade views are used by the
  SPA. `backend/vite.config.js` is for Laravel's own asset pipeline and is
  unrelated to the root SPA build.
- **The gateway is read-only, always.** It maps raw SIISYANA/SIPIRANG rows to
  whitelisted API shapes (see `app/Domain/Mapping/*Mapper.php`) and strips PII
  before responses leave the service. When adding a new gateway endpoint,
  follow the existing controllers' pattern: parameterized SQL, an explicit
  column whitelist in the mapper, and a short cache TTL.
- **Adding a new resource end-to-end:** migration + model + `Api/*Controller`
  + routes in the right `routes/api.php` block, then a matching `xxxApi`
  object in `api/client.ts` before any page consumes it.
- Interactive maps are Leaflet + GeoJSON; building/land polygons carry
  `asset_type` + `siisyana_gedung_id`/`siisyana_tanah_id` so the frontend knows
  what SIISYANA record to fetch enrichment for. A polygon with no link still
  renders — it just shows "detail belum tersedia" instead of erroring.

## Further reading

See [`CLAUDE.md`](CLAUDE.md) for the fuller architecture notes used to guide
AI-assisted development on this codebase (routing details, API client
patterns, backend route blocks, and model list).
