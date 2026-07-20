# On-Premise Deployment Specification — SIAU

Target topology: **2 physical/virtual servers** (App + DB), typical of Unud's
on-prem hosting pattern. This document specifies what each server needs to run
SIAU reliably in production.

## 1. Topology

```
                         Internet / Campus LAN
                                  │
                          ┌───────▼────────┐
                          │  Reverse proxy  │  (can live on App server or a
                          │  Nginx :443     │   separate LB if Unud has one)
                          └───────┬────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                    APP SERVER                       │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
        │  │ Frontend    │  │ Backend API │  │ SIAU        │   │
        │  │ (static     │  │ Laravel     │  │ Gateway     │   │
        │  │  build)     │  │ :8000       │  │ Laravel     │   │
        │  │ served by   │  │ PHP-FPM     │  │ :8765       │   │
        │  │ Nginx       │  │             │  │ PHP-FPM     │   │
        │  └────────────┘  └──────┬─────┘  └──────┬─────┘   │
        └────────────────────────┼──────────────────┼─────────┘
                                  │ MySQL/MariaDB     │ read-only SQL
                        ┌────────▼────────┐  ┌────────▼─────────────┐
                        │    DB SERVER     │  │  SIISYANA / SIPIRANG  │
                        │  MySQL/MariaDB   │  │  (existing Unud DBs,  │
                        │  - siau_backend  │  │   outside this        │
                        │  - siau_gateway  │  │   deployment, network │
                        │  Redis (cache)   │  │   reachable read-only)│
                        └──────────────────┘  └───────────────────────┘
```

**Key point:** SIISYANA and SIPIRANG are existing Unud production databases
that this app only *reads* from (via the gateway's read-only credentials).
They are **not** part of this deployment's DB server — they're wherever
they already live, and the App server just needs network line-of-sight to
them on their DB port with a SELECT-only account.

## 2. Assumptions (adjust sizing if these are wrong)

- Public traffic: campus-scale usage — students/staff browsing maps, search,
  and the auction module. Assume **up to ~300 concurrent users** at peak
  (e.g. auction closing, semester room-booking rush), a few thousand unique
  visits/day.
- Admin back office: a small number of concurrent staff users (<20).
- No requirement stated for multi-region HA or automatic failover — this spec
  is a single active App server + single DB server, with backup/restore as
  the recovery strategy, not live failover. If Unud requires HA, see §9.
- The gateway's Redis cache absorbs the bulk of SIISYANA/SIPIRANG read load,
  so DB-side load on those external systems stays low regardless of frontend
  traffic (see `siau-gateway/DEPLOY.md` cache TTLs).

## 3. App Server

Runs: Nginx (reverse proxy + static frontend), Backend API (Laravel, PHP-FPM),
SIAU Gateway (Laravel, PHP-FPM), and (optionally) Redis if not placed on the
DB server.

| Spec | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS or Rocky Linux 9 (either is fine; pick what Unud already standardizes on) | same |
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Disk | 60 GB SSD | 100 GB SSD (NVMe preferred) |
| Network | 1 Gbps NIC, static IP, reachable from campus DNS/LB | same |

**Software stack:**

| Component | Version | Notes |
|---|---|---|
| Nginx | 1.24+ | reverse proxy to both PHP-FPM pools + serves the built frontend (`npm run build` → `dist/`) |
| PHP | 8.2 or 8.3 (FPM) | two separate FPM pools — one for `backend/`, one for `siau-gateway/` — so a spike in one doesn't starve the other |
| PHP extensions | `pdo_mysql`, `mbstring`, `xml`, `curl`, `bcmath`, `opcache`, `zip` | gateway also needs `pdo_mysql` for its read-only SIISYANA/SIPIRANG connections |
| Composer | 2.x | build-time only, not needed at runtime if you deploy vendor/ pre-built |
| Node.js | 20 LTS | build-time only, to run `npm run build`; not required at runtime once `dist/` is built |
| Process manager | systemd units (or supervisord, matching `siau-gateway/docker/supervisord.conf` if containerizing) for `backend` and `siau-gateway` PHP-FPM pools |
| TLS | Let's Encrypt or Unud's internal CA cert, terminated at Nginx | |

**Ports (internal to campus network / firewall-scoped, not all public):**

| Port | Service | Exposure |
|---|---|---|
| 443 | Nginx (public site) | public / campus-wide |
| 80 | Nginx (redirect to 443) | public / campus-wide |
| 8000 | Backend API (Laravel) | localhost only — Nginx proxies to it, nothing else should reach it directly |
| 8765 | SIAU Gateway | localhost only — backend proxies to it; never expose externally |

**Deployment note:** the gateway already ships a production-ready
`Dockerfile` + `docker-compose.yml` (PHP 8.3-FPM Alpine + Nginx + supervisord,
with opcache tuned for a read-heavy API) and a blue/green `DEPLOY.md` runbook
in `siau-gateway/`. If containers are acceptable on the App server (Docker or
Podman), reuse that image as-is rather than hand-rolling FPM config — it
already encodes the right PHP tuning and a `ReadOnlyGuard` that refuses any
non-SELECT SQL to the source DBs at the app layer, as defense in depth beyond
the DB grant.

## 4. DB Server

Runs: MySQL/MariaDB (for the backend's own data and the gateway's own
gateway-owned tables — *not* SIISYANA/SIPIRANG, which are external), and
Redis (gateway response cache).

| Spec | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS or Rocky Linux 9 | same |
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Disk | 100 GB SSD, separate volume for DB data vs. OS | 200 GB SSD/NVMe, RAID 1 or equivalent for durability |
| Network | 1 Gbps NIC, private/internal only (not internet-facing) | same |

**Software stack:**

| Component | Version | Notes |
|---|---|---|
| MySQL | 8.0+ | or MariaDB 10.11+; either is fine, pick whichever Unud already operates |
| Redis | 7.x | gateway response cache (`CACHE_STORE=redis`) — cuts SIISYANA/SIPIRANG read load dramatically per the gateway's existing cache TTLs |
| Backup tooling | `mysqldump`/`mariabackup` on a nightly cron, or your existing Unud backup agent | |

**Databases to provision:**

| DB name (suggested) | Owner | Purpose | Notes |
|---|---|---|---|
| `siau_backend` | backend app user (read/write) | buildings, rooms, assets, polygons, auctions, bidders, schedules, admin users | replaces the dev-default SQLite — **switch `DB_CONNECTION` in `backend/.env` to `mysql`** before going to production; SQLite is fine for local dev, not for a multi-process production deploy |
| `siau_gateway` | gateway app user (read/write) | gateway-owned tables only: `room_identity_map`, `admin_audit_log`, hibah_assets, room_visibility — **never** SIISYANA/SIPIRANG tables | set via `GATEWAY_DB_*` in `siau-gateway/.env` |

**Critical constraint — read-only to SIISYANA/SIPIRANG:** the gateway's
`SIISYANA_RO_*` / `SIPIRANG_RO_*` credentials must be provisioned as
**SELECT-only** MySQL grants on whichever server actually hosts those
databases (outside this spec's DB server). Confirm with whoever owns those
systems that the account has no `INSERT`/`UPDATE`/`DELETE`/`DDL` privileges —
this is enforced in application code (`ReadOnlyGuard`) but should also be
enforced at the DB grant level as defense in depth.

## 5. Network / Firewall Matrix

| From | To | Port | Purpose |
|---|---|---|---|
| Internet / campus users | App server | 443, 80 | public site + admin login |
| App server (Nginx) | App server (localhost) | 8000, 8765 | internal reverse-proxy hops |
| App server (backend) | DB server | 3306 (MySQL) | `siau_backend` DB |
| App server (gateway) | DB server | 3306 (MySQL), 6379 (Redis) | `siau_gateway` DB + cache |
| App server (gateway) | SIISYANA DB host | 3306 (or its actual port) | read-only SELECT |
| App server (gateway) | SIPIRANG DB host | 3306 (or its actual port) | read-only SELECT |
| DB server | Internet | — | **should have none**; DB server should not be internet-reachable at all |

Nothing outside the App server should ever reach ports 8000 or 8765 directly —
only Nginx on the same host proxies to them.

## 6. Storage & Backup

- **DB server:** nightly full backup of `siau_backend` (this is the
  system-of-record for locally-managed buildings/rooms/assets/auctions/
  bidders — losing it loses real user data, e.g. bidder registrations and
  auction bids). Gateway DB (`siau_gateway`) is lower-stakes — it's a
  re-derivable identity map + audit log — but back it up too; a weekly
  cadence is acceptable there.
- **App server:** back up `backend/storage/` (file uploads, logs) if any
  uploaded assets live there; the built frontend (`dist/`) is reproducible
  from source and doesn't need backing up.
- Retention: keep at minimum 7 daily + 4 weekly backups off the DB server
  itself (a backup that lives only on the machine it protects isn't a backup).

## 7. Security Hardening Checklist

- [ ] DB server firewalled to only accept connections from the App server's
      IP (no public MySQL/Redis exposure).
- [ ] `APP_DEBUG=false` in both `backend/.env` and `siau-gateway/.env` in
      production — debug mode leaks stack traces and env values.
- [ ] `SIAU_ADMIN_TOKEN` and `SIAU_CORS_ORIGINS` set explicitly (gateway
      refuses a wildcard CORS origin by design — confirm this stays true in
      prod config).
- [ ] SIISYANA/SIPIRANG read-only credentials verified SELECT-only at the DB
      grant level, not just trusted to app-code enforcement.
- [ ] TLS everywhere on the public-facing Nginx; HTTP redirects to HTTPS.
- [ ] Laravel `APP_KEY` generated freshly for this deployment (not copied
      from a dev `.env`) on both `backend/` and `siau-gateway/`.
- [ ] Sanctum token expiration (`SANCTUM_TOKEN_EXPIRATION`) set to a sane
      value for admin sessions.
- [ ] OS-level: automatic security updates enabled, SSH key-only auth,
      fail2ban or equivalent on both servers.

## 8. Sizing Tiers (pick based on real expected load)

| Tier | Concurrent users | App server | DB server |
|---|---|---|---|
| **Small** (pilot/single-faculty rollout) | <50 | 4 vCPU / 8 GB | 4 vCPU / 8 GB |
| **Medium** (campus-wide, as assumed in §2) | ~300 | 8 vCPU / 16 GB | 8 vCPU / 16 GB |
| **Large** (peak auction events, university-wide push) | 500+ | 16 vCPU / 32 GB, consider a second App server behind a load balancer | 16 vCPU / 32 GB, consider read replica |

The app is largely read-heavy and cache-friendly (gateway caches SIISYANA/
SIPIRANG reads), so vertical scaling on the App server tends to buy more
headroom than DB scaling until you're well past the Medium tier.

## 9. Out of Scope / Open Questions for Unud IT

- **HA/failover:** this spec is single-instance per tier. If Unud requires
  no-downtime failover, the natural extension is two App servers behind a
  load balancer (stateless — session/token state lives in Sanctum tokens +
  DB, not server memory) and DB replication (MySQL primary/replica) — flag
  if this is a hard requirement so it can be scoped as a follow-up.
- **SIISYANA/SIPIRANG network path:** confirm whether the App server sits on
  the same campus network segment as those DBs already, or whether a
  firewall rule / VPN needs to be requested — this is an existing-system
  question outside this repo's control.
- **Load balancer/WAF:** if Unud has a central reverse proxy or WAF in front
  of all hosted apps, the "reverse proxy" box in §1 may be that shared
  infrastructure instead of Nginx on the App server — architecture-compatible
  either way, just confirm where TLS terminates.
