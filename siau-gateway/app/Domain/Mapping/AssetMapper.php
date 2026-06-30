<?php

namespace App\Domain\Mapping;

class AssetMapper
{
    /** Map a barangs_latest row. PII (responsible person) deliberately omitted. */
    public static function map(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'kode_barang' => $row->kode_barang,
            'nama_barang' => $row->nama_barang,
            'merk_type' => $row->merk_type ?? null,
            'kondisi' => self::mapKondisi($row->kondisi_terakhir ?? null),
            'kondisi_code' => isset($row->kondisi_terakhir) ? (int) $row->kondisi_terakhir : null,
            'kuantitas' => isset($row->kuantitas) ? (float) $row->kuantitas : null,
            'tanggal_perolehan' => $row->tanggal_perolehan ?? null,
            'id_ruangan' => isset($row->id_ruangan) ? (string) $row->id_ruangan : null,
            'id_unit' => isset($row->id_unit) ? (int) $row->id_unit : null,
            'source' => 'siisyana',
        ];
    }

    /** Map a hibah_assets row (gateway-local, locally authored). */
    public static function mapHibah(object $row): array
    {
        return [
            // Prefix with 'hibah-' so the FE can distinguish from SIISYANA ids
            // even if both spaces use auto-increment integers.
            'id' => 'hibah-' . (int) $row->id,
            'kode_barang' => $row->kode_barang,
            'nama_barang' => $row->nama_barang,
            'merk_type' => $row->merk_type,
            'kondisi' => $row->kondisi,
            'kondisi_code' => match ($row->kondisi) {
                'Baik' => 1, 'Rusak Ringan' => 2, 'Rusak Berat' => 3, default => null,
            },
            'kuantitas' => $row->kuantitas !== null ? (float) $row->kuantitas : null,
            'tanggal_perolehan' => $row->tanggal_perolehan,
            'id_ruangan' => (string) $row->id_ruangan,
            'id_unit' => null,
            'source' => 'hibah',
        ];
    }

    private static function mapKondisi(mixed $code): ?string
    {
        if ($code === null) return null;
        return match ((int) $code) {
            1 => 'Baik',
            2 => 'Rusak Ringan',
            3 => 'Rusak Berat',
            default => null,
        };
    }
}
