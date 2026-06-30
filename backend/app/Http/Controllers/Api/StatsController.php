<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Polygon;
use App\Services\SiauGatewayClient;

/**
 * Dashboard stats — combines SIISYANA + SIPIRANG aggregates (via gateway)
 * with SIDIA's own polygon land_area (admin-entered).
 *
 * Replaces the previous Eloquent-on-SQLite implementation which showed
 * seeded demo numbers.
 */
class StatsController extends Controller
{
    public function __construct(private readonly SiauGatewayClient $client)
    {
    }

    public function index()
    {
        $gw = $this->client->get('/stats');

        $gwBody = json_decode($gw['body'], true);
        $gwOk = $gw['status'] >= 200 && $gw['status'] < 300 && is_array($gwBody) && isset($gwBody['data']);

        // Local: total land area = sum of Polygon.land_area entered by the
        // admin via Peta & Polygon. Not from SIISYANA — that DB has no
        // luas_tanah column.
        $totalLandArea = (float) Polygon::where('is_active', true)->sum('land_area');
        $polygonsCount = (int) Polygon::where('is_active', true)->count();

        if (!$gwOk) {
            // Gateway unreachable / errored — still return polygon-derived
            // fields so the UI degrades gracefully.
            return response()->json([
                'ok' => false,
                'error' => 'SIAU gateway is unreachable.',
                'land' => [
                    'total_land_area_sqm' => $totalLandArea,
                    'polygons_count' => $polygonsCount,
                    'source' => 'sidia-polygons',
                ],
            ], 503);
        }

        $data = $gwBody['data'];
        $meta = $gwBody['meta'] ?? [];

        return response()->json([
            'ok' => true,
            'buildings' => $data['buildings'],   // total, total_area_sqm
            'rooms' => $data['rooms'],           // total, siap, renovasi, tervalidasi, pending_validasi
            'assets' => $data['assets'],         // total, total_siisyana, total_hibah, by_kondisi
            'schedules' => $data['schedules'],   // today
            'land' => [
                'total_land_area_sqm' => $totalLandArea,
                'polygons_count' => $polygonsCount,
                'source' => 'sidia-polygons',
            ],
            'sources_meta' => [
                'gateway_computed_at' => $meta['computed_at'] ?? null,
                'gateway_cache_hit' => $meta['cache']['hit'] ?? null,
                'gateway_ttl_seconds' => $meta['cache']['ttl_seconds'] ?? null,
            ],
        ]);
    }
}
