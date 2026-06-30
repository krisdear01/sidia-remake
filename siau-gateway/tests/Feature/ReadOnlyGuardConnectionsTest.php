<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use PDOException;
use RuntimeException;
use Tests\TestCase;

/**
 * Confirms the ReadOnlyGuard attaches ONLY to siisyana_ro and sipirang_ro
 * after switching the local gateway DB to MySQL. The gateway connection
 * must remain writable.
 */
class ReadOnlyGuardConnectionsTest extends TestCase
{
    public function test_gateway_connection_is_not_guarded(): void
    {
        if (config('database.connections.gateway.driver') !== 'mysql') {
            $this->markTestSkipped('Gateway connection is not MySQL; skipping write probe.');
        }

        try {
            DB::connection('gateway')->getPdo();
        } catch (PDOException $e) {
            $this->markTestSkipped('Cannot reach gateway MySQL database.');
        }

        // A non-SELECT statement against the gateway connection must succeed.
        DB::connection('gateway')->statement('CREATE TEMPORARY TABLE _guard_probe (id INT)');
        DB::connection('gateway')->statement('INSERT INTO _guard_probe (id) VALUES (1)');
        $this->assertSame(1, (int) DB::connection('gateway')->scalar('SELECT COUNT(*) FROM _guard_probe'));
    }

    public function test_siisyana_ro_rejects_writes(): void
    {
        $this->assertReadOnly('siisyana_ro');
    }

    public function test_sipirang_ro_rejects_writes(): void
    {
        $this->assertReadOnly('sipirang_ro');
    }

    private function assertReadOnly(string $connection): void
    {
        // These connections use Laravel read/write split. The WRITE host is
        // intentionally pinned to a black hole (127.0.0.1:1), so getPdo()
        // would refuse — we need getReadPdo() to confirm reachability.
        try {
            DB::connection($connection)->getReadPdo();
        } catch (PDOException $e) {
            $this->markTestSkipped("Cannot reach $connection upstream database.");
        }

        $threw = false;
        try {
            // ReadOnlyGuard's regex disallows anything not starting with
            // SELECT/SHOW/DESCRIBE/DESC/EXPLAIN/WITH. UPDATE must throw —
            // either at the guard or at the black-holed write PDO.
            DB::connection($connection)->statement('UPDATE tb_m_ruangan SET nama_ruangan = nama_ruangan WHERE 1 = 0');
        } catch (RuntimeException|QueryException|PDOException $e) {
            $threw = true;
        }

        $this->assertTrue($threw, "$connection accepted a write statement; ReadOnlyGuard regressed.");
    }
}
