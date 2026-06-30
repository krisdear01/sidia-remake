<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class JsonEnvelope
{
    public static function ok(mixed $data, array $meta = [], array $links = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => $meta,
            'links' => $links,
        ], $status);
    }

    public static function notFound(string $code, string $detail, string $instance): JsonResponse
    {
        return response()->json([
            'type' => 'https://siau.unud.ac.id/errors/' . strtolower(str_replace('_', '-', $code)),
            'title' => 'Not Found',
            'status' => 404,
            'code' => $code,
            'detail' => $detail,
            'instance' => $instance,
        ], 404, ['Content-Type' => 'application/problem+json']);
    }

    public static function validation(string $detail, string $instance): JsonResponse
    {
        return response()->json([
            'type' => 'https://siau.unud.ac.id/errors/validation',
            'title' => 'Validation Error',
            'status' => 422,
            'code' => 'VALIDATION_ERROR',
            'detail' => $detail,
            'instance' => $instance,
        ], 422, ['Content-Type' => 'application/problem+json']);
    }
}
