<?php

namespace App\Domain\Rules;

class RoomReadinessRule
{
    public const LAYAK = 'Layak';
    public const LAYAK_BERSYARAT = 'Layak Bersyarat';
    public const TIDAK_LAYAK = 'Tidak Layak';

    /**
     * Derive room readiness from a list of asset condition codes and the
     * room's is_renovasi flag.
     *
     * Kondisi codes (siisyana barangs_latest.kondisi_terakhir):
     *   1 = Baik, 2 = Rusak Ringan, 3 = Rusak Berat.
     *
     * Coarse rule (PRD §6.3, simplified — we cannot identify "essential"
     * assets without the kategori_items join, so we apply the rule to all
     * assets in the room):
     *   - is_renovasi=1 OR any asset Rusak Berat -> Tidak Layak
     *   - any asset Rusak Ringan -> Layak Bersyarat
     *   - all assets Baik -> Layak
     *   - no assets -> null (unknown)
     */
    public static function derive(array $kondisiCodes, bool $isRenovasi): ?string
    {
        if ($isRenovasi) {
            return self::TIDAK_LAYAK;
        }
        if (empty($kondisiCodes)) {
            return null;
        }
        if (in_array(3, $kondisiCodes, true)) {
            return self::TIDAK_LAYAK;
        }
        if (in_array(2, $kondisiCodes, true)) {
            return self::LAYAK_BERSYARAT;
        }
        return self::LAYAK;
    }

    public static function kategoriKapasitas(?int $kapasitas): ?string
    {
        if ($kapasitas === null) return null;
        if ($kapasitas < 25) return 'Kecil';
        if ($kapasitas <= 55) return 'Normal';
        return 'Besar';
    }
}
