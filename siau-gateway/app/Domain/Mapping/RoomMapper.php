<?php

namespace App\Domain\Mapping;

use App\Domain\Rules\RoomReadinessRule;

class RoomMapper
{
    /**
     * Map a joined tb_m_ruangan row to API resource.
     * Expected aliased columns (see RoomController query):
     *   r.id, r.kode_ruangan, r.nama, r.max_kapasitas, r.is_valid,
     *   r.is_renovasi, r.id_gedung, r.id_unit, r.id_jenis_ruangan,
     *   g_kode, g_nama, g_lat, g_lng, u_id, u_nama, jr_id, jr_nama
     */
    public static function map(object $row, ?string $kesiapan = null, ?int $assetCount = null): array
    {
        $kapasitas = isset($row->max_kapasitas) ? (int) $row->max_kapasitas : null;

        return [
            'id' => (string) $row->id,
            'kode_ruangan' => $row->kode_ruangan,
            'nama' => $row->nama,
            'kapasitas' => $kapasitas,
            'kategori_kapasitas' => RoomReadinessRule::kategoriKapasitas($kapasitas),
            'kesiapan' => $kesiapan,
            'jenis_ruangan' => isset($row->jr_id) ? [
                'id' => (int) $row->jr_id,
                'nama' => $row->jr_nama,
            ] : null,
            'gedung' => isset($row->id_gedung) ? [
                'id' => (string) $row->id_gedung,
                'kode' => $row->g_kode ?? null,
                'nama' => $row->g_nama ?? null,
                'latitude' => self::toFloat($row->g_lat ?? null),
                'longitude' => self::toFloat($row->g_lng ?? null),
            ] : null,
            'unit' => isset($row->u_id) ? [
                'id' => (int) $row->u_id,
                'nama' => $row->u_nama ?? null,
            ] : null,
            'status_validasi' => isset($row->is_valid) ? ((int) $row->is_valid === 1 ? 'validated' : 'pending') : null,
            'asset_count' => $assetCount,
        ];
    }

    private static function toFloat(mixed $v): ?float
    {
        if ($v === null || $v === '') return null;
        return is_numeric($v) ? (float) $v : null;
    }
}
