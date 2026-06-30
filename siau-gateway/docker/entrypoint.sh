#!/bin/sh
set -e

# Required env vars (the container should refuse to start without these).
required="APP_KEY SIISYANA_RO_HOST SIISYANA_RO_USER SIISYANA_RO_PASS SIPIRANG_RO_HOST SIPIRANG_RO_USER SIPIRANG_RO_PASS SIAU_ADMIN_TOKEN"
for v in $required; do
    eval "val=\$$v"
    if [ -z "$val" ]; then
        echo "FATAL: env var $v is not set" >&2
        exit 1
    fi
done

# Run any pending migrations against the gateway DB only.
# This NEVER touches siisyana_ro or sipirang_ro — those connections are
# wrapped in ReadOnlyGuard and have their write hosts black-holed.
php artisan migrate --force --no-interaction --database=gateway || {
    echo "FATAL: migrations failed" >&2
    exit 1
}

# Warm config + route caches for opcache-friendly startup.
php artisan config:cache
php artisan route:cache

exec /usr/bin/supervisord -c /etc/supervisord.conf
