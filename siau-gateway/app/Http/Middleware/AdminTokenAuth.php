<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('siau.admin_token', '');
        $provided = (string) $request->bearerToken();

        if ($expected === '' || !hash_equals($expected, $provided)) {
            return response()->json([
                'type' => 'https://siau.unud.ac.id/errors/auth-missing',
                'title' => 'Unauthorized',
                'status' => 401,
                'code' => 'AUTH_MISSING',
                'detail' => 'A valid admin bearer token is required.',
                'instance' => $request->path(),
            ], 401, ['Content-Type' => 'application/problem+json']);
        }

        return $next($request);
    }
}
