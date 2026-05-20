<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class HealthController extends Controller
{
    public function public(): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }

    public function admin(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'uptime_seconds' => (int) (microtime(true) - LARAVEL_START),
            'dependencies' => [
                'siisyana' => ['reachable' => $this->probe('siisyana_ro')],
                'sipirang' => ['reachable' => $this->probe('sipirang_ro')],
            ],
        ]);
    }

    private function probe(string $connection): bool
    {
        try {
            \DB::connection($connection)->select('SELECT 1 as ok');
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
