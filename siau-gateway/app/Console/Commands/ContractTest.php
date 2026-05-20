<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Nightly contract test against live source DBs.
 *
 * Read-only: ONLY queries information_schema.columns. Never reads user data,
 * never writes anything. Exits non-zero if any required column is missing —
 * CI / cron treats that as an alert that the source schema has drifted under
 * the gateway.
 */
class ContractTest extends Command
{
    protected $signature = 'siau:contract-test';
    protected $description = 'Assert that every source column the mappers depend on still exists. Read-only.';

    /** Tables and columns the gateway's mappers read. */
    private const REQUIRED = [
        'siisyana_ro' => [
            'tb_m_gedung' => ['id', 'kode_gedung', 'nama', 'jumlah_lantai', 'latitude', 'longitude', 'luas_gedung', 'jam_buka', 'jam_tutup', 'is_valid', 'is_deleted'],
            'tb_m_ruangan' => ['id', 'kode_ruangan', 'nama', 'max_kapasitas', 'is_valid', 'is_renovasi', 'id_gedung', 'id_unit', 'id_jenis_ruangan', 'is_deleted'],
            'm_unit' => ['id_unit', 'nama_unit_panjang'],
            'tb_m_jenis_ruangan' => ['id', 'jenis_ruangan'],
            'barangs_latest' => ['id', 'kode_barang', 'nama_barang', 'merk_type', 'kondisi_terakhir', 'kuantitas', 'tanggal_perolehan', 'id_unit', 'dihapus'],
            'barang_ruangan_histories' => ['id', 'id_barang', 'id_ruangan'],
        ],
        'sipirang_ro' => [
            'tb_m_ruangan' => ['id', 'kode_ruangan', 'is_deleted'],
            'tb_transaksi_pinjam' => ['id', 'id_ruangan', 'tgl_awal_pinjam', 'tgl_akhir_pinjam', 'keterangan', 'is_berulang', 'is_approved', 'is_deleted'],
            'tb_m_status_approved' => ['id', 'nama'],
        ],
    ];

    public function handle(): int
    {
        $missing = [];

        foreach (self::REQUIRED as $conn => $tables) {
            $this->info("== {$conn} ==");
            foreach ($tables as $table => $cols) {
                $present = $this->presentColumns($conn, $table);
                if (empty($present)) {
                    $missing[] = "{$conn}.{$table} (entire table not visible to credential)";
                    $this->error("  ✗ {$table}: table missing or no SELECT grant");
                    continue;
                }
                $gone = array_values(array_diff($cols, $present));
                if (empty($gone)) {
                    $this->info("  ✓ {$table} (" . count($cols) . ' cols ok)');
                } else {
                    foreach ($gone as $g) $missing[] = "{$conn}.{$table}.{$g}";
                    $this->error("  ✗ {$table}: missing columns: " . implode(', ', $gone));
                }
            }
        }

        if (!empty($missing)) {
            $this->newLine();
            $this->error('CONTRACT FAILURE — ' . count($missing) . ' required column(s) missing.');
            $this->line('Source schema has drifted. Mappers must be updated before they break in production.');
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('CONTRACT OK — all required source columns are present.');
        return self::SUCCESS;
    }

    /** @return string[] column names that actually exist on $conn.$table */
    private function presentColumns(string $conn, string $table): array
    {
        $rows = DB::connection($conn)->select(
            'SELECT column_name FROM information_schema.columns '
            . 'WHERE table_schema = DATABASE() AND table_name = ?',
            [$table]
        );
        $out = [];
        foreach ($rows as $r) {
            $name = $r->column_name ?? $r->COLUMN_NAME ?? null;
            if ($name !== null) $out[] = $name;
        }
        return $out;
    }
}
