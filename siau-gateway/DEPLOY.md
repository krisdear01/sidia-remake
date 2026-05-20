# SIAU Gateway — Blue/Green Deploy Runbook

The gateway is designed to be deployed independently of SIDIA, SIISYANA, and SIPIRANG. A blue/green swap is the standard release path.

## Image

Single container image built from `Dockerfile`. Contains:

- PHP 8.3 FPM with `pdo_mysql` + `opcache`
- Nginx fronting PHP-FPM on port 8080
- supervisord supervises both processes; `tini` forwards `SIGTERM` for graceful drain

Health probe inside the container: `curl /api/v1/health` every 20s.

## Required env (must be set; container refuses to start otherwise)

| Var | Purpose |
|---|---|
| `APP_KEY` | Laravel encryption key (`php artisan key:generate --show`) |
| `SIISYANA_RO_HOST` / `SIISYANA_RO_USER` / `SIISYANA_RO_PASS` | SIISYANA read-only credential |
| `SIPIRANG_RO_HOST` / `SIPIRANG_RO_USER` / `SIPIRANG_RO_PASS` | SIPIRANG read-only credential |
| `SIAU_ADMIN_TOKEN` | Bearer token for `/api/v1/admin/*` |
| `SIAU_CORS_ORIGINS` | Comma-separated allowlist; wildcard explicitly rejected |
| `REDIS_HOST` | Required if `CACHE_STORE=redis` (recommended) |
| `GATEWAY_DB_*` | Gateway-owned DB (MySQL or Postgres in prod, SQLite OK in dev) |

Secrets are injected from your vault, never committed.

## Blue/Green cutover

1. Build & tag `siau-gateway:vX.Y.Z`.
2. Push to your registry.
3. Bring up the **green** pool with the new tag. The container's entrypoint runs `migrate --force --database=gateway` — this only ever touches the gateway-owned DB, never SIISYANA or SIPIRANG.
4. The container is unhealthy for ~15s while warming opcache + route cache + JWKS-equivalent. Health probe goes green when `/api/v1/health` returns 200.
5. Smoke-test green directly (skip the LB): hit `/api/v1/health`, `/api/v1/buildings?limit=1`, `/api/v1/rooms/24/availability`.
6. Flip the load balancer to the green pool.
7. Drain the blue pool: `kubectl rollout undo` or equivalent stays available for fast rollback.
8. Watch for one full week — `/api/v1/admin/health`, source-DB slow logs, gateway latency p95.

## Rollback

`kubectl rollout undo deployment/siau-gateway` (or your equivalent). The previous image is fine — it has no migrations to undo (gateway-DB migrations are additive only; never destructive on source DBs).

## What the gateway will NEVER do during deploy

- Run migrations against SIISYANA or SIPIRANG. The `migrate` command in `entrypoint.sh` is pinned with `--database=gateway`.
- Open a write connection to the source DBs — the `write` host in `config/database.php` is `127.0.0.1:1` (black hole).
- Send any non-SELECT SQL to the sources — `ReadOnlyGuard` blocks it pre-execution.

## Post-launch watch (first week)

- Daily check `/api/v1/admin/health` for replica reach + uptime
- Daily check the SIISYANA + SIPIRANG slow query logs (we should be hitting them rarely thanks to cache + s-maxage)
- Daily check `gateway.admin_audit_log` for unexpected `identity_map.override` actions
- Weekly verify the cron — both `siau:contract-test` and `siau:reconcile-rooms` should run nightly. Contract failure pages oncall.
