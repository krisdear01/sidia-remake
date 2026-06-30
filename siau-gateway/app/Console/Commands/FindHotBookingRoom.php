<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FindHotBookingRoom extends Command
{
    protected $signature = 'siau:hotbooking';
    protected $description = 'Find SIPIRANG rooms with the most bookings + map back to SIISYANA via kode_ruangan. Read-only.';

    public function handle(): int
    {
        $rows = DB::connection('sipirang_ro')->select(
            'SELECT t.id_ruangan, COUNT(*) AS c, r.kode_ruangan, r.nama '
            . 'FROM tb_transaksi_pinjam t '
            . 'INNER JOIN tb_m_ruangan r ON r.id = t.id_ruangan AND r.is_deleted = 0 '
            . 'WHERE t.is_deleted = 0 '
            . 'GROUP BY t.id_ruangan, r.kode_ruangan, r.nama '
            . 'ORDER BY c DESC LIMIT 10'
        );

        foreach ($rows as $r) {
            // Find matching SIISYANA id
            $match = DB::connection('siisyana_ro')->select(
                'SELECT id FROM tb_m_ruangan WHERE kode_ruangan = ? AND is_deleted = 0 LIMIT 1',
                [$r->kode_ruangan]
            );
            $siisyanaId = $match[0]->id ?? '—';
            $this->line(sprintf(
                'sipirang_id=%s siisyana_id=%s kode=%s nama=%s bookings=%d',
                $r->id_ruangan, $siisyanaId, $r->kode_ruangan, $r->nama, $r->c
            ));
        }

        return self::SUCCESS;
    }
}
