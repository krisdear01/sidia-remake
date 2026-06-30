<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSiauProxyTest extends TestCase
{
    use RefreshDatabase;

    private const FAKE_ADMIN_TOKEN = 'gateway-admin-token-XYZ-do-not-leak';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.siau_gateway.url' => 'http://siau-gateway.test/api/v1',
            'services.siau_gateway.admin_token' => self::FAKE_ADMIN_TOKEN,
        ]);
    }

    private function actingAdmin(): User
    {
        $user = User::factory()->create([
            'name' => 'Admin SIAU',
            'email' => 'admin@siau.unud.ac.id',
            'password' => Hash::make('test-password'),
        ]);
        Sanctum::actingAs($user);
        return $user;
    }

    public function test_unauthenticated_request_returns_401_and_does_not_reach_gateway(): void
    {
        Http::fake();

        $this->getJson('/api/v1/admin/siau/identity-map/unmatched')->assertStatus(401);

        Http::assertSentCount(0);
    }

    public function test_authenticated_request_reaches_gateway_with_admin_token(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['rows' => []]], 200),
        ]);

        $this->actingAdmin();
        $this->getJson('/api/v1/admin/siau/identity-map/unmatched?limit=10')->assertOk();

        Http::assertSent(function (HttpRequest $req) {
            $this->assertSame('Bearer ' . self::FAKE_ADMIN_TOKEN, $req->header('Authorization')[0] ?? null);
            return true;
        });
    }

    public function test_spa_authorization_header_is_not_forwarded(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['rows' => []]], 200),
        ]);

        $this->actingAdmin();
        // Sanctum::actingAs handles auth; explicitly add a stray header to be safe.
        $this->withHeaders(['X-SPA-Stray' => 'spa-sanctum-token'])
            ->getJson('/api/v1/admin/siau/identity-map/unmatched');

        Http::assertSent(function (HttpRequest $req) {
            // The outbound Authorization must be the admin token, not the SPA's bearer.
            $authHeaders = $req->header('Authorization');
            $this->assertNotEmpty($authHeaders);
            $this->assertStringContainsString(self::FAKE_ADMIN_TOKEN, $authHeaders[0]);
            // And the stray header must NOT be forwarded.
            $this->assertEmpty($req->header('X-SPA-Stray'));
            return true;
        });
    }

    public function test_actor_email_is_forwarded_via_x_siau_actor(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['rows' => []]], 200),
        ]);

        $this->actingAdmin();
        $this->getJson('/api/v1/admin/siau/identity-map/unmatched');

        Http::assertSent(function (HttpRequest $req) {
            $actor = $req->header('X-SIAU-Actor')[0] ?? null;
            $this->assertSame('admin@siau.unud.ac.id', $actor);
            return true;
        });
    }

    public function test_validation_rejects_unknown_body_params_on_update(): void
    {
        Http::fake();
        $this->actingAdmin();

        $this->putJson('/api/v1/admin/siau/identity-map/42', [
            // missing required sipirang_room_id (validation rule 'present')
            'evil' => 'pwn',
        ])->assertStatus(422);

        Http::assertSentCount(0);
    }

    public function test_throttle_kicks_in_after_30_requests(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['rows' => []]], 200),
        ]);

        $this->actingAdmin();

        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/v1/admin/siau/identity-map/unmatched')->assertOk();
        }
        $this->getJson('/api/v1/admin/siau/identity-map/unmatched')->assertStatus(429);
    }

    public function test_admin_token_never_appears_in_response_body_or_headers(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(json_encode(['data' => ['rows' => []]]), 200, [
                // Even if the gateway accidentally echoed the token, we must scrub.
                'Authorization' => 'Bearer ' . self::FAKE_ADMIN_TOKEN,
            ]),
        ]);

        $this->actingAdmin();
        $response = $this->getJson('/api/v1/admin/siau/identity-map/unmatched');

        $this->assertStringNotContainsString(self::FAKE_ADMIN_TOKEN, $response->getContent());
        $this->assertNull($response->headers->get('Authorization'));
        foreach ($response->headers->all() as $values) {
            foreach ((array) $values as $v) {
                $this->assertStringNotContainsString(self::FAKE_ADMIN_TOKEN, (string) $v);
            }
        }
    }

    public function test_audit_row_written_with_success_outcome(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(['data' => ['rows' => []]], 200),
        ]);

        $user = $this->actingAdmin();
        $this->getJson('/api/v1/admin/siau/identity-map/unmatched?limit=10')->assertOk();

        $row = AdminAuditLog::where('user_id', $user->id)->latest('id')->first();
        $this->assertNotNull($row);
        $this->assertSame('siau.identity_map.unmatched', $row->action);
        $this->assertSame('success', $row->outcome);
        // Query params are strings off the wire.
        $this->assertSame(['limit' => '10'], $row->payload);
        $this->assertNull($row->error_code);
    }

    public function test_audit_row_records_failure_with_error_code_on_gateway_500(): void
    {
        Http::fake([
            'siau-gateway.test/*' => Http::response(
                json_encode(['code' => 'GATEWAY_BORKED', 'detail' => 'kaboom']),
                500,
                ['Content-Type' => 'application/problem+json']
            ),
        ]);

        $user = $this->actingAdmin();
        $this->postJson('/api/v1/admin/siau/identity-map/resync')->assertStatus(500);

        $row = AdminAuditLog::where('user_id', $user->id)->latest('id')->first();
        $this->assertSame('failed', $row->outcome);
        $this->assertSame('GATEWAY_BORKED', $row->error_code);
    }
}
