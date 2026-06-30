<?php

namespace App\Domain\Mapping;

class BuildingMapper
{
    /** Map a tb_m_gedung row to API resource. Whitelist only — no extra fields leak. */
    public static function map(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'kode' => (string) ($row->kode_gedung ?? ''),
            'nama' => $row->nama,
            'jumlah_lantai' => isset($row->jumlah_lantai) ? (int) $row->jumlah_lantai : null,
            'latitude' => self::toFloat($row->latitude ?? null),
            'longitude' => self::toFloat($row->longitude ?? null),
            'luas_gedung' => isset($row->luas_gedung) ? (float) $row->luas_gedung : null,
            'jam_buka' => $row->jam_buka ?? null,
            'jam_tutup' => $row->jam_tutup ?? null,
            'is_valid' => isset($row->is_valid) ? (bool) $row->is_valid : null,
            // Schema confirmed (PROJ-81): tb_m_gedung.nomor_kib + file_rincian_gedung.
            'nomor_kib' => $row->nomor_kib ?? null,
            'file_rincian_gedung' => self::storageUrl($row->file_rincian_gedung ?? null),
        ];
    }

    /** Build an absolute SIISYANA storage URL from a stored relative path. */
    public static function storageUrl(?string $path): ?string
    {
        if ($path === null || $path === '') return null;
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        $base = config('siau.storage_base_url');
        return $base . '/' . ltrim($path, '/');
    }

    private static function toFloat(mixed $v): ?float
    {
        if ($v === null || $v === '') return null;
        return is_numeric($v) ? (float) $v : null;
    }
}
