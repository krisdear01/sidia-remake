<?php

namespace App\Domain;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RoomIdentityResolver
{
    private const TTL_MAPPING = 60 * 60 * 24;
    private const TTL_NOT_FOUND = 60 * 60;

    /** @return ?int SIPIRANG room id, or null if no match (or marked unmatched in the map). */
    public function siisyanaToSipirang(int $siisyanaRoomId): ?int
    {
        $key = "siau:identity:siisyana_to_sipirang:{$siisyanaRoomId}";

        $cached = Cache::get($key, '__miss__');
        if ($cached !== '__miss__') {
            return $cached === null ? null : (int) $cached;
        }

        // Prefer the gateway-owned map (admin overrides, last reconcile).
        $mapped = $this->fromMap($siisyanaRoomId);
        if ($mapped !== '__nope__') {
            Cache::put($key, $mapped, $mapped === null ? self::TTL_NOT_FOUND : self::TTL_MAPPING);
            return $mapped === null ? null : (int) $mapped;
        }

        // Fall back to live join via kode_ruangan.
        $kode = $this->kodeForSiisyanaRoom($siisyanaRoomId);
        if ($kode === null) {
            Cache::put($key, null, self::TTL_NOT_FOUND);
            return null;
        }

        $rows = DB::connection('sipirang_ro')->select(
            'SELECT id FROM tb_m_ruangan WHERE kode_ruangan = ? AND is_deleted = 0 LIMIT 1',
            [$kode]
        );
        $sipirangId = $rows[0]->id ?? null;

        Cache::put($key, $sipirangId, $sipirangId === null ? self::TTL_NOT_FOUND : self::TTL_MAPPING);
        return $sipirangId === null ? null : (int) $sipirangId;
    }

    /** @return mixed int|null sipirang id; or sentinel '__nope__' if no map row exists. */
    private function fromMap(int $siisyanaRoomId): mixed
    {
        try {
            $row = DB::connection('gateway')->table('room_identity_map')
                ->where('siisyana_room_id', $siisyanaRoomId)
                ->first();
        } catch (\Throwable) {
            return '__nope__';
        }
        if ($row === null) return '__nope__';
        return $row->sipirang_room_id === null ? null : (int) $row->sipirang_room_id;
    }

    private function kodeForSiisyanaRoom(int $siisyanaRoomId): ?string
    {
        $key = "siau:identity:siisyana_kode:{$siisyanaRoomId}";
        return Cache::remember($key, self::TTL_MAPPING, function () use ($siisyanaRoomId) {
            $rows = DB::connection('siisyana_ro')->select(
                'SELECT kode_ruangan FROM tb_m_ruangan WHERE id = ? AND is_deleted = 0 LIMIT 1',
                [$siisyanaRoomId]
            );
            return $rows[0]->kode_ruangan ?? null;
        });
    }
}
