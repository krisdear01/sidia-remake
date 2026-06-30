<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StripPiiResponse
{
    private const FORBIDDEN_KEYS = [
        'nidn', 'nip', 'nik', 'email', 'no_telp', 'no_hp', 'phone',
        'nama_dosen', 'nama_peminjam', 'peminjam', 'pemohon',
        'id_dosen', 'id_peminjam', 'id_user_peminjam',
        'telp_peminjam', 'email_peminjam',
        'approved_by', 'created_by', 'updated_by',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$response instanceof JsonResponse) {
            return $response;
        }

        $payload = $response->getData(true);
        if (!is_array($payload)) {
            return $response;
        }

        $response->setData($this->scrub($payload));

        return $response;
    }

    private function scrub(array $data): array
    {
        $out = [];
        foreach ($data as $k => $v) {
            if (is_string($k) && in_array(strtolower($k), self::FORBIDDEN_KEYS, true)) {
                continue;
            }
            $out[$k] = is_array($v) ? $this->scrub($v) : $v;
        }
        return $out;
    }
}
