<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SmokeSnapshot extends Command
{
    protected $signature = 'siau:snapshot {connection}';

    protected $description = 'Print a fingerprint of the schema + a few row counts. Safe (SELECT-only).';

    public function handle(): int
    {
        $conn = $this->argument('connection');

        $tables = DB::connection($conn)->select(
            'SELECT table_name AS t, table_rows AS r '
            . 'FROM information_schema.tables '
            . 'WHERE table_schema = DATABASE() '
            . 'ORDER BY table_name'
        );

        $fingerprint = hash('sha256', json_encode(array_map(fn($x) => (array) $x, $tables)));
        $this->line(sprintf('connection=%s tables=%d fingerprint=%s', $conn, count($tables), $fingerprint));

        return self::SUCCESS;
    }
}
