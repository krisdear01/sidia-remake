<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\AssetMapper;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use App\Support\RoomCache;
use App\Support\RoomVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class RoomAssetsController extends Controller
{
    private const TTL = 60 * 60;

    public function index(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        if (!RoomVisibility::isAccessible((int) $id, $request)) {
            return response()->json([
                'type' => 'https://siau.unud.ac.id/errors/forbidden',
                'title' => 'Forbidden',
                'status' => 403,
                'code' => 'ROOM_PRIVATE',
                'detail' => 'This room is private; asset access requires admin authentication.',
                'instance' => $request->path(),
            ], 403, ['Content-Type' => 'application/problem+json']);
        }

        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        $cursor = (int) $request->query('cursor', 0);

        $key = RoomCache::key((int) $id, "assets:c{$cursor}:l{$limit}");
        [$rows, $hit] = CachedRows::rememberMany($key, self::TTL, function () use ($id, $limit, $cursor) {
            // Current placement = latest row per id_barang in barang_ruangan_histories.
            return DB::connection('siisyana_ro')->select(
                'SELECT b.id, b.kode_barang, b.nama_barang, b.merk_type, b.kondisi_terakhir, '
                . 'b.kuantitas, b.tanggal_perolehan, ? AS id_ruangan, b.id_unit '
                . 'FROM barangs_latest b '
                . 'INNER JOIN ('
                . '  SELECT brh.id_barang FROM barang_ruangan_histories brh '
                . '  INNER JOIN (SELECT id_barang, MAX(id) AS max_id FROM barang_ruangan_histories GROUP BY id_barang) latest '
                . '  ON brh.id = latest.max_id WHERE brh.id_ruangan = ?'
                . ') placed ON placed.id_barang = b.id '
                . 'WHERE b.dihapus = 0 AND b.id > ? '
                . 'ORDER BY b.id ASC LIMIT ?',
                [(int) $id, (int) $id, $cursor, $limit]
            );
        });

        $data = array_map([AssetMapper::class, 'map'], $rows);
        $nextCursor = !empty($rows) ? end($rows)->id : null;

        // Append hibah assets for this room. Hibah is small and local — no
        // separate pagination, we just include all of them on the first page
        // (cursor 0). On subsequent cursor pages we omit them to avoid
        // duplicate rendering as the SPA paginates through SIISYANA assets.
        if ($cursor === 0) {
            $hibahRows = DB::connection('gateway')->table('hibah_assets')
                ->where('id_ruangan', (int) $id)
                ->orderByDesc('id')
                ->get();
            foreach ($hibahRows as $h) {
                $data[] = AssetMapper::mapHibah($h);
            }
        }

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL],
                'source' => 'siisyana+hibah',
                'pagination' => ['limit' => $limit, 'next_cursor' => $nextCursor],
            ],
            links: [
                'self' => "/api/v1/rooms/{$id}/assets",
                'room' => "/api/v1/rooms/{$id}",
            ]
        );
    }
}
