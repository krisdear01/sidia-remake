<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminAuditor;
use App\Services\SiauGatewayClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Sanctum-gated proxy to the SIAU gateway's /api/v1/admin/identity-map/*
 * endpoints. Injects the gateway admin token server-side; the SPA never
 * sees it. Every action is double-audited: a row in SIDIA's admin_audit_log
 * plus a row in the gateway's own admin_audit_log (via X-SIAU-Actor).
 */
class AdminSiauProxyController extends Controller
{
    /** Response headers worth forwarding from the gateway back to the SPA. */
    private const FORWARD_HEADERS = [
        'Content-Type',
        'Cache-Control',
        'Retry-After',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
    ];

    public function __construct(
        private readonly SiauGatewayClient $client,
        private readonly AdminAuditor $auditor
    ) {
    }

    public function unmatched(Request $request): Response
    {
        $query = $request->validate([
            'limit' => 'sometimes|integer|between:1,1000',
        ]);

        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.identity_map.unmatched',
            null,
            $query,
            $request->ip()
        );

        $result = $this->client->adminGet(
            '/admin/identity-map/unmatched',
            $query,
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function resync(Request $request): Response
    {
        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.identity_map.resync',
            null,
            [],
            $request->ip()
        );

        $result = $this->client->adminPost(
            '/admin/identity-map/resync',
            [],
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function updateMapping(Request $request, string $siisyanaId): Response
    {
        $body = $request->validate([
            'sipirang_room_id' => 'present|nullable|integer|min:1',
            'note' => 'sometimes|nullable|string|max:500',
        ]);

        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.identity_map.update',
            $siisyanaId,
            $body,
            $request->ip()
        );

        $result = $this->client->adminPut(
            "/admin/identity-map/{$siisyanaId}",
            $body,
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function createHibahAsset(Request $request): Response
    {
        $body = $request->validate([
            'id_ruangan' => 'required|integer|min:1',
            'nama_barang' => 'required|string|max:255',
            'merk_type' => 'sometimes|nullable|string|max:255',
            'kondisi' => 'sometimes|nullable|in:Baik,Rusak Ringan,Rusak Berat',
            'kuantitas' => 'sometimes|nullable|numeric|min:0',
            'tanggal_perolehan' => 'sometimes|nullable|date_format:Y-m-d',
        ]);

        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.hibah_asset.create',
            (string) $body['id_ruangan'],
            $body,
            $request->ip()
        );

        $result = $this->client->adminPost(
            '/admin/hibah-assets',
            $body,
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function roomDbr(Request $request, string $id): Response
    {
        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.room.dbr.export',
            $id,
            [],
            $request->ip()
        );

        $result = $this->client->adminGet(
            "/admin/rooms/{$id}/dbr",
            [],
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function updateRoomVisibility(Request $request, string $id): Response
    {
        $body = $request->validate([
            'is_public' => 'required|boolean',
        ]);

        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.room.visibility.update',
            $id,
            $body,
            $request->ip()
        );

        $result = $this->client->adminPut(
            "/admin/rooms/{$id}/visibility",
            $body,
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    public function deleteHibahAsset(Request $request, string $id): Response
    {
        $auditId = $this->auditor->start(
            $request->user()->id,
            'siau.hibah_asset.delete',
            $id,
            [],
            $request->ip()
        );

        $result = $this->client->adminDelete(
            "/admin/hibah-assets/{$id}",
            $request->user()->email
        );

        return $this->finishAndRespond($result, $auditId);
    }

    private function finishAndRespond(array $result, int $auditId): Response
    {
        if ($result['status'] >= 200 && $result['status'] < 300) {
            $this->auditor->succeed($auditId);
        } else {
            $errorCode = $this->extractErrorCode($result);
            $this->auditor->fail($auditId, $errorCode);
        }

        $response = response($result['body'], $result['status'])
            ->header('Content-Type', $result['content_type']);

        foreach (self::FORWARD_HEADERS as $name) {
            if ($name === 'Content-Type') {
                continue;
            }
            $value = $result['headers'][$name] ?? $result['headers'][strtolower($name)] ?? null;
            if ($value !== null && $value !== '') {
                $response->header($name, $value);
            }
        }

        return $response;
    }

    private function extractErrorCode(array $result): string
    {
        $decoded = json_decode($result['body'], true);
        if (is_array($decoded) && isset($decoded['code']) && is_string($decoded['code'])) {
            return $decoded['code'];
        }
        return 'HTTP_' . $result['status'];
    }
}
