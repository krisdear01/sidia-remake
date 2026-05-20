<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Lightweight load harness that pre-warms the cache and then hammers the
 * endpoint to measure how much of the burst the gateway's own cache absorbs.
 *
 * Designed for safety:
 *  - Warms by hitting once and waiting for response.
 *  - All subsequent requests serve from the gateway's cache (Redis/file/
 *    DB depending on env). The live source DB sees, at most, ONE query per
 *    cache key per cache window — not N queries.
 *  - Validates that the per-IP rate limiter kicks in (PRD §9.3).
 */
class LoadTest extends Command
{
    protected $signature = 'siau:loadtest
                            {--url= : Endpoint URL (default: localhost:8765 /v1/buildings)}
                            {--requests=200 : Total requests}';

    protected $description = 'Cache-first load harness. Pre-warms then hits the endpoint N times, measuring latency + rate limiting.';

    public function handle(): int
    {
        $url = (string) ($this->option('url') ?: 'http://127.0.0.1:8765/api/v1/buildings?limit=10');
        $n = max(1, (int) $this->option('requests'));

        $this->info("Warming cache: GET {$url}");
        $warm = $this->time(fn() => Http::timeout(10)->get($url));
        $this->line(sprintf('  warm-up status=%d latency=%.1fms', $warm['status'], $warm['ms']));
        if ($warm['status'] !== 200) {
            $this->error('Warm-up did not return 200; aborting.');
            return self::FAILURE;
        }

        $this->info("Hammering: {$n} sequential requests");
        $latencies = [];
        $status = [];
        $rateLimitedAt = null;
        for ($i = 1; $i <= $n; $i++) {
            $r = $this->time(fn() => Http::timeout(10)->get($url));
            $latencies[] = $r['ms'];
            $status[$r['status']] = ($status[$r['status']] ?? 0) + 1;
            if ($rateLimitedAt === null && $r['status'] === 429) {
                $rateLimitedAt = $i;
            }
        }

        sort($latencies);
        $p50 = $latencies[(int) (0.5 * $n)] ?? null;
        $p95 = $latencies[(int) (0.95 * $n)] ?? null;
        $p99 = $latencies[(int) (0.99 * $n)] ?? null;
        $min = $latencies[0] ?? null;
        $max = end($latencies) ?: null;

        $this->newLine();
        $this->info('Results');
        $this->line(sprintf('  requests: %d', $n));
        foreach ($status as $code => $count) {
            $this->line(sprintf('  status %d: %d', $code, $count));
        }
        $this->line(sprintf('  latency (ms): min=%.1f p50=%.1f p95=%.1f p99=%.1f max=%.1f', $min, $p50, $p95, $p99, $max));
        if ($rateLimitedAt) {
            $this->line(sprintf('  rate-limited starting at request %d (PerIpRateLimit middleware fired ✓)', $rateLimitedAt));
        } else {
            $this->warn('  no 429 observed — either configured limit is higher than --requests, or limiter is mis-wired');
        }

        return self::SUCCESS;
    }

    /** @return array{status:int,ms:float} */
    private function time(\Closure $fn): array
    {
        $t = microtime(true);
        try {
            $resp = $fn();
            $status = $resp->status();
        } catch (\Throwable $e) {
            $status = 0;
        }
        return ['status' => $status, 'ms' => (microtime(true) - $t) * 1000];
    }
}
