<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\RoomMapper;
use App\Domain\Rules\RoomReadinessRule;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use App\Support\RoomCache;
use App\Support\RoomVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class RoomController extends Controller
{
    private const TTL_LIST = 60 * 60 * 6;
    private const TTL_DETAIL = 60 * 60 * 6;
    private const TTL_ASSET_COUNT = 60 * 60;

    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 50), 1), 200);
        $cursor = (int) $request->query('cursor', 0);
        $idGedung = $request->query('id_gedung');
        $idUnit = $request->query('id_unit');

        if ($idGedung !== null && !ctype_digit((string) $idGedung)) {
            return JsonEnvelope::validation('id_gedung must be integer', $request->path());
        }
        if ($idUnit !== null && !ctype_digit((string) $idUnit)) {
            return JsonEnvelope::validation('id_unit must be integer', $request->path());
        }

        $key = "siau:v3:rooms:list:c{$cursor}:l{$limit}:g" . ($idGedung ?? '_') . ':u' . ($idUnit ?? '_');
        [$rows, $hit] = CachedRows::rememberMany($key, self::TTL_LIST, function () use ($limit, $cursor, $idGedung, $idUnit) {
            $params = [$cursor];
            $where = 'r.is_deleted = 0 AND r.id > ?';
            if ($idGedung !== null) { $where .= ' AND r.id_gedung = ?'; $params[] = (int) $idGedung; }
            if ($idUnit !== null) { $where .= ' AND r.id_unit = ?'; $params[] = (int) $idUnit; }
            $params[] = $limit;

            $rows = DB::connection('siisyana_ro')->select(
                'SELECT r.id, r.kode_ruangan, r.nama, r.max_kapasitas, r.is_valid, r.is_renovasi, '
                . 'r.id_gedung, r.id_unit, r.id_jenis_ruangan, '
                . 'g.kode_gedung AS g_kode, g.nama AS g_nama, g.latitude AS g_lat, g.longitude AS g_lng, '
                . 'u.id_unit AS u_id, u.nama_unit_panjang AS u_nama, '
                . 'jr.id AS jr_id, jr.jenis_ruangan AS jr_nama '
                . 'FROM tb_m_ruangan r '
                . 'LEFT JOIN tb_m_gedung g ON g.id = r.id_gedung AND g.is_deleted = 0 '
                . 'LEFT JOIN m_unit u ON u.id_unit = r.id_unit '
                . 'LEFT JOIN tb_m_jenis_ruangan jr ON jr.id = r.id_jenis_ruangan '
                . "WHERE {$where} "
                . 'ORDER BY r.id ASC LIMIT ?',
                $params
            );

            // Bulk asset_count: one grouped query for ALL room ids on this
            // page instead of N per-row scalar lookups. Mirrors the placement
            // logic in show(): "latest barang_ruangan_histories per id_barang
            // pointing at this room, intersected with non-deleted barangs".
            if (!empty($rows)) {
                $ids = array_map(fn($r) => (int) $r->id, $rows);
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $countRows = DB::connection('siisyana_ro')->select(
                    'SELECT brh.id_ruangan, COUNT(*) AS c FROM barangs_latest b '
                    . 'INNER JOIN barang_ruangan_histories brh ON brh.id_barang = b.id '
                    . 'INNER JOIN (SELECT id_barang, MAX(id) AS max_id FROM barang_ruangan_histories GROUP BY id_barang) latest '
                    . 'ON brh.id = latest.max_id '
                    . "WHERE b.dihapus = 0 AND brh.id_ruangan IN ({$placeholders}) "
                    . 'GROUP BY brh.id_ruangan',
                    $ids
                );
                $countMap = [];
                foreach ($countRows as $cr) {
                    $countMap[(int) $cr->id_ruangan] = (int) $cr->c;
                }

                // Add hibah counts (gateway-local) on top — single grouped query.
                $hibahCounts = DB::connection('gateway')->table('hibah_assets')
                    ->selectRaw('id_ruangan, COUNT(*) AS c')
                    ->whereIn('id_ruangan', $ids)
                    ->groupBy('id_ruangan')
                    ->get();
                foreach ($hibahCounts as $hc) {
                    $countMap[(int) $hc->id_ruangan] = ($countMap[(int) $hc->id_ruangan] ?? 0) + (int) $hc->c;
                }

                // Visibility: rooms with no row default to public (true).
                $visRows = DB::connection('gateway')->table('room_visibility')
                    ->whereIn('siisyana_room_id', $ids)
                    ->pluck('is_public', 'siisyana_room_id');

                // Attach as synthetic properties so the cached array carries them.
                foreach ($rows as $r) {
                    $r->asset_count = $countMap[(int) $r->id] ?? 0;
                    $r->is_public = isset($visRows[(int) $r->id]) ? (bool) $visRows[(int) $r->id] : true;
                }
            }

            return $rows;
        });

        $data = array_map(
            fn($r) => RoomMapper::map(
                $r,
                null,
                isset($r->asset_count) ? (int) $r->asset_count : null,
                isset($r->is_public) ? (bool) $r->is_public : null,
            ),
            $rows
        );
        $nextCursor = !empty($rows) ? end($rows)->id : null;

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL_LIST],
                'source' => 'siisyana',
                'pagination' => ['limit' => $limit, 'next_cursor' => $nextCursor],
            ],
            links: ['self' => '/api/v1/rooms']
        );
    }

    public function show(string $id, Request $request): JsonResponse
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
                'detail' => 'This room is private; detail access requires admin authentication.',
                'instance' => $request->path(),
            ], 403, ['Content-Type' => 'application/problem+json']);
        }

        $key = RoomCache::key((int) $id, 'detail');
        [$row, $hit] = CachedRows::rememberOne($key, self::TTL_DETAIL, function () use ($id) {
            $rows = DB::connection('siisyana_ro')->select(
                'SELECT r.id, r.kode_ruangan, r.nama, r.max_kapasitas, r.is_valid, r.is_renovasi, '
                . 'r.id_gedung, r.id_unit, r.id_jenis_ruangan, '
                . 'g.kode_gedung AS g_kode, g.nama AS g_nama, g.latitude AS g_lat, g.longitude AS g_lng, '
                . 'u.id_unit AS u_id, u.nama_unit_panjang AS u_nama, '
                . 'jr.id AS jr_id, jr.jenis_ruangan AS jr_nama '
                . 'FROM tb_m_ruangan r '
                . 'LEFT JOIN tb_m_gedung g ON g.id = r.id_gedung AND g.is_deleted = 0 '
                . 'LEFT JOIN m_unit u ON u.id_unit = r.id_unit '
                . 'LEFT JOIN tb_m_jenis_ruangan jr ON jr.id = r.id_jenis_ruangan '
                . 'WHERE r.id = ? AND r.is_deleted = 0 LIMIT 1',
                [(int) $id]
            );
            return $rows[0] ?? null;
        });

        if ($row === null) {
            return JsonEnvelope::notFound('ROOM_NOT_FOUND', "No room with id {$id}.", $request->path());
        }

        // Current asset placement is derived from barang_ruangan_histories
        // (latest row per id_barang), since barangs_latest.id_ruangan is
        // not populated in this database.
        $currentPlacementSql =
            'SELECT brh.id_barang FROM barang_ruangan_histories brh '
            . 'INNER JOIN (SELECT id_barang, MAX(id) AS max_id FROM barang_ruangan_histories GROUP BY id_barang) latest '
            . 'ON brh.id = latest.max_id '
            . 'WHERE brh.id_ruangan = ?';

        $assetCount = CachedRows::rememberScalar(
            RoomCache::key((int) $id, 'asset_count'),
            self::TTL_ASSET_COUNT,
            function () use ($id, $currentPlacementSql) {
                $siisyana = DB::connection('siisyana_ro')->select(
                    'SELECT COUNT(*) AS c FROM barangs_latest b '
                    . "WHERE b.dihapus = 0 AND b.id IN ({$currentPlacementSql})",
                    [(int) $id]
                );
                $hibah = DB::connection('gateway')->table('hibah_assets')
                    ->where('id_ruangan', (int) $id)
                    ->count();
                return (int) ($siisyana[0]->c ?? 0) + (int) $hibah;
            }
        );

        $kondisi = DB::connection('siisyana_ro')->select(
            'SELECT b.kondisi_terakhir FROM barangs_latest b '
            . "WHERE b.dihapus = 0 AND b.id IN ({$currentPlacementSql})",
            [(int) $id]
        );
        $codes = array_map(fn($x) => (int) $x->kondisi_terakhir, $kondisi);
        $kesiapan = RoomReadinessRule::derive($codes, ((int) ($row->is_renovasi ?? 0)) === 1);

        $visRow = DB::connection('gateway')->table('room_visibility')
            ->where('siisyana_room_id', (int) $id)
            ->value('is_public');
        $isPublic = $visRow === null ? true : (bool) $visRow;

        return JsonEnvelope::ok(
            RoomMapper::map($row, $kesiapan, $assetCount, $isPublic),
            meta: ['cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL_DETAIL], 'source' => 'siisyana'],
            links: [
                'self' => "/api/v1/rooms/{$id}",
                'assets' => "/api/v1/rooms/{$id}/assets",
            ]
        );
    }

}
