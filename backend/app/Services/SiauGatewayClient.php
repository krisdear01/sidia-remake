<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class SiauGatewayClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly int $timeout,
        private readonly ?string $adminToken = null
    ) {
    }

    public static function fromConfig(): self
    {
        $config = config('services.siau_gateway');

        return new self(
            baseUrl: rtrim($config['url'] ?? 'http://localhost:8765/api/v1', '/'),
            timeout: (int) ($config['timeout'] ?? 5),
            adminToken: $config['admin_token'] ?? null,
        );
    }

    /**
     * Forward a GET request to the gateway (public — no auth).
     *
     * @return array{status:int, headers:array<string,string>, body:string, content_type:string}
     */
    public function get(string $path, array $query = []): array
    {
        return $this->call('GET', $path, $query, null, false);
    }

    /**
     * Forward an admin GET, injecting the gateway admin token + actor header server-side.
     */
    public function adminGet(string $path, array $query = [], ?string $actorEmail = null): array
    {
        return $this->call('GET', $path, $query, null, true, $actorEmail);
    }

    /**
     * Forward an admin POST. Body is the JSON payload (may be empty).
     */
    public function adminPost(string $path, array $body = [], ?string $actorEmail = null): array
    {
        return $this->call('POST', $path, [], $body, true, $actorEmail);
    }

    /**
     * Forward an admin PUT.
     */
    public function adminPut(string $path, array $body = [], ?string $actorEmail = null): array
    {
        return $this->call('PUT', $path, [], $body, true, $actorEmail);
    }

    /**
     * Forward an admin DELETE.
     */
    public function adminDelete(string $path, ?string $actorEmail = null): array
    {
        return $this->call('DELETE', $path, [], null, true, $actorEmail);
    }

    /**
     * @return array{status:int, headers:array<string,string>, body:string, content_type:string}
     */
    private function call(
        string $method,
        string $path,
        array $query,
        ?array $body,
        bool $useAdminToken,
        ?string $actorEmail = null,
    ): array {
        $url = $this->baseUrl . '/' . ltrim($path, '/');

        $request = Http::acceptJson()
            ->timeout($this->timeout)
            ->withOptions(['http_errors' => false]);

        if ($useAdminToken) {
            if (empty($this->adminToken)) {
                // Fail closed — do not silently send unauthenticated.
                return $this->syntheticProblem(
                    503,
                    'SIAU_ADMIN_TOKEN_MISSING',
                    'Admin token not configured on backend.',
                    $path
                );
            }
            $request = $request->withToken($this->adminToken);
            if ($actorEmail) {
                // Forwarded actor identity for gateway audit log. Stripped to
                // local-part + domain only; no other PII.
                $request = $request->withHeaders(['X-SIAU-Actor' => $actorEmail]);
            }
        }

        try {
            $response = match (strtoupper($method)) {
                'GET'    => $request->get($url, $query),
                'POST'   => $request->post($url, $body ?? []),
                'PUT'    => $request->put($url, $body ?? []),
                'DELETE' => $request->delete($url),
                default => throw new \InvalidArgumentException("Unsupported method: $method"),
            };
        } catch (ConnectionException) {
            return $this->syntheticProblem(503, 'SIAU_GATEWAY_UNREACHABLE', 'The SIAU gateway is not reachable.', $path);
        }

        $headers = [];
        foreach ($response->headers() as $name => $values) {
            // Never echo Authorization back even if the gateway accidentally
            // included it (it shouldn't).
            if (strcasecmp($name, 'Authorization') === 0) {
                continue;
            }
            $headers[$name] = is_array($values) ? implode(', ', $values) : (string) $values;
        }

        return [
            'status' => $response->status(),
            'headers' => $headers,
            'body' => $response->body(),
            'content_type' => $response->header('Content-Type') ?: 'application/json',
        ];
    }

    /**
     * @return array{status:int, headers:array<string,string>, body:string, content_type:string}
     */
    private function syntheticProblem(int $status, string $code, string $detail, string $path): array
    {
        $body = json_encode([
            'type' => 'https://siau.unud.ac.id/errors/' . strtolower(str_replace('_', '-', $code)),
            'title' => 'Service Unavailable',
            'status' => $status,
            'code' => $code,
            'detail' => $detail,
            'instance' => '/' . ltrim($path, '/'),
        ], JSON_UNESCAPED_SLASHES);

        return [
            'status' => $status,
            'headers' => [],
            'body' => $body,
            'content_type' => 'application/problem+json',
        ];
    }
}
