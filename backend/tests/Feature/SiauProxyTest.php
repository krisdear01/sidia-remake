<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SiauProxyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config(['services.siau_gateway.url' => 'http://siau-gateway.test/api/v1']);
        config(['services.siau_gateway.cache_ttl' => 30]);
    }

    public function test_forwards_only_allow_listed_query_params(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => [], 'meta' => ['pagination' => ['limit' => 10, 'next_cursor' => null]]], 200),
        ]);

        $this->getJson('/api/v1/siau/rooms?limit=10&id_unit=21&evil=DROP_TABLE&id_gedung=4');

        Http::assertSent(function (HttpRequest $req) {
            parse_str(parse_url($req->url(), PHP_URL_QUERY) ?? '', $q);
            $this->assertSame('10', (string) ($q['limit'] ?? ''));
            $this->assertSame('21', (string) ($q['id_unit'] ?? ''));
            $this->assertSame('4', (string) ($q['id_gedung'] ?? ''));
            $this->assertArrayNotHasKey('evil', $q);

            return true;
        });
    }

    public function test_strips_inbound_authorization_header(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => []], 200),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer leaked-token'])
            ->getJson('/api/v1/siau/buildings');

        Http::assertSent(function (HttpRequest $req) {
            $this->assertEmpty($req->header('Authorization'));

            return true;
        });
    }

    public function test_passes_through_problem_json_status_and_body(): void
    {
        $problem = [
            'type' => 'https://siau.unud.ac.id/errors/not-found',
            'title' => 'Not Found',
            'status' => 404,
            'code' => 'BUILDING_NOT_FOUND',
            'detail' => 'No such building',
            'instance' => '/api/v1/buildings/999',
        ];

        // Pass body as JSON string — Http::response auto-sets Content-Type=application/json when body is array.
        Http::fake([
            'siau-gateway.test/*' => Http::response(json_encode($problem), 404, ['Content-Type' => 'application/problem+json']),
        ]);

        $response = $this->getJson('/api/v1/siau/buildings/999');

        $response->assertStatus(404);
        $this->assertSame('application/problem+json', $response->headers->get('Content-Type'));
        $this->assertSame('BUILDING_NOT_FOUND', $response->json('code'));
    }

    public function test_connection_failure_returns_synthetic_503(): void
    {
        Http::fake(function () {
            throw new \Illuminate\Http\Client\ConnectionException('boom');
        });

        $response = $this->getJson('/api/v1/siau/health');

        $response->assertStatus(503);
        $this->assertSame('application/problem+json', $response->headers->get('Content-Type'));
        $this->assertSame('SIAU_GATEWAY_UNREACHABLE', $response->json('code'));
    }

    public function test_cache_short_circuits_repeat_hit(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => [], 'meta' => ['pagination' => ['limit' => 50, 'next_cursor' => null]]], 200),
        ]);

        $this->getJson('/api/v1/siau/buildings')->assertOk();
        $this->getJson('/api/v1/siau/buildings')->assertOk();

        // Only the first call should reach the gateway.
        Http::assertSentCount(1);
    }

    public function test_availability_is_not_cached(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['available' => true, 'next_free_slot' => null, 'next_busy_slot' => null]], 200),
        ]);

        $this->getJson('/api/v1/siau/rooms/123/availability')->assertOk();
        $this->getJson('/api/v1/siau/rooms/123/availability')->assertOk();

        Http::assertSentCount(2);
    }

    public function test_rejects_non_get_methods(): void
    {
        $this->postJson('/api/v1/siau/buildings', [])->assertStatus(405);
    }
}
