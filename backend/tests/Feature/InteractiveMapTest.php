<?php

namespace Tests\Feature;

use App\Models\Polygon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InteractiveMapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config(['services.siau_gateway.url' => 'http://siau-gateway.test/api/v1']);
        config(['services.siau_gateway.cache_ttl' => 0]);
    }

    public function test_polygon_geojson_emits_siisyana_linkage(): void
    {
        Polygon::create([
            'name' => 'Gedung HG',
            'asset_type' => 'bangunan',
            'siisyana_gedung_id' => 88,
            'geojson' => [
                'type' => 'Polygon',
                'coordinates' => [[[115.17, -8.79], [115.18, -8.79], [115.18, -8.80], [115.17, -8.79]]],
            ],
            'is_active' => true,
        ]);

        $res = $this->getJson('/api/v1/polygons/geojson');

        $res->assertOk();
        $props = $res->json('features.0.properties');
        $this->assertSame('bangunan', $props['asset_type']);
        $this->assertSame(88, $props['siisyana_gedung_id']);
        $this->assertNull($props['siisyana_tanah_id']);
    }

    public function test_land_proxy_forwards_to_gateway(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response([
                'data' => [
                    'id' => '6', 'jenis' => 'Tanah', 'bukti_kepemilikan' => 'SHP 16',
                    'nomor_kib' => '2010104002.8', 'luas_total' => 8000, 'luas_tidak_terpakai' => 2000,
                ],
                'meta' => ['source' => 'siisyana'],
            ], 200),
        ]);

        $res = $this->getJson('/api/v1/siau/land/6');

        $res->assertOk();
        $res->assertJsonPath('data.bukti_kepemilikan', 'SHP 16');
        Http::assertSent(fn (HttpRequest $req) => str_contains($req->url(), '/land/6'));
    }

    public function test_gedung_polygons_proxy_forwards_to_gateway(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response([
                'data' => [
                    'type' => 'FeatureCollection',
                    'features' => [[
                        'type' => 'Feature',
                        'geometry' => ['type' => 'MultiPolygon', 'coordinates' => []],
                        'properties' => ['asset_type' => 'bangunan', 'siisyana_gedung_id' => 88, 'kode' => 'HG'],
                    ]],
                ],
                'meta' => ['count' => 1, 'source' => 'siisyana'],
            ], 200),
        ]);

        $res = $this->getJson('/api/v1/siau/gedung-polygons');

        $res->assertOk();
        $res->assertJsonPath('data.features.0.properties.siisyana_gedung_id', 88);
        Http::assertSent(fn (HttpRequest $req) => str_contains($req->url(), '/gedung-polygons'));
    }

    public function test_search_proxy_forwards_query(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response([
                'data' => [
                    'gedung' => [['id' => '1', 'kode' => 'FN', 'nama' => 'USDI - Gedung FN', 'nomor_kib' => null]],
                    'ruangan' => [], 'tanah' => [], 'aset' => [],
                ],
                'meta' => ['q' => 'USDI', 'counts' => ['gedung' => 1]],
            ], 200),
        ]);

        $res = $this->getJson('/api/v1/siau/search?q=USDI&limit=5');

        $res->assertOk();
        $res->assertJsonPath('data.gedung.0.nama', 'USDI - Gedung FN');
        Http::assertSent(function (HttpRequest $req) {
            parse_str(parse_url($req->url(), PHP_URL_QUERY) ?? '', $q);
            return str_contains($req->url(), '/search') && ($q['q'] ?? '') === 'USDI';
        });
    }

    public function test_search_proxy_rejects_missing_query(): void
    {
        $this->getJson('/api/v1/siau/search')->assertStatus(422);
    }
}
