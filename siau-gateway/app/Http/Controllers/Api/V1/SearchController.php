<?php

namespace App\Http\Controllers\Api\V1;

use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Unified global search across SIISYANA: gedung / ruangan / tanah / aset.
 * Read-only, column-whitelisted, per-category LIMIT, short cache. The
 * barangs_latest scan (~124k rows) stays server-side and capped.
 */
class SearchController extends Controller
{
    private const TTL = 60;
    private const MIN_CHARS = 2;
    private const DEFAULT_LIMIT = 8;
    private const MAX_LIMIT = 20;

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', self::DEFAULT_LIMIT), 1), self::MAX_LIMIT);

        $empty = ['gedung' => [], 'ruangan' => [], 'tanah' => [], 'aset' => []];

        // Below the minimum: never hit the DB.
        if (mb_strlen($q) < self::MIN_CHARS) {
            return JsonEnvelope::ok($empty, meta: ['q' => $q, 'counts' => array_map('count', $empty)], links: ['self' => '/api/v1/search']);
        }

        $like = '%' . $q . '%';
        $key = 'siau:v1:search:' . md5($q) . ':l' . $limit;

        $data = Cache::remember($key, self::TTL, function () use ($like, $limit) {
            $ro = DB::connection('siisyana_ro');

            $gedung = $ro->select(
                'SELECT id, kode_gedung, nama, nomor_kib FROM tb_m_gedung '
                . 'WHERE is_deleted = 0 AND (nama LIKE ? OR kode_gedung LIKE ? OR nomor_kib LIKE ?) '
                . 'ORDER BY nama LIMIT ?',
                [$like, $like, $like, $limit]
            );

            $ruangan = $ro->select(
                'SELECT r.id, r.kode_ruangan, r.nama, r.id_gedung, g.nama AS g_nama '
                . 'FROM tb_m_ruangan r '
                . 'LEFT JOIN tb_m_gedung g ON g.id = r.id_gedung AND g.is_deleted = 0 '
                . 'WHERE r.is_deleted = 0 AND (r.nama LIKE ? OR r.kode_ruangan LIKE ?) '
                . 'ORDER BY r.nama LIMIT ?',
                [$like, $like, $limit]
            );

            $tanah = $ro->select(
                'SELECT id, nomor_shp, nomor_kib, lokasi FROM tanahs '
                . 'WHERE deleted_at IS NULL AND (nomor_shp LIKE ? OR nomor_kib LIKE ? OR lokasi LIKE ?) '
                . 'ORDER BY nomor_shp LIMIT ?',
                [$like, $like, $like, $limit]
            );

            // barangs_latest.id_ruangan is always null; an asset's current room
            // lives in barang_ruangan_histories (latest row). Join to the latest
            // history whose room still exists (is_deleted = 0) so every returned
            // asset is openable — assets stuck only in deleted rooms are excluded.
            $aset = $ro->select(
                'SELECT b.id, b.kode_barang, b.nama_barang, b.merk_type, brh.id_ruangan '
                . 'FROM barangs_latest b '
                . 'INNER JOIN barang_ruangan_histories brh ON brh.id_barang = b.id '
                . 'INNER JOIN tb_m_ruangan r ON r.id = brh.id_ruangan AND r.is_deleted = 0 '
                . 'INNER JOIN (SELECT h.id_barang, MAX(h.id) AS mx FROM barang_ruangan_histories h '
                . '  INNER JOIN tb_m_ruangan r2 ON r2.id = h.id_ruangan AND r2.is_deleted = 0 '
                . '  GROUP BY h.id_barang) l ON l.mx = brh.id '
                . 'WHERE b.dihapus = 0 AND (b.nama_barang LIKE ? OR b.kode_barang LIKE ? OR b.merk_type LIKE ?) '
                . 'LIMIT ?',
                [$like, $like, $like, $limit]
            );

            return [
                'gedung' => array_map(fn ($r) => [
                    'id' => (string) $r->id,
                    'kode' => $r->kode_gedung,
                    'nama' => $r->nama,
                    'nomor_kib' => $r->nomor_kib,
                ], $gedung),
                'ruangan' => array_map(fn ($r) => [
                    'id' => (string) $r->id,
                    'kode_ruangan' => $r->kode_ruangan,
                    'nama' => $r->nama,
                    'id_gedung' => isset($r->id_gedung) ? (string) $r->id_gedung : null,
                    'gedung_nama' => $r->g_nama ?? null,
                ], $ruangan),
                'tanah' => array_map(fn ($r) => [
                    'id' => (string) $r->id,
                    'nomor_shp' => $r->nomor_shp,
                    'nomor_kib' => $r->nomor_kib,
                    'lokasi' => $r->lokasi,
                ], $tanah),
                'aset' => array_map(fn ($r) => [
                    'id' => (string) $r->id,
                    'kode_barang' => $r->kode_barang,
                    'nama_barang' => $r->nama_barang,
                    'merk_type' => $r->merk_type,
                    'id_ruangan' => isset($r->id_ruangan) ? (string) $r->id_ruangan : null,
                ], $aset),
            ];
        });

        return JsonEnvelope::ok(
            $data,
            meta: ['q' => $q, 'counts' => array_map('count', $data), 'source' => 'siisyana'],
            links: ['self' => '/api/v1/search']
        );
    }
}
