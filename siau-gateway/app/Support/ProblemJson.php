<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PDOException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ProblemJson
{
    /** Render any thrown exception as RFC 7807 problem+json, with DB info scrubbed. */
    public static function render(Throwable $e, Request $request): JsonResponse
    {
        [$status, $code, $title] = self::classify($e);

        $body = [
            'type' => 'https://siau.unud.ac.id/errors/' . strtolower(str_replace('_', '-', $code)),
            'title' => $title,
            'status' => $status,
            'code' => $code,
            'detail' => self::scrub($e->getMessage()),
            'instance' => $request->path(),
        ];

        if (config('app.debug')) {
            $body['debug_class'] = $e::class;
        }

        return response()->json($body, $status, ['Content-Type' => 'application/problem+json']);
    }

    /** @return array{0:int,1:string,2:string} */
    private static function classify(Throwable $e): array
    {
        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();
            return match ($status) {
                401 => [401, 'AUTH_MISSING', 'Unauthorized'],
                403 => [403, 'AUTH_FORBIDDEN', 'Forbidden'],
                404 => [404, 'NOT_FOUND', 'Not Found'],
                422 => [422, 'VALIDATION_ERROR', 'Validation Error'],
                429 => [429, 'RATE_LIMITED', 'Too Many Requests'],
                default => [$status, 'HTTP_ERROR', 'Error'],
            };
        }
        if ($e instanceof PDOException || self::isUpstreamFailure($e)) {
            return [503, 'UPSTREAM_UNAVAILABLE', 'Upstream Unavailable'];
        }
        if ($e instanceof \RuntimeException && str_contains($e->getMessage(), 'ReadOnlyGuard')) {
            return [500, 'INTERNAL_ERROR', 'Internal Error'];
        }
        return [500, 'INTERNAL_ERROR', 'Internal Error'];
    }

    private static function isUpstreamFailure(Throwable $e): bool
    {
        $msg = $e->getMessage();
        return str_contains($msg, 'SQLSTATE')
            || str_contains($msg, 'Connection refused')
            || str_contains($msg, 'gone away');
    }

    /** Strip DB host, user, SQL, file paths from a message before sending it to a client. */
    public static function scrub(string $msg): string
    {
        // Drop SQLSTATE preamble's connection block (Connection: …, Host: …, etc.)
        $msg = preg_replace('/\s*\(Connection:[^)]*\)/', '', $msg) ?? $msg;
        // Drop trailing "(SQL: …)" block
        $msg = preg_replace('/\s*\(SQL:[^)]*\)/', '', $msg) ?? $msg;
        // Mask host:port
        $msg = preg_replace('/(\d{1,3}\.){3}\d{1,3}(:\d+)?/', '<redacted-host>', $msg) ?? $msg;
        // Mask 'user'@'host' patterns
        $msg = preg_replace("/'[^']+'@'[^']+'/", '<redacted-user@host>', $msg) ?? $msg;
        // Mask credentials in connection strings (defensive)
        $msg = preg_replace('/(user(name)?|password)=[^ ;]+/i', '$1=<redacted>', $msg) ?? $msg;
        // Drop file paths
        $msg = preg_replace('#/[A-Za-z0-9_./-]*\.php(?:\(:\d+\))?#', '<path>', $msg) ?? $msg;

        // Boundary: if the message *still* looks like a SQLSTATE dump, return a safe default.
        if (str_contains($msg, 'SQLSTATE')) {
            return 'Upstream database error.';
        }

        return $msg;
    }
}
