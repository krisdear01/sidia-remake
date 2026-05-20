<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\AssetMapper;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
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

        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        $cursor = (int) $request->query('cursor', 0);

        $key = "siau:v1:rooms:{$id}:assets:c{$cursor}:l{$limit}";
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

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL],
                'source' => 'siisyana',
                'pagination' => ['limit' => $limit, 'next_cursor' => $nextCursor],
            ],
            links: [
                'self' => "/api/v1/rooms/{$id}/assets",
                'room' => "/api/v1/rooms/{$id}",
            ]
        );
    }
}
