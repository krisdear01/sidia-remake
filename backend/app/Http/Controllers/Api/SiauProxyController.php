<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SiauGatewayClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class SiauProxyController extends Controller
{
    /** Headers worth forwarding from the gateway back to the SPA. */
    private const FORWARD_HEADERS = [
        'Content-Type',
        'Cache-Control',
        'Retry-After',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
    ];

    public function __construct(private readonly SiauGatewayClient $client)
    {
    }

    public function health(): Response
    {
        return $this->proxy('/health', [], cacheable: false);
    }

    public function buildings(Request $request): Response
    {
        $query = $request->validate([
            'cursor' => 'sometimes|integer|min:0',
            'limit' => 'sometimes|integer|between:1,200',
        ]);

        return $this->proxy('/buildings', $query);
    }

    public function building(string $id): Response
    {
        return $this->proxy("/buildings/{$id}", []);
    }

    public function gedungPolygons(): Response
    {
        return $this->proxy('/gedung-polygons', []);
    }

    public function land(Request $request): Response
    {
        $query = $request->validate([
            'cursor' => 'sometimes|integer|min:0',
            'limit' => 'sometimes|integer|between:1,200',
        ]);

        return $this->proxy('/land', $query);
    }

    public function landDetail(string $id): Response
    {
        return $this->proxy("/land/{$id}", []);
    }

    public function rooms(Request $request): Response
    {
        $query = $request->validate([
            'cursor' => 'sometimes|integer|min:0',
            'limit' => 'sometimes|integer|between:1,200',
            'id_gedung' => 'sometimes|integer',
            'id_unit' => 'sometimes|integer',
        ]);

        return $this->proxy('/rooms', $query);
    }

    public function room(string $id): Response
    {
        return $this->proxy("/rooms/{$id}", []);
    }

    public function roomAssets(Request $request, string $id): Response
    {
        $query = $request->validate([
            'cursor' => 'sometimes|integer|min:0',
            'limit' => 'sometimes|integer|between:1,200',
        ]);

        return $this->proxy("/rooms/{$id}/assets", $query);
    }

    public function schedule(Request $request, string $id): Response
    {
        $query = $request->validate([
            'from' => 'required|date_format:Y-m-d',
            'to' => 'required|date_format:Y-m-d',
        ]);

        return $this->proxy("/rooms/{$id}/schedule", $query);
    }

    public function availability(Request $request, string $id): Response
    {
        $query = $request->validate([
            'at' => 'sometimes|date',
        ]);

        // Real-time — never cache.
        return $this->proxy("/rooms/{$id}/availability", $query, cacheable: false);
    }

    private function proxy(string $path, array $query, bool $cacheable = true): Response
    {
        $ttl = (int) (config('services.siau_gateway.cache_ttl') ?? 30);

        if ($cacheable && $ttl > 0) {
            $cacheKey = 'siau:' . $path . ':' . md5(json_encode($query));
            $result = Cache::remember(
                $cacheKey,
                $ttl,
                fn () => $this->client->get($path, $query)
            );
        } else {
            $result = $this->client->get($path, $query);
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
}
