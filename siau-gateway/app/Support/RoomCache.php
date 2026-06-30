<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Per-room cache versioning.
 *
 * The gateway cache store is the `database` driver, which has no tag support,
 * so we can't flush a room's entries by tag. Instead every per-room cache key
 * embeds a version stamp; bumping the stamp invalidates every variant at once
 * (all asset pages regardless of cursor/limit, the asset count, the detail
 * row) in a driver-agnostic way. Old entries are never read again and expire
 * naturally on their own TTL.
 */
class RoomCache
{
    /** Current cache version for a room. Defaults to 1 when never bumped. */
    public static function version(int $roomId): int
    {
        return (int) Cache::get(self::versionKey($roomId), 1);
    }

    /** Invalidate every per-room cache entry for this room. */
    public static function bump(int $roomId): void
    {
        // Read-then-write: concurrent bumps may collapse two increments into
        // one, but the version still changes, so stale entries are still
        // abandoned. Admin writes are low-concurrency; this is sufficient.
        Cache::forever(self::versionKey($roomId), self::version($roomId) + 1);
    }

    /** Build a versioned per-room cache key, e.g. siau:rooms:42:v3:asset_count. */
    public static function key(int $roomId, string $suffix): string
    {
        return "siau:rooms:{$roomId}:v" . self::version($roomId) . ":{$suffix}";
    }

    private static function versionKey(int $roomId): string
    {
        return "siau:roomver:{$roomId}";
    }
}
