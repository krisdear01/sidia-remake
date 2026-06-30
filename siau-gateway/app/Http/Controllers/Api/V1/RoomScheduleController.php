<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Mapping\ScheduleMapper;
use App\Domain\RoomIdentityResolver;
use App\Support\CachedRows;
use App\Support\JsonEnvelope;
use App\Support\RoomVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class RoomScheduleController extends Controller
{
    private const TTL = 300; // 5 minutes per PRD §7.1
    private const DEFAULT_DAYS = 7;

    public function __construct(private RoomIdentityResolver $identity)
    {
    }

    public function index(string $id, Request $request): JsonResponse
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
                'detail' => 'This room is private; schedule access requires admin authentication.',
                'instance' => $request->path(),
            ], 403, ['Content-Type' => 'application/problem+json']);
        }

        $tz = new \DateTimeZone('Asia/Makassar');
        $today = new \DateTimeImmutable('today', $tz);
        $from = $request->query('from') ?: $today->format('Y-m-d');
        $to = $request->query('to') ?: $today->modify('+' . self::DEFAULT_DAYS . ' days')->format('Y-m-d');

        $fromDt = \DateTimeImmutable::createFromFormat('!Y-m-d', $from, $tz);
        $toDt = \DateTimeImmutable::createFromFormat('!Y-m-d', $to, $tz);
        if (!$fromDt || !$toDt) {
            return JsonEnvelope::validation('from / to must be YYYY-MM-DD', $request->path());
        }
        if ($fromDt > $toDt) {
            return JsonEnvelope::validation('from must be <= to', $request->path());
        }
        if ($fromDt->diff($toDt)->days > 90) {
            return JsonEnvelope::validation('range > 90 days is not supported', $request->path());
        }

        $sipirangId = $this->identity->siisyanaToSipirang((int) $id);
        if ($sipirangId === null) {
            return JsonEnvelope::notFound(
                'ROOM_NOT_FOUND',
                "No SIPIRANG room mapped from SIISYANA id {$id}.",
                $request->path()
            );
        }

        $key = "siau:v1:rooms:{$id}:schedule:{$from}:{$to}";
        [$rows, $hit] = CachedRows::rememberMany($key, self::TTL, function () use ($sipirangId, $fromDt, $toDt) {
            return DB::connection('sipirang_ro')->select(
                'SELECT t.id, t.keterangan, t.tgl_awal_pinjam, t.tgl_akhir_pinjam, '
                . 't.is_berulang, t.is_approved, s.nama AS status_nama '
                . 'FROM tb_transaksi_pinjam t '
                . 'LEFT JOIN tb_m_status_approved s ON s.id = t.is_approved '
                . 'WHERE t.id_ruangan = ? AND t.is_deleted = 0 '
                . '  AND t.tgl_awal_pinjam < ? '
                . '  AND t.tgl_akhir_pinjam >= ? '
                . 'ORDER BY t.tgl_awal_pinjam ASC LIMIT 500',
                [
                    $sipirangId,
                    $toDt->modify('+1 day')->format('Y-m-d 00:00:00'),
                    $fromDt->format('Y-m-d 00:00:00'),
                ]
            );
        });

        $data = array_map([ScheduleMapper::class, 'map'], $rows);

        return JsonEnvelope::ok(
            $data,
            meta: [
                'cache' => ['hit' => $hit, 'ttl_seconds' => self::TTL],
                'source' => 'sipirang',
                'range' => ['from' => $from, 'to' => $to],
            ],
            links: [
                'self' => "/api/v1/rooms/{$id}/schedule?from={$from}&to={$to}",
                'room' => "/api/v1/rooms/{$id}",
            ]
        );
    }
}
