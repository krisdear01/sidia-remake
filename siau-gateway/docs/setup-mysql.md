# SIAU Gateway — Local MySQL Setup

The gateway owns one local database (`siau_gateway`) for its operational tables:

| Table | Purpose |
|---|---|
| `room_identity_map` | SIISYANA ↔ SIPIRANG room mapping with confidence + manual overrides |
| `admin_audit_log` | Audit trail for every admin write |
| `cache`, `cache_locks` | Laravel cache store |
| `jobs`, `job_batches`, `failed_jobs` | Queue (unused today, present for framework) |
| `sessions`, `users`, `personal_access_tokens` | Scaffolding (unused) |
| `migrations` | Schema version tracking |

The two **upstream** databases (`c1db_siisyana`, `c10simpr`) are read-only MySQL sources and have their own credentials in `.env`. This document only covers the local gateway DB.

## 1. Provision the database (operator runs once)

Pick a strong password locally and run:

```sql
CREATE DATABASE siau_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'siau_gateway'@'localhost' IDENTIFIED BY '<set-locally>';
GRANT ALL PRIVILEGES ON siau_gateway.* TO 'siau_gateway'@'localhost';
FLUSH PRIVILEGES;
```

`ALL PRIVILEGES` is acceptable here because this user is scoped to the local gateway DB only. The user **must not** be granted access to `c1db_siisyana` or `c10simpr`.

## 2. Configure `.env`

Copy `.env.example` to `.env` (if you haven't yet) and set:

```
GATEWAY_DB_DRIVER=mysql
GATEWAY_DB_HOST=127.0.0.1
GATEWAY_DB_PORT=3306
GATEWAY_DB_DATABASE=siau_gateway
GATEWAY_DB_USERNAME=siau_gateway
GATEWAY_DB_PASSWORD=<the password you just set>
```

Do **not** commit `.env`.

## 3. Run migrations

From `siau-gateway/`:

```bash
# If you previously ran on SQLite, drop the old file so resync is clean.
rm -f database/database.sqlite

php artisan migrate --database=gateway --force
```

Verify:

```bash
mysql -u siau_gateway -p siau_gateway -e 'SHOW TABLES'
```

You should see `room_identity_map`, `admin_audit_log`, `cache`, `jobs`, `migrations`, plus a few framework scaffolding tables.

## 4. Reconcile the identity map

```bash
php artisan siau:reconcile-rooms
```

This reads SIISYANA + SIPIRANG (upstream, read-only) and writes the matched pairs into `siau_gateway.room_identity_map`. Manual overrides are preserved across re-runs.

## 5. Smoke test

```bash
php artisan serve --port=8765
curl http://localhost:8765/api/v1/health
# Expect: {"status":"ok"}
```

## Why MySQL and not SQLite locally?

- Production runs MySQL. Keeping dev on MySQL eliminates ENUM/JSON column-type drift surprises.
- Identity-map reconciliation joins against two upstream MySQL databases; staying on MySQL for the local DB makes potential cross-connection diagnostics easier.
- `admin_audit_log.payload` uses native MySQL `JSON` type — better than SQLite's `TEXT`.

## What about the upstream read-only guard?

Unchanged. `siisyana_ro` and `sipirang_ro` still have:
- PDO write host pinned to `127.0.0.1:1` (unreachable)
- Application-level `ReadOnlyGuard` permitting only `SELECT/SHOW/DESCRIBE/EXPLAIN/WITH`

The new local MySQL `gateway` connection is intentionally writable — that is the only place gateway code is allowed to persist data.
