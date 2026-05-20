<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceJsonProblem
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        $response = $next($request);

        if ($response instanceof JsonResponse && $response->getStatusCode() >= 400) {
            if (!$response->headers->has('Content-Type') || str_starts_with((string) $response->headers->get('Content-Type'), 'application/json')) {
                $response->headers->set('Content-Type', 'application/problem+json');
            }
        }

        return $response;
    }
}
