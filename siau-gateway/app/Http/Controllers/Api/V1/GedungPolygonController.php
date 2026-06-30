<?php

namespace App\Http\Controllers\Api\V1;

use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Building footprint polygons for the public /gedung map.
 *
 * Geometry lives in SIISYANA `denah_asets.geojson` (each row is itself a
 * GeoJSON FeatureCollection) and links to `tb_m_gedung` via
 * `tb_m_gedung.id_denah_aset`. We merge each denah's polygon rings into one
 * MultiPolygon Feature carrying the building identity so the FE can open the
 * existing building detail (KIB / rooms / gallery / PDF) on click.
 */
class GedungPolygonController extends Controller
{
    private const TTL = 60 * 60 * 24; // 24h master data

    public function index(Request $request): JsonResponse
    {
        $features = Cache::remember('siau:v1:gedung-polygons', self::TTL, function () {
            $rows = DB::connection('siisyana_ro')->select(
                'SELECT g.id AS gid, g.kode_gedung, g.nama, g.luas_gedung, '
                . 'd.geojson, d.center '
                . 'FROM tb_m_gedung g '
                . 'JOIN denah_asets d ON d.id = g.id_denah_aset '
                . 'WHERE g.is_deleted = 0 AND d.deleted_at IS NULL AND d.geojson IS NOT NULL'
            );

            $out = [];
            foreach ($rows as $row) {
                $geometry = self::mergeGeometry($row->geojson);
                if ($geometry === null) {
                    continue;
                }
                $out[] = [
                    'type' => 'Feature',
                    'geometry' => $geometry,
                    'properties' => [
                        'asset_type' => 'bangunan',
                        'siisyana_gedung_id' => (int) $row->gid,
                        'kode' => $row->kode_gedung,
                        'nama' => $row->nama,
                        'luas' => isset($row->luas_gedung) ? (float) $row->luas_gedung : null,
                        'center' => self::parseCenter($row->center),
                    ],
                ];
            }
            return $out;
        });

        return JsonEnvelope::ok(
            ['type' => 'FeatureCollection', 'features' => $features],
            meta: ['count' => count($features), 'ttl_seconds' => self::TTL, 'source' => 'siisyana'],
            links: ['self' => '/api/v1/gedung-polygons']
        );
    }

    /** Merge every Polygon/MultiPolygon in a denah FeatureCollection into one MultiPolygon. */
    private static function mergeGeometry(string $raw): ?array
    {
        $fc = json_decode($raw, true);
        if (!is_array($fc)) {
            return null;
        }
        $features = $fc['features'] ?? (isset($fc['geometry']) ? [$fc] : []);
        $polys = [];
        foreach ($features as $f) {
            $geom = $f['geometry'] ?? null;
            if (!is_array($geom) || !isset($geom['type'], $geom['coordinates'])) {
                continue;
            }
            if ($geom['type'] === 'Polygon') {
                $polys[] = $geom['coordinates'];
            } elseif ($geom['type'] === 'MultiPolygon') {
                foreach ($geom['coordinates'] as $p) {
                    $polys[] = $p;
                }
            }
        }
        if (empty($polys)) {
            return null;
        }
        return ['type' => 'MultiPolygon', 'coordinates' => $polys];
    }

    /** SIISYANA stores center as "lng,lat"; expose [lat, lng] for Leaflet. */
    private static function parseCenter(?string $center): ?array
    {
        if (!$center) {
            return null;
        }
        $parts = array_map('trim', explode(',', $center));
        if (count($parts) !== 2 || !is_numeric($parts[0]) || !is_numeric($parts[1])) {
            return null;
        }
        return [(float) $parts[1], (float) $parts[0]];
    }
}
