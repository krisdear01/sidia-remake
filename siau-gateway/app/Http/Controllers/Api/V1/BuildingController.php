<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\BuildingMapper;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class BuildingController extends Controller
{
    private const TTL_LIST = 60 * 60 * 24; // 24h master data
    private const TTL_DETAIL = 60 * 60 * 6; // 6h

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        $cursor = (int) $request->query('cursor', 0);

        $key = "siau:v1:buildings:list:c{$cursor}:l{$limit}";
        [$rows, $hit] = CachedRows::rememberMany($key, self::TTL_LIST, function () use ($limit, $cursor) {
            return DB::connection('siisyana_ro')->select(
                'SELECT id, kode_gedung, nama, jumlah_lantai, latitude, longitude, '
                . 'luas_gedung, jam_buka, jam_tutup, is_valid '
                . 'FROM tb_m_gedung '
                . 'WHERE is_deleted = 0 AND id > ? '
                . 'ORDER BY id ASC LIMIT ?',
                [$cursor, $limit]
            );
        });

        $data = array_map([BuildingMapper::class, 'map'], $rows);
        $nextCursor = !empty($rows) ? end($rows)->id : null;

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL_LIST],
                'source' => 'siisyana',
                'pagination' => ['limit' => $limit, 'next_cursor' => $nextCursor],
            ],
            links: ['self' => '/api/v1/buildings']
        );
    }

    public function show(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        $key = "siau:v1:buildings:{$id}";
        [$row, $hit] = CachedRows::rememberOne($key, self::TTL_DETAIL, function () use ($id) {
            // Schema confirmed (PROJ-81): nomor_kib + file_rincian_gedung exist on tb_m_gedung.
            $rows = DB::connection('siisyana_ro')->select(
                'SELECT id, kode_gedung, nama, jumlah_lantai, latitude, longitude, '
                . 'luas_gedung, jam_buka, jam_tutup, is_valid, nomor_kib, file_rincian_gedung '
                . 'FROM tb_m_gedung WHERE id = ? AND is_deleted = 0 LIMIT 1',
                [(int) $id]
            );
            return $rows[0] ?? null;
        });

        if ($row === null) {
            return JsonEnvelope::notFound('BUILDING_NOT_FOUND', "No building with id {$id}.", $request->path());
        }

        [$gallery, $galleryHit] = CachedRows::rememberMany("siau:v1:buildings:{$id}:gallery", self::TTL_DETAIL, function () use ($id) {
            // Schema confirmed (PROJ-81): gedung_fotos(id_gedung, image_foto_gedung), soft-deleted.
            return DB::connection('siisyana_ro')->select(
                'SELECT id, image_foto_gedung FROM gedung_fotos '
                . 'WHERE id_gedung = ? AND deleted_at IS NULL ORDER BY id ASC',
                [(int) $id]
            );
        });

        $data = BuildingMapper::map($row);
        $data['gallery'] = array_map(fn ($g) => [
            'url' => BuildingMapper::storageUrl($g->image_foto_gedung ?? null),
            'caption' => null,
        ], $gallery);

        return JsonEnvelope::ok(
            $data,
            meta: ['cache' => ['hit' => $hit && $galleryHit, 'ttl_seconds' => self::TTL_DETAIL], 'source' => 'siisyana'],
            links: ['self' => "/api/v1/buildings/{$id}"]
        );
    }

}
