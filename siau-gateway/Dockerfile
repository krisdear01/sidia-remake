# Multi-stage build for the SIAU gateway.
# Stage 1: composer dependencies (production only).
# Stage 2: runtime image with PHP-FPM + Nginx; designed for blue/green swap.

# ============================================================================
# Stage 1 — vendor
# ============================================================================
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# ============================================================================
# Stage 2 — runtime
# ============================================================================
FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache nginx supervisor curl tini \
 && docker-php-ext-install pdo pdo_mysql opcache

# PHP / OPcache tuning suitable for a read-heavy API in front of a cache.
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.enable_cli=0'; \
      echo 'opcache.memory_consumption=128'; \
      echo 'opcache.interned_strings_buffer=16'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'opcache.validate_timestamps=0'; \
      echo 'opcache.revalidate_freq=0'; \
      echo 'opcache.fast_shutdown=1'; \
      echo 'expose_php=Off'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

# Blue/green friendly: tini supervises supervisord so a SIGTERM
# is forwarded cleanly to PHP-FPM + Nginx → drained connections.
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]

# Container-level healthcheck. The load balancer should ALSO probe /api/v1/health
# externally during the blue/green cutover.
HEALTHCHECK --interval=20s --timeout=3s --start-period=15s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:8080/api/v1/health || exit 1
