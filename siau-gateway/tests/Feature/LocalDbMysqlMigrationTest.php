<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDOException;
use Tests\TestCase;

/**
 * Validates that the gateway's LOCAL MySQL database has the expected schema
 * after `php artisan migrate --database=gateway`. Skipped automatically when
 * the operator hasn't provisioned MySQL yet (e.g. CI without a DB).
 */
class LocalDbMysqlMigrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.connections.gateway.driver') !== 'mysql') {
            $this->markTestSkipped('Gateway connection is not configured for MySQL; skipping integration check.');
        }

        try {
            DB::connection('gateway')->getPdo();
        } catch (PDOException $e) {
            $this->markTestSkipped('Cannot reach gateway MySQL database. Provision it via docs/setup-mysql.md.');
        }
    }

    public function test_core_tables_exist(): void
    {
        $this->assertTrue(Schema::connection('gateway')->hasTable('room_identity_map'));
        $this->assertTrue(Schema::connection('gateway')->hasTable('admin_audit_log'));
        $this->assertTrue(Schema::connection('gateway')->hasTable('migrations'));
    }

    public function test_room_identity_map_columns(): void
    {
        foreach (['siisyana_room_id', 'sipirang_room_id', 'kode_ruangan', 'confidence', 'last_reconciled_at', 'note'] as $col) {
            $this->assertTrue(
                Schema::connection('gateway')->hasColumn('room_identity_map', $col),
                "Expected column room_identity_map.$col"
            );
        }
    }

    public function test_admin_audit_log_columns(): void
    {
        foreach (['id', 'action', 'subject', 'payload', 'actor_ip', 'created_at'] as $col) {
            $this->assertTrue(
                Schema::connection('gateway')->hasColumn('admin_audit_log', $col),
                "Expected column admin_audit_log.$col"
            );
        }
    }

    public function test_gateway_connection_is_writable(): void
    {
        // The gateway connection must NOT receive the ReadOnlyGuard — the
        // identity-map admin endpoints rely on being able to UPDATE/INSERT.
        DB::connection('gateway')->statement('CREATE TEMPORARY TABLE _siau_write_probe (id INT)');
        DB::connection('gateway')->statement('INSERT INTO _siau_write_probe (id) VALUES (1)');
        $rows = DB::connection('gateway')->select('SELECT id FROM _siau_write_probe');
        $this->assertCount(1, $rows);
    }
}
