<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileRooms extends Command
{
    protected $signature = 'siau:reconcile-rooms {--dry-run : Print stats but do not write}';
    protected $description = 'Reconcile SIISYANA ↔ SIPIRANG room identity by kode_ruangan. Writes only to the gateway DB.';

    public function handle(): int
    {
        $this->info('Pulling SIISYANA rooms…');
        $siisyana = DB::connection('siisyana_ro')->select(
            'SELECT id, kode_ruangan FROM tb_m_ruangan WHERE is_deleted = 0'
        );
        $this->line('  ' . count($siisyana) . ' siisyana rooms');

        $this->info('Pulling SIPIRANG rooms…');
        $sipirang = DB::connection('sipirang_ro')->select(
            'SELECT id, kode_ruangan FROM tb_m_ruangan WHERE is_deleted = 0'
        );
        $this->line('  ' . count($sipirang) . ' sipirang rooms');

        // Index sipirang by kode_ruangan (case-insensitive)
        $sipirangIdx = [];
        foreach ($sipirang as $r) {
            $sipirangIdx[mb_strtolower($r->kode_ruangan)] = (int) $r->id;
        }

        $matched = 0;
        $unmatched = 0;
        $now = now()->toDateTimeString();
        $existingManual = $this->loadManualOverrides();

        $rows = [];
        foreach ($siisyana as $r) {
            $key = mb_strtolower($r->kode_ruangan);
            $sipirangId = $sipirangIdx[$key] ?? null;

            // Preserve any manual override — don't overwrite it during reconcile
            if (array_key_exists((int) $r->id, $existingManual)) {
                $rows[] = [
                    'siisyana_room_id' => (int) $r->id,
                    'sipirang_room_id' => $existingManual[(int) $r->id]['sipirang_room_id'],
                    'kode_ruangan' => $r->kode_ruangan,
                    'confidence' => 'manual',
                    'last_reconciled_at' => $now,
                    'note' => $existingManual[(int) $r->id]['note'],
                ];
                $matched++;
                continue;
            }

            $rows[] = [
                'siisyana_room_id' => (int) $r->id,
                'sipirang_room_id' => $sipirangId,
                'kode_ruangan' => $r->kode_ruangan,
                'confidence' => $sipirangId ? 'exact' : 'fuzzy',
                'last_reconciled_at' => $now,
                'note' => null,
            ];
            $sipirangId ? $matched++ : $unmatched++;
        }

        $this->line(sprintf('matched: %d   unmatched: %d   total: %d', $matched, $unmatched, count($rows)));

        if ($this->option('dry-run')) {
            $this->warn('--dry-run: gateway DB not touched.');
            return self::SUCCESS;
        }

        DB::connection('gateway')->transaction(function () use ($rows) {
            DB::connection('gateway')->table('room_identity_map')->delete();
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::connection('gateway')->table('room_identity_map')->insert($chunk);
            }
        });

        $this->info('Reconciliation complete. Wrote ' . count($rows) . ' rows to gateway.room_identity_map.');
        return self::SUCCESS;
    }

    private function loadManualOverrides(): array
    {
        try {
            $rows = DB::connection('gateway')->table('room_identity_map')
                ->where('confidence', 'manual')->get();
        } catch (\Throwable) {
            return [];
        }
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r->siisyana_room_id] = [
                'sipirang_room_id' => $r->sipirang_room_id,
                'note' => $r->note,
            ];
        }
        return $out;
    }
}
