<?php

namespace App\Domain\Mapping;

class LandMapper
{
    /**
     * Map a SIISYANA `tanahs` row to API resource. Whitelist only.
     * Schema confirmed (PROJ-81): tanahs.nomor_shp, nomor_kib, lokasi,
     * luas_total, luas_tidak_terpakai, latitude, longitude.
     */
    public static function map(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'jenis' => 'Tanah',
            'bukti_kepemilikan' => $row->nomor_shp ?? null,
            'nomor_kib' => $row->nomor_kib ?? null,
            'luas_total' => self::toFloat($row->luas_total ?? null),
            'luas_tidak_terpakai' => self::toFloat($row->luas_tidak_terpakai ?? null),
            'lokasi' => $row->lokasi ?? null,
            'latitude' => self::toFloat($row->latitude ?? null),
            'longitude' => self::toFloat($row->longitude ?? null),
        ];
    }

    private static function toFloat(mixed $v): ?float
    {
        if ($v === null || $v === '') return null;
        return is_numeric($v) ? (float) $v : null;
    }
}
