<?php

namespace App\Http\Controllers\Admin;

use App\Support\JsonEnvelope;
use App\Support\RoomCache;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * Admin CRUD for hibah_assets — local-only asset records that show up
 * alongside SIISYANA assets in public read endpoints.
 *
 * Writes target the `gateway` MySQL connection only. SIISYANA / SIPIRANG
 * remain read-only via the existing PDO black-hole + ReadOnlyGuard.
 */
class HibahAssetController extends Controller
{
    private const ALLOWED_KONDISI = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

    public function store(Request $request): JsonResponse
    {
        $payload = $request->json()->all();

        // --- validation ---------------------------------------------------
        $idRuangan = $payload['id_ruangan'] ?? null;
        if (!is_int($idRuangan) || $idRuangan <= 0) {
            return JsonEnvelope::validation('id_ruangan must be a positive integer', $request->path());
        }

        $namaBarang = trim((string) ($payload['nama_barang'] ?? ''));
        if ($namaBarang === '' || mb_strlen($namaBarang) > 255) {
            return JsonEnvelope::validation('nama_barang is required (max 255 chars)', $request->path());
        }

        $merkType = $payload['merk_type'] ?? null;
        if ($merkType !== null && (!is_string($merkType) || mb_strlen($merkType) > 255)) {
            return JsonEnvelope::validation('merk_type must be a string (max 255 chars)', $request->path());
        }

        $kondisi = $payload['kondisi'] ?? null;
        if ($kondisi !== null && !in_array($kondisi, self::ALLOWED_KONDISI, true)) {
            return JsonEnvelope::validation('kondisi must be one of Baik|Rusak Ringan|Rusak Berat', $request->path());
        }

        $kuantitas = $payload['kuantitas'] ?? null;
        if ($kuantitas !== null && (!is_numeric($kuantitas) || (float) $kuantitas < 0)) {
            return JsonEnvelope::validation('kuantitas must be a non-negative number', $request->path());
        }

        $tanggalPerolehan = $payload['tanggal_perolehan'] ?? null;
        if ($tanggalPerolehan !== null) {
            $d = \DateTime::createFromFormat('Y-m-d', (string) $tanggalPerolehan);
            if (!$d || $d->format('Y-m-d') !== $tanggalPerolehan) {
                return JsonEnvelope::validation('tanggal_perolehan must be a YYYY-MM-DD date', $request->path());
            }
        }

        // --- referential check: the room must exist in SIISYANA -----------
        // SELECT only — this connection is read-only.
        $roomExists = DB::connection('siisyana_ro')->select(
            'SELECT 1 FROM tb_m_ruangan WHERE id = ? AND is_deleted = 0 LIMIT 1',
            [$idRuangan]
        );
        if (empty($roomExists)) {
            return JsonEnvelope::notFound(
                'ROOM_NOT_FOUND',
                "No SIISYANA room with id {$idRuangan}.",
                $request->path()
            );
        }

        // --- insert with kode_barang allocation ---------------------------
        // kode_barang (HIBAH-YYYY-NNNN) is allocated with a SELECT MAX + INSERT
        // pattern, so two concurrent creates can pick the same number. The
        // UNIQUE index on kode_barang turns that into a duplicate-key error;
        // we regenerate and retry rather than surfacing a 500.
        $actorEmail = $request->header('X-SIAU-Actor');
        $now = now();
        $year = (int) date('Y');
        $maxAttempts = 5;
        $id = null;
        $kodeBarang = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $kodeBarang = $this->generateKodeBarang($year);
            try {
                $id = DB::connection('gateway')->table('hibah_assets')->insertGetId([
                    'id_ruangan' => $idRuangan,
                    'kode_barang' => $kodeBarang,
                    'nama_barang' => $namaBarang,
                    'merk_type' => $merkType,
                    'kondisi' => $kondisi,
                    'kuantitas' => $kuantitas !== null ? (float) $kuantitas : null,
                    'tanggal_perolehan' => $tanggalPerolehan,
                    'created_by_email' => is_string($actorEmail) ? mb_substr($actorEmail, 0, 255) : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                break;
            } catch (QueryException $e) {
                // SQLSTATE 23000 = integrity constraint violation (duplicate
                // kode_barang). Retry with a freshly allocated number; rethrow
                // on the final attempt or any other error.
                if ($e->getCode() === '23000' && $attempt < $maxAttempts) {
                    continue;
                }
                throw $e;
            }
        }

        $this->audit($request, 'hibah_asset.create', (string) $id, [
            'id_ruangan' => $idRuangan,
            'kode_barang' => $kodeBarang,
            'nama_barang' => $namaBarang,
        ]);

        // Invalidate caches that include this room's assets / counts.
        $this->forgetRoomCaches($idRuangan);

        $row = DB::connection('gateway')->table('hibah_assets')->where('id', $id)->first();
        return JsonEnvelope::ok($this->present($row));
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }

        $row = DB::connection('gateway')->table('hibah_assets')->where('id', (int) $id)->first();
        if ($row === null) {
            return JsonEnvelope::notFound(
                'HIBAH_ASSET_NOT_FOUND',
                "No hibah asset with id {$id}.",
                $request->path()
            );
        }

        DB::connection('gateway')->table('hibah_assets')->where('id', (int) $id)->delete();

        $this->audit($request, 'hibah_asset.delete', (string) $id, [
            'id_ruangan' => (int) $row->id_ruangan,
            'kode_barang' => $row->kode_barang,
        ]);

        $this->forgetRoomCaches((int) $row->id_ruangan);

        return JsonEnvelope::ok(['id' => (int) $id, 'deleted' => true]);
    }

    /**
     * Atomically allocate the next kode_barang for the given year. Uses
     * a SELECT MAX + INSERT pattern; uniqueness is guaranteed by the
     * UNIQUE index on kode_barang (concurrent writes would fail with a
     * duplicate-key error and the caller would retry).
     */
    private function generateKodeBarang(int $year): string
    {
        $prefix = sprintf('HIBAH-%04d-', $year);
        $last = DB::connection('gateway')->table('hibah_assets')
            ->where('kode_barang', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('kode_barang');

        $next = 1;
        if ($last !== null && preg_match('/^HIBAH-\d{4}-(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }
        return sprintf('%s%04d', $prefix, $next);
    }

    private function forgetRoomCaches(int $idRuangan): void
    {
        // Bump the room's cache version. This invalidates every per-room entry
        // at once — the assets list (any cursor/limit), the asset count, and
        // the detail row — without enumerating parameterized keys, which the
        // `database` cache store (no tag support) can't do. The global /rooms
        // list cache is parameterized and intentionally left to expire on its
        // 6h TTL (the per-room asset count there is non-critical).
        RoomCache::bump($idRuangan);
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

    private function present(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'id_ruangan' => (int) $row->id_ruangan,
            'kode_barang' => $row->kode_barang,
            'nama_barang' => $row->nama_barang,
            'merk_type' => $row->merk_type,
            'kondisi' => $row->kondisi,
            'kuantitas' => $row->kuantitas !== null ? (float) $row->kuantitas : null,
            'tanggal_perolehan' => $row->tanggal_perolehan,
            'source' => 'hibah',
        ];
    }
}
