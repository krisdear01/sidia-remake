<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class PerIpRateLimit
{
    public function handle(Request $request, Closure $next, string $name = 'public', int $perMinute = 60): Response
    {
        $key = sprintf('siau:%s:%s', $name, $request->ip());

        if (RateLimiter::tooManyAttempts($key, $perMinute)) {
            $retry = RateLimiter::availableIn($key);

            return response()->json([
                'type' => 'https://siau.unud.ac.id/errors/rate-limited',
                'title' => 'Too Many Requests',
                'status' => 429,
                'code' => 'RATE_LIMITED',
                'detail' => sprintf('Rate limit exceeded. Retry after %d seconds.', $retry),
                'instance' => $request->path(),
            ], 429, [
                'Content-Type' => 'application/problem+json',
                'Retry-After' => (string) $retry,
                'X-RateLimit-Limit' => (string) $perMinute,
                'X-RateLimit-Remaining' => '0',
            ]);
        }

        RateLimiter::hit($key, 60);

        return $next($request);
    }
}
