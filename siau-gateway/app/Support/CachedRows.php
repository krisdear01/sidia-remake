<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Cache helper for PDO result rows.
 *
 * Storing stdClass instances in Laravel's file/database cache stores can
 * rehydrate as __PHP_Incomplete_Class on cold lookups. We normalise to
 * plain arrays for storage and convert back to stdClass on retrieval so
 * existing mappers ($row->field) keep working.
 *
 * @template T
 */
class CachedRows
{
    /**
     * Remember a list of PDO rows.
     *
     * @return array{0: object[], 1: bool}  [rows, cacheHit]
     */
    public static function rememberMany(string $key, int $ttl, \Closure $fetch): array
    {
        $hit = Cache::has($key);
        $stored = Cache::remember($key, $ttl, fn() => array_map(
            fn($r) => (array) $r,
            $fetch()
        ));
        $rows = array_map(fn(array $a) => (object) $a, $stored);
        return [$rows, $hit];
    }

    /**
     * Remember a single PDO row (or null).
     *
     * @return array{0: ?object, 1: bool}  [row, cacheHit]
     */
    public static function rememberOne(string $key, int $ttl, \Closure $fetch): array
    {
        $hit = Cache::has($key);
        $stored = Cache::remember($key, $ttl, function () use ($fetch) {
            $r = $fetch();
            return $r === null ? null : (array) $r;
        });
        return [$stored === null ? null : (object) $stored, $hit];
    }

    /** Remember a scalar value (int, string, bool). */
    public static function rememberScalar(string $key, int $ttl, \Closure $fetch): mixed
    {
        return Cache::remember($key, $ttl, $fetch);
    }
}
