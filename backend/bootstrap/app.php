<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Disable CSRF for API routes (using Bearer token auth instead)
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // This app has no web login view (routes/web.php is just the default
        // welcome page). Without this, unauthenticated requests that don't
        // send Accept: application/json make Laravel's Authenticate
        // middleware try to redirect to a named 'login' route that doesn't
        // exist, throwing RouteNotFoundException (500) instead of a clean
        // 401 JSON response.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every route in this app is under api/*; always render JSON errors
        // regardless of the request's Accept header. Without this, the
        // exception handler's guest-redirect fallback (redirect()->guest($e->redirectTo($request) ?? route('login')))
        // still calls route('login') for non-JSON requests even with
        // redirectGuestsTo(null) set above, which throws RouteNotFoundException.
        $exceptions->shouldRenderJsonWhen(fn () => true);
    })->create();
