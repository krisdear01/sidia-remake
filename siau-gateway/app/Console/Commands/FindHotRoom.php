<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FindHotRoom extends Command
{
    protected $signature = 'siau:hotroom';
    protected $description = 'Find rooms with the most assets. Read-only.';

    public function handle(): int
    {
        // Hot rooms that actually exist in tb_m_ruangan AND are not deleted.
        $rows = DB::connection('siisyana_ro')->select(
            'SELECT brh.id_ruangan, COUNT(DISTINCT brh.id_barang) AS c, r.nama '
            . 'FROM barang_ruangan_histories brh '
            . 'INNER JOIN tb_m_ruangan r ON r.id = brh.id_ruangan AND r.is_deleted = 0 '
            . 'GROUP BY brh.id_ruangan, r.nama ORDER BY c DESC LIMIT 10'
        );
        foreach ($rows as $r) {
            $this->line(sprintf('room=%s nama=%s count=%d', $r->id_ruangan, $r->nama, $r->c));
        }
        return self::SUCCESS;
    }
}
