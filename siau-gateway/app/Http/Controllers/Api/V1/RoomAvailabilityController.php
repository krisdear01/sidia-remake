<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\RoomIdentityResolver;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use App\Support\RoomVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RoomAvailabilityController extends Controller
{
    private const TTL = 60; // 60 seconds per PRD §7.1

    public function __construct(private RoomIdentityResolver $identity)
    {
    }

    public function show(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        if (!RoomVisibility::isAccessible((int) $id, $request)) {
            return response()->json([
                'type' => 'https://siau.unud.ac.id/errors/forbidden',
                'title' => 'Forbidden',
                'status' => 403,
                'code' => 'ROOM_PRIVATE',
                'detail' => 'This room is private; availability access requires admin authentication.',
                'instance' => $request->path(),
            ], 403, ['Content-Type' => 'application/problem+json']);
        }

        $tz = new \DateTimeZone('Asia/Makassar');
        $at = $request->query('at');
        try {
            $atDt = $at ? new \DateTimeImmutable($at, $tz) : new \DateTimeImmutable('now', $tz);
        } catch (\Throwable) {
            return JsonEnvelope::validation('at must be ISO 8601 datetime', $request->path());
        }

        $sipirangId = $this->identity->siisyanaToSipirang((int) $id);
        if ($sipirangId === null) {
            return JsonEnvelope::notFound(
                'ROOM_NOT_FOUND',
                "No SIPIRANG room mapped from SIISYANA id {$id}.",
                $request->path()
            );
        }

        $key = sprintf('siau:v1:rooms:%s:avail:%s', $id, $atDt->format('YmdHis'));
        $hit = Cache::has($key);
        $payload = Cache::remember($key, self::TTL, function () use ($sipirangId, $atDt) {
            $atSql = $atDt->format('Y-m-d H:i:s');

            // Booking that covers $at — approved or pending counts as occupied.
            $current = DB::connection('sipirang_ro')->select(
                'SELECT id, tgl_awal_pinjam, tgl_akhir_pinjam FROM tb_transaksi_pinjam '
                . 'WHERE id_ruangan = ? AND is_deleted = 0 '
                . '  AND tgl_awal_pinjam <= ? AND tgl_akhir_pinjam > ? '
                . 'ORDER BY tgl_akhir_pinjam DESC LIMIT 1',
                [$sipirangId, $atSql, $atSql]
            );
            $occupiedUntil = $current[0]->tgl_akhir_pinjam ?? null;

            // Next booking start time after $at — used to compute next-free or next-busy.
            $next = DB::connection('sipirang_ro')->select(
                'SELECT tgl_awal_pinjam, tgl_akhir_pinjam FROM tb_transaksi_pinjam '
                . 'WHERE id_ruangan = ? AND is_deleted = 0 AND tgl_awal_pinjam > ? '
                . 'ORDER BY tgl_awal_pinjam ASC LIMIT 1',
                [$sipirangId, $occupiedUntil ?: $atSql]
            );

            return [
                'available' => empty($current),
                'next_free_slot' => $occupiedUntil ? self::iso($occupiedUntil) : self::iso($atSql),
                'next_busy_slot' => isset($next[0]) ? self::iso($next[0]->tgl_awal_pinjam) : null,
            ];
        });

        return JsonEnvelope::ok(
            $payload,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL],
                'source' => 'sipirang',
                'evaluated_at' => $atDt->format(\DateTimeInterface::ATOM),
            ],
            links: [
                'self' => "/api/v1/rooms/{$id}/availability",
                'room' => "/api/v1/rooms/{$id}",
                'schedule' => "/api/v1/rooms/{$id}/schedule",
            ]
        );
    }

    private static function iso(string $datetime): ?string
    {
        try {
            return (new \DateTimeImmutable($datetime, new \DateTimeZone('Asia/Makassar')))
                ->format(\DateTimeInterface::ATOM);
        } catch (\Throwable) {
            return null;
        }
    }
}
