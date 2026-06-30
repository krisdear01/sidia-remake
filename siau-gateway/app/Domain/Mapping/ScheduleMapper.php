<?php

namespace App\Domain\Mapping;

class ScheduleMapper
{
    /** Map a tb_transaksi_pinjam row → API resource. PII excluded by whitelist. */
    public static function map(object $row): array
    {
        return [
            'booking_id' => (string) $row->id,
            'event_title' => isset($row->keterangan)
                ? mb_substr((string) $row->keterangan, 0, 200)
                : null,
            'start_time' => self::toIso8601($row->tgl_awal_pinjam ?? null),
            'end_time' => self::toIso8601($row->tgl_akhir_pinjam ?? null),
            'status' => self::mapStatus($row->status_nama ?? null, $row->is_approved ?? null),
            'is_recurring' => isset($row->is_berulang) ? ((int) $row->is_berulang === 1) : null,
        ];
    }

    private static function toIso8601(?string $datetime): ?string
    {
        if ($datetime === null || $datetime === '') return null;
        try {
            return (new \DateTimeImmutable($datetime, new \DateTimeZone('Asia/Makassar')))
                ->format(\DateTimeInterface::ATOM);
        } catch (\Throwable) {
            return null;
        }
    }

    private static function mapStatus(?string $name, mixed $isApproved): string
    {
        if ($name === null) {
            return match ((int) ($isApproved ?? 0)) {
                1 => 'approved',
                2 => 'rejected',
                default => 'pending',
            };
        }
        $n = strtolower($name);
        if (str_contains($n, 'approved') || str_contains($n, 'setuju') || str_contains($n, 'terima')) return 'approved';
        if (str_contains($n, 'rejected') || str_contains($n, 'tolak')) return 'rejected';
        if (str_contains($n, 'cancel') || str_contains($n, 'batal')) return 'cancelled';
        return 'pending';
    }
}
