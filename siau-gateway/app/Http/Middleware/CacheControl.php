<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Emit Cache-Control: public, s-maxage=<sMaxAge>, max-age=<browserMaxAge>
 * on 2xx responses. Designed so a CDN (Cloudflare, Nginx proxy_cache, …)
 * can absorb scraping bursts without re-hitting the gateway.
 *
 * Only emitted when:
 *  - the response is a successful (2xx) JSON response,
 *  - the request method is GET or HEAD,
 *  - the request did not include an Authorization header (we don't want
 *    a CDN to cache admin-token-protected responses).
 *
 * Usage in routes:
 *   ->middleware('siau.cache:21600,60')   // s-maxage=6h, browser max-age=60s
 */
class CacheControl
{
    public function handle(Request $request, Closure $next, int $sMaxAge = 60, int $browserMaxAge = 0): Response
    {
        $response = $next($request);

        if (!in_array($request->method(), ['GET', 'HEAD'], true)) {
            return $response;
        }
        if ($request->headers->has('Authorization')) {
            return $response;
        }
        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return $response;
        }

        // Don't clobber an explicit no-store (an upstream handler signalled
        // the response is genuinely uncacheable). Laravel's default
        // `no-cache, private` IS the value we are here to overwrite.
        $existing = (string) $response->headers->get('Cache-Control', '');
        if (str_contains($existing, 'no-store')) {
            return $response;
        }

        $parts = ['public', "s-maxage={$sMaxAge}"];
        if ($browserMaxAge > 0) {
            $parts[] = "max-age={$browserMaxAge}";
        } else {
            $parts[] = 'max-age=0';
        }

        $response->headers->set('Cache-Control', implode(', ', $parts));
        $response->headers->set('Vary', 'Accept, Origin');

        return $response;
    }
}
