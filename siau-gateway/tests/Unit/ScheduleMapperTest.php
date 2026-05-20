<?php

namespace Tests\Unit;

use App\Domain\Mapping\ScheduleMapper;
use PHPUnit\Framework\TestCase;

class ScheduleMapperTest extends TestCase
{
    public function test_maps_basic_booking(): void
    {
        $row = (object) [
            'id' => 884213,
            'keterangan' => 'Kuliah Hukum Internasional',
            'tgl_awal_pinjam' => '2026-05-20 08:00:00',
            'tgl_akhir_pinjam' => '2026-05-20 10:00:00',
            'is_berulang' => 1,
            'is_approved' => 1,
            'status_nama' => 'Disetujui',
        ];

        $out = ScheduleMapper::map($row);

        $this->assertSame('884213', $out['booking_id']);
        $this->assertSame('Kuliah Hukum Internasional', $out['event_title']);
        $this->assertSame('approved', $out['status']);
        $this->assertTrue($out['is_recurring']);
        $this->assertStringStartsWith('2026-05-20T08:00:00', $out['start_time']);
        $this->assertStringEndsWith('+08:00', $out['start_time']);
    }

    public function test_status_fallback_to_is_approved(): void
    {
        $row = (object) [
            'id' => 1, 'keterangan' => '', 'tgl_awal_pinjam' => '2026-01-01 00:00:00',
            'tgl_akhir_pinjam' => '2026-01-01 01:00:00', 'is_berulang' => 0,
            'is_approved' => 2, 'status_nama' => null,
        ];
        $this->assertSame('rejected', ScheduleMapper::map($row)['status']);
    }

    public function test_event_title_truncated_to_200(): void
    {
        $long = str_repeat('a', 300);
        $row = (object) [
            'id' => 2, 'keterangan' => $long, 'tgl_awal_pinjam' => null,
            'tgl_akhir_pinjam' => null, 'is_berulang' => 0,
            'is_approved' => 0, 'status_nama' => null,
        ];
        $this->assertSame(200, mb_strlen(ScheduleMapper::map($row)['event_title']));
    }

    public function test_no_pii_fields_leak(): void
    {
        $row = (object) [
            'id' => 3, 'keterangan' => 'x', 'tgl_awal_pinjam' => null,
            'tgl_akhir_pinjam' => null, 'is_berulang' => 0,
            'is_approved' => 0, 'status_nama' => null,
            'nama_peminjam' => 'John', 'telp_peminjam' => '0812', 'email_peminjam' => 'j@x',
            'id_user_peminjam' => 99,
        ];
        $out = ScheduleMapper::map($row);
        $this->assertArrayNotHasKey('nama_peminjam', $out);
        $this->assertArrayNotHasKey('telp_peminjam', $out);
        $this->assertArrayNotHasKey('email_peminjam', $out);
        $this->assertArrayNotHasKey('id_user_peminjam', $out);
    }
}
