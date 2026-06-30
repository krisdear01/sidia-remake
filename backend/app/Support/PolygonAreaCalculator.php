<?php

namespace App\Support;

/**
 * Compute square-metre area of a GeoJSON polygon using the spherical-excess
 * formula on a WGS84 sphere. Accurate enough for building-scale footprints
 * (sub-percent error vs. proper geodesic computation at this scale).
 *
 * Supports:
 *   - Polygon                                  (outer ring + optional holes)
 *   - MultiPolygon                             (multiple Polygons summed)
 *   - Feature { geometry: Polygon|MultiPolygon }
 *   - FeatureCollection { features: [...] }    (areas summed)
 *
 * Coordinates are expected in GeoJSON order: [longitude, latitude] in degrees.
 */
class PolygonAreaCalculator
{
    /** WGS84 mean radius in metres. */
    private const EARTH_RADIUS_M = 6_378_137.0;

    /**
     * @return float|null  Square metres, or null if no parseable geometry.
     */
    public static function computeSquareMeters(?array $geojson): ?float
    {
        if (!is_array($geojson)) {
            return null;
        }
        $total = self::walk($geojson);
        return $total > 0 ? round($total, 2) : null;
    }

    /** Recursively walk a GeoJSON object and accumulate area. */
    private static function walk(array $node): float
    {
        $type = $node['type'] ?? null;
        if (!is_string($type)) {
            return 0.0;
        }

        switch ($type) {
            case 'FeatureCollection':
                $sum = 0.0;
                foreach (($node['features'] ?? []) as $feature) {
                    if (is_array($feature)) $sum += self::walk($feature);
                }
                return $sum;

            case 'Feature':
                $geom = $node['geometry'] ?? null;
                return is_array($geom) ? self::walk($geom) : 0.0;

            case 'Polygon':
                $coords = $node['coordinates'] ?? null;
                return is_array($coords) ? self::polygonArea($coords) : 0.0;

            case 'MultiPolygon':
                $polys = $node['coordinates'] ?? [];
                if (!is_array($polys)) return 0.0;
                $sum = 0.0;
                foreach ($polys as $poly) {
                    if (is_array($poly)) $sum += self::polygonArea($poly);
                }
                return $sum;

            case 'GeometryCollection':
                $sum = 0.0;
                foreach (($node['geometries'] ?? []) as $g) {
                    if (is_array($g)) $sum += self::walk($g);
                }
                return $sum;
        }
        return 0.0;
    }

    /**
     * A polygon = [outer ring, ...holes]. Holes subtract from the outer area.
     *
     * @param array<int, array<int, array<int, float>>> $rings
     */
    private static function polygonArea(array $rings): float
    {
        if (empty($rings) || !is_array($rings[0])) {
            return 0.0;
        }
        $outer = self::ringArea($rings[0]);
        $holes = 0.0;
        for ($i = 1; $i < count($rings); $i++) {
            if (is_array($rings[$i])) {
                $holes += self::ringArea($rings[$i]);
            }
        }
        return max(0.0, $outer - $holes);
    }

    /**
     * Area of a single closed ring. Auto-detects coordinate system:
     *   - |x| > 360 or |y| > 90  ⇒ assume projected (UTM-like) metres,
     *     use planar shoelace.
     *   - otherwise                ⇒ assume WGS84 lng/lat degrees,
     *     use spherical excess.
     *
     * @param array<int, array<int, float>> $ring
     */
    private static function ringArea(array $ring): float
    {
        $n = count($ring);
        if ($n < 4) {
            // Ring must be closed (first==last) and have >= 4 points for area.
            return 0.0;
        }

        return self::looksProjected($ring)
            ? self::ringAreaPlanar($ring)
            : self::ringAreaSpherical($ring);
    }

    /**
     * Spherical-excess area on a WGS84 sphere. Coordinates are
     * [longitude_deg, latitude_deg].
     *
     * @param array<int, array<int, float>> $ring
     */
    private static function ringAreaSpherical(array $ring): float
    {
        $n = count($ring);
        $sum = 0.0;
        for ($i = 0; $i < $n - 1; $i++) {
            $p1 = $ring[$i];
            $p2 = $ring[$i + 1];
            if (!is_array($p1) || !is_array($p2)) continue;
            if (!isset($p1[0], $p1[1], $p2[0], $p2[1])) continue;

            $lng1 = deg2rad((float) $p1[0]);
            $lat1 = deg2rad((float) $p1[1]);
            $lng2 = deg2rad((float) $p2[0]);
            $lat2 = deg2rad((float) $p2[1]);

            $sum += ($lng2 - $lng1) * (2.0 + sin($lat1) + sin($lat2));
        }
        return abs($sum * self::EARTH_RADIUS_M * self::EARTH_RADIUS_M / 2.0);
    }

    /**
     * Planar shoelace for already-projected coordinates (assumed to be in
     * metres, e.g. UTM). Result is the absolute Cartesian polygon area.
     *
     * @param array<int, array<int, float>> $ring
     */
    private static function ringAreaPlanar(array $ring): float
    {
        $n = count($ring);
        $sum = 0.0;
        for ($i = 0; $i < $n - 1; $i++) {
            $p1 = $ring[$i];
            $p2 = $ring[$i + 1];
            if (!is_array($p1) || !is_array($p2)) continue;
            if (!isset($p1[0], $p1[1], $p2[0], $p2[1])) continue;

            $sum += ((float) $p1[0]) * ((float) $p2[1])
                  - ((float) $p2[0]) * ((float) $p1[1]);
        }
        return abs($sum) / 2.0;
    }

    /** True if any coordinate falls outside the lat/lng degree range. */
    private static function looksProjected(array $ring): bool
    {
        foreach ($ring as $pt) {
            if (!is_array($pt) || !isset($pt[0], $pt[1])) continue;
            $x = (float) $pt[0];
            $y = (float) $pt[1];
            if (abs($x) > 360.0 || abs($y) > 90.0) {
                return true;
            }
        }
        return false;
    }
}
