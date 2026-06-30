<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\LandMapper;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class LandController extends Controller
{
    private const TTL_LIST = 60 * 60 * 24; // 24h master data
    private const TTL_DETAIL = 60 * 60 * 6; // 6h

    // Schema confirmed (PROJ-81): `tanahs` uses soft deletes (deleted_at).
    private const TABLE = 'tanahs';
    private const COLUMNS = 'id, nomor_shp, nomor_kib, lokasi, luas_total, '
        . 'luas_tidak_terpakai, latitude, longitude';

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        $cursor = (int) $request->query('cursor', 0);

        $key = "siau:v1:land:list:c{$cursor}:l{$limit}";
        [$rows, $hit] = CachedRows::rememberMany($key, self::TTL_LIST, function () use ($limit, $cursor) {
            return DB::connection('siisyana_ro')->select(
                'SELECT ' . self::COLUMNS . ' FROM ' . self::TABLE . ' '
                . 'WHERE deleted_at IS NULL AND id > ? '
                . 'ORDER BY id ASC LIMIT ?',
                [$cursor, $limit]
            );
        });

        $data = array_map([LandMapper::class, 'map'], $rows);
        $nextCursor = !empty($rows) ? end($rows)->id : null;

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL_LIST],
                'source' => 'siisyana',
                'pagination' => ['limit' => $limit, 'next_cursor' => $nextCursor],
            ],
            links: ['self' => '/api/v1/land']
        );
    }

    public function show(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        $key = "siau:v1:land:{$id}";
        [$row, $hit] = CachedRows::rememberOne($key, self::TTL_DETAIL, function () use ($id) {
            $rows = DB::connection('siisyana_ro')->select(
                'SELECT ' . self::COLUMNS . ' FROM ' . self::TABLE . ' '
                . 'WHERE id = ? AND deleted_at IS NULL LIMIT 1',
                [(int) $id]
            );
            return $rows[0] ?? null;
        });

        if ($row === null) {
            return JsonEnvelope::notFound('LAND_NOT_FOUND', "No land with id {$id}.", $request->path());
        }

        return JsonEnvelope::ok(
            LandMapper::map($row),
            meta: ['cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL_DETAIL], 'source' => 'siisyana'],
            links: ['self' => "/api/v1/land/{$id}"]
        );
    }
}
