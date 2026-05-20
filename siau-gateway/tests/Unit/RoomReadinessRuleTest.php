<?php

namespace Tests\Unit;

use App\Domain\Rules\RoomReadinessRule;
use PHPUnit\Framework\TestCase;

class RoomReadinessRuleTest extends TestCase
{
    public function test_no_assets_returns_null(): void
    {
        $this->assertNull(RoomReadinessRule::derive([], false));
    }

    public function test_all_baik_is_layak(): void
    {
        $this->assertSame('Layak', RoomReadinessRule::derive([1, 1, 1], false));
    }

    public function test_any_rusak_ringan_is_layak_bersyarat(): void
    {
        $this->assertSame('Layak Bersyarat', RoomReadinessRule::derive([1, 2, 1], false));
    }

    public function test_any_rusak_berat_is_tidak_layak(): void
    {
        $this->assertSame('Tidak Layak', RoomReadinessRule::derive([1, 2, 3], false));
    }

    public function test_renovasi_overrides_to_tidak_layak(): void
    {
        $this->assertSame('Tidak Layak', RoomReadinessRule::derive([1, 1, 1], true));
    }

    public function test_kategori_kapasitas(): void
    {
        $this->assertSame('Kecil', RoomReadinessRule::kategoriKapasitas(10));
        $this->assertSame('Kecil', RoomReadinessRule::kategoriKapasitas(24));
        $this->assertSame('Normal', RoomReadinessRule::kategoriKapasitas(25));
        $this->assertSame('Normal', RoomReadinessRule::kategoriKapasitas(55));
        $this->assertSame('Besar', RoomReadinessRule::kategoriKapasitas(56));
        $this->assertNull(RoomReadinessRule::kategoriKapasitas(null));
    }
}
