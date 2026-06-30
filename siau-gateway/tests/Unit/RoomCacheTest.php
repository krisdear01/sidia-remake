<?php

namespace Tests\Unit;

use App\Support\RoomCache;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * RoomCache is the invalidation backbone for per-room gateway caches. Because
 * the cache store has no tag support, correctness rests entirely on the
 * version stamp: a bump must change every key the room produces.
 */
class RoomCacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_version_defaults_to_one(): void
    {
        $this->assertSame(1, RoomCache::version(42));
    }

    public function test_key_is_versioned_and_suffix_scoped(): void
    {
        $this->assertSame('siau:rooms:42:v1:asset_count', RoomCache::key(42, 'asset_count'));
        $this->assertSame('siau:rooms:42:v1:assets:c0:l50', RoomCache::key(42, 'assets:c0:l50'));
    }

    public function test_bump_changes_every_variant_for_that_room(): void
    {
        $before = [
            RoomCache::key(42, 'detail'),
            RoomCache::key(42, 'asset_count'),
            RoomCache::key(42, 'assets:c0:l50'),
            RoomCache::key(42, 'assets:c0:l200'),
        ];

        RoomCache::bump(42);

        $this->assertSame(2, RoomCache::version(42));
        foreach ($before as $oldKey) {
            $this->assertStringContainsString(':v1:', $oldKey);
            $newKey = str_replace(':v1:', ':v2:', $oldKey);
            $this->assertNotSame($oldKey, $newKey);
            $this->assertSame($newKey, RoomCache::key(42, explode(':v1:', $oldKey)[1]));
        }
    }

    public function test_bump_is_scoped_to_a_single_room(): void
    {
        RoomCache::bump(42);

        $this->assertSame(2, RoomCache::version(42));
        $this->assertSame(1, RoomCache::version(99));
    }
}
