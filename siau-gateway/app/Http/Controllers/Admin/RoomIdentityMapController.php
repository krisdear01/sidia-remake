<?php

namespace App\Http\Controllers\Admin;

use App\Support\JsonEnvelope;
use Illuminate\Console\BufferedConsoleOutput;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RoomIdentityMapController extends Controller
{
    public function unmatched(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 500), 1), 1000);

        $totalUnmatched = (int) DB::connection('gateway')->table('room_identity_map')
            ->whereNull('sipirang_room_id')->count();

        $rows = DB::connection('gateway')->table('room_identity_map')
            ->whereNull('sipirang_room_id')
            ->orderBy('siisyana_room_id')
            ->limit($limit)
            ->get();

        return JsonEnvelope::ok(
            $rows->map(fn($r) => [
                'siisyana_room_id' => (int) $r->siisyana_room_id,
                'kode_ruangan' => $r->kode_ruangan,
                'confidence' => $r->confidence,
                'last_reconciled_at' => $r->last_reconciled_at,
                'note' => $r->note,
            ])->all(),
            meta: [
                'total_unmatched' => $totalUnmatched,
                'returned' => $rows->count(),
                'truncated' => $totalUnmatched > $rows->count(),
                'source' => 'gateway',
            ],
            links: ['self' => '/api/v1/admin/identity-map/unmatched']
        );
    }

    public function resync(Request $request): JsonResponse
    {
        $this->audit($request, 'identity_map.resync', null, []);

        $output = new BufferedConsoleOutput();
        Artisan::call('siau:reconcile-rooms', [], $output);
        $log = $output->fetch();

        // Reset identity cache after a resync.
        Cache::forget('siau:identity:*');

        return JsonEnvelope::ok(
            ['log' => $log],
            meta: ['source' => 'gateway', 'action' => 'resync'],
            links: ['unmatched' => '/api/v1/admin/identity-map/unmatched']
        );
    }

    public function update(string $siisyanaId, Request $request): JsonResponse
    {
        if (!ctype_digit($siisyanaId)) {
            return JsonEnvelope::validation('siisyana_room_id must be a positive integer', $request->path());
        }

        $payload = $request->json()->all();
        $sipirangId = $payload['sipirang_room_id'] ?? null;
        $note = $payload['note'] ?? null;

        if ($sipirangId !== null && !is_int($sipirangId)) {
            return JsonEnvelope::validation('sipirang_room_id must be null or integer', $request->path());
        }

        $row = DB::connection('gateway')->table('room_identity_map')
            ->where('siisyana_room_id', (int) $siisyanaId)
            ->first();
        if ($row === null) {
            return JsonEnvelope::notFound(
                'IDENTITY_MAP_ROW_NOT_FOUND',
                "No identity-map row for siisyana_room_id {$siisyanaId}. Run resync first.",
                $request->path()
            );
        }

        DB::connection('gateway')->table('room_identity_map')
            ->where('siisyana_room_id', (int) $siisyanaId)
            ->update([
                'sipirang_room_id' => $sipirangId,
                'confidence' => 'manual',
                'note' => $note,
                'last_reconciled_at' => now(),
            ]);

        Cache::forget("siau:identity:siisyana_to_sipirang:{$siisyanaId}");

        $this->audit($request, 'identity_map.override', (string) $siisyanaId, [
            'sipirang_room_id' => $sipirangId, 'note' => $note,
        ]);

        $fresh = DB::connection('gateway')->table('room_identity_map')
            ->where('siisyana_room_id', (int) $siisyanaId)->first();

        return JsonEnvelope::ok([
            'siisyana_room_id' => (int) $fresh->siisyana_room_id,
            'sipirang_room_id' => $fresh->sipirang_room_id !== null ? (int) $fresh->sipirang_room_id : null,
            'kode_ruangan' => $fresh->kode_ruangan,
            'confidence' => $fresh->confidence,
            'note' => $fresh->note,
            'last_reconciled_at' => $fresh->last_reconciled_at,
        ]);
    }

    private function audit(Request $request, string $action, ?string $subject, array $payload): void
    {
        DB::connection('gateway')->table('admin_audit_log')->insert([
            'action' => $action,
            'subject' => $subject,
            'payload' => json_encode($payload),
            'actor_ip' => $request->ip() ?? 'unknown',
            'created_at' => now(),
        ]);
    }
}
