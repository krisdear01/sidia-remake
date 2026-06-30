<?php

namespace Tests\Unit;

use App\Database\ReadOnlyGuard;
use Illuminate\Database\Connection;
use Illuminate\Database\Connectors\ConnectionFactory;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class ReadOnlyGuardTest extends TestCase
{
    private Connection $connection;

    protected function setUp(): void
    {
        parent::setUp();

        $factory = new ConnectionFactory(new \Illuminate\Container\Container());
        $this->connection = $factory->make([
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
            'name' => 'guarded_test',
        ], 'guarded_test');

        ReadOnlyGuard::attach($this->connection);

        // Seed a row by bypassing the guard's beforeExecuting hook is not
        // possible — so we use the raw PDO directly to insert fixture data.
        $this->connection->getPdo()->exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)');
        $this->connection->getPdo()->exec("INSERT INTO items (id, name) VALUES (1, 'a')");
    }

    public function test_select_is_allowed(): void
    {
        $rows = $this->connection->select('SELECT id, name FROM items');
        $this->assertCount(1, $rows);
    }

    public function test_show_is_allowed(): void
    {
        // SQLite doesn't support SHOW; just assert the guard doesn't throw on
        // the keyword by intercepting at the regex stage via a select-rejected
        // statement that would still pass the guard.
        $this->expectNotToPerformAssertions();
        try {
            $this->connection->select('SHOW TABLES');
        } catch (\PDOException $e) {
            // Expected — SQLite rejects SHOW. Guard let it through; PDO rejected.
        }
    }

    public function test_insert_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->insert("INSERT INTO items (id, name) VALUES (2, 'b')");
    }

    public function test_update_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->update("UPDATE items SET name = 'x' WHERE id = 1");
    }

    public function test_delete_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->delete('DELETE FROM items WHERE id = 1');
    }

    public function test_create_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->statement('CREATE TABLE x (id INT)');
    }

    public function test_alter_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->statement('ALTER TABLE items ADD COLUMN z TEXT');
    }

    public function test_drop_is_refused(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ReadOnlyGuard');
        $this->connection->statement('DROP TABLE items');
    }

    public function test_leading_whitespace_does_not_bypass_guard(): void
    {
        $this->expectException(RuntimeException::class);
        $this->connection->statement("\n\t  INSERT INTO items (id, name) VALUES (3, 'c')");
    }
}
