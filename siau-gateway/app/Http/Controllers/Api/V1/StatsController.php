<?php

namespace App\Http\Controllers\Api\V1;

use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Aggregate dashboard statistics across SIISYANA + SIPIRANG + gateway-local
 * (hibah). All COUNTs / SUMs are computed against read-only upstream
 * connections except hibah, which lives on the writable `gateway` DB.
 *
 * Cached for 1h via the public `siau.cache` middleware AND a one-hour
 * Cache::remember inside the controller so a CDN miss still doesn't
 * re-execute the SQL on every request.
 */
class StatsController extends Controller
{
    private const TTL = 3600; // 1 hour
    private const CACHE_KEY = 'siau:v1:stats:aggregate';

    public function index(Request $request): JsonResponse
    {
        $cached = Cache::has(self::CACHE_KEY);
        $payload = Cache::remember(self::CACHE_KEY, self::TTL, fn () => $this->compute());

        return JsonEnvelope::ok(
            $payload['data'],
            meta: [
                'cache' => ['hit' => $cached, 'ttl_seconds' => self::TTL],
                'computed_at' => $payload['computed_at'],
                'sources' => ['siisyana', 'sipirang', 'gateway'],
            ],
            links: ['self' => '/api/v1/stats']
        );
    }

    /**
     * @return array{data: array<string,mixed>, computed_at: string}
     */
    private function compute(): array
    {
        // ----- Buildings (SIISYANA) ---------------------------------------
        $bRow = DB::connection('siisyana_ro')->select(
            'SELECT COUNT(*) AS c, COALESCE(SUM(luas_gedung), 0) AS area '
            . 'FROM tb_m_gedung WHERE is_deleted = 0'
        );
        $buildings = [
            'total' => (int) ($bRow[0]->c ?? 0),
            'total_area_sqm' => (float) ($bRow[0]->area ?? 0),
        ];

        // ----- Rooms (SIISYANA) -------------------------------------------
        $rRow = DB::connection('siisyana_ro')->select(
            'SELECT COUNT(*) AS total, '
            . 'SUM(CASE WHEN is_renovasi = 1 THEN 1 ELSE 0 END) AS renovasi, '
            . 'SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) AS valid '
            . 'FROM tb_m_ruangan WHERE is_deleted = 0'
        );
        $totalRooms = (int) ($rRow[0]->total ?? 0);
        $renovasi = (int) ($rRow[0]->renovasi ?? 0);
        $valid = (int) ($rRow[0]->valid ?? 0);
        $rooms = [
            'total' => $totalRooms,
            'siap' => max(0, $totalRooms - $renovasi),
            'renovasi' => $renovasi,
            'tervalidasi' => $valid,
            'pending_validasi' => max(0, $totalRooms - $valid),
        ];

        // ----- Assets (SIISYANA + hibah) ----------------------------------
        // We rely on the same placement logic the per-room queries use so
        // numbers stay consistent: only barangs_latest currently placed in
        // a room AND not soft-deleted.
        $aPlacementSql = 'SELECT b.id, b.kondisi_terakhir FROM barangs_latest b '
            . 'INNER JOIN ('
            . '  SELECT brh.id_barang FROM barang_ruangan_histories brh '
            . '  INNER JOIN (SELECT id_barang, MAX(id) AS max_id FROM barang_ruangan_histories GROUP BY id_barang) latest '
            . '  ON brh.id = latest.max_id WHERE brh.id_ruangan IS NOT NULL'
            . ') placed ON placed.id_barang = b.id '
            . 'WHERE b.dihapus = 0';

        $kondisiRows = DB::connection('siisyana_ro')->select(
            "SELECT kondisi_terakhir, COUNT(*) AS c FROM ({$aPlacementSql}) sub "
            . 'GROUP BY kondisi_terakhir'
        );
        $kondisiCounts = ['baik' => 0, 'rusak_ringan' => 0, 'rusak_berat' => 0, 'unknown' => 0];
        $siisyanaAssetTotal = 0;
        foreach ($kondisiRows as $kr) {
            $c = (int) $kr->c;
            $siisyanaAssetTotal += $c;
            switch ((int) ($kr->kondisi_terakhir ?? 0)) {
                case 1: $kondisiCounts['baik'] = $c; break;
                case 2: $kondisiCounts['rusak_ringan'] = $c; break;
                case 3: $kondisiCounts['rusak_berat'] = $c; break;
                default: $kondisiCounts['unknown'] += $c;
            }
        }

        $hibahTotal = (int) DB::connection('gateway')->table('hibah_assets')->count();
        $hibahByKondisi = DB::connection('gateway')->table('hibah_assets')
            ->selectRaw('kondisi, COUNT(*) AS c')->groupBy('kondisi')->get();
        foreach ($hibahByKondisi as $hk) {
            switch ($hk->kondisi) {
                case 'Baik': $kondisiCounts['baik'] += (int) $hk->c; break;
                case 'Rusak Ringan': $kondisiCounts['rusak_ringan'] += (int) $hk->c; break;
                case 'Rusak Berat': $kondisiCounts['rusak_berat'] += (int) $hk->c; break;
                default: $kondisiCounts['unknown'] += (int) $hk->c;
            }
        }

        $assets = [
            'total' => $siisyanaAssetTotal + $hibahTotal,
            'total_siisyana' => $siisyanaAssetTotal,
            'total_hibah' => $hibahTotal,
            'by_kondisi' => $kondisiCounts,
        ];

        // ----- Today's schedules (SIPIRANG) -------------------------------
        // Bookings whose [tgl_awal_pinjam, tgl_akhir_pinjam] overlap today.
        $tz = new \DateTimeZone('Asia/Makassar');
        $today = (new \DateTimeImmutable('today', $tz))->format('Y-m-d');
        $sRow = DB::connection('sipirang_ro')->select(
            'SELECT COUNT(*) AS c FROM tb_transaksi_pinjam '
            . 'WHERE DATE(tgl_awal_pinjam) <= ? AND DATE(tgl_akhir_pinjam) >= ?',
            [$today, $today]
        );
        $schedules = [
            'today' => (int) ($sRow[0]->c ?? 0),
        ];

        return [
            'data' => [
                'buildings' => $buildings,
                'rooms' => $rooms,
                'assets' => $assets,
                'schedules' => $schedules,
            ],
            'computed_at' => (new \DateTimeImmutable('now', $tz))->format(\DateTimeInterface::ATOM),
        ];
    }
}
