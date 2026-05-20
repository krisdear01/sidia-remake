<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ListTables extends Command
{
    protected $signature = 'siau:tables {connection} {pattern?}';
    protected $description = 'List tables visible to the credential, optionally LIKE pattern. Read-only.';

    public function handle(): int
    {
        $conn = $this->argument('connection');
        $pat = $this->argument('pattern');

        if ($pat) {
            $rows = DB::connection($conn)->select(
                'SELECT table_name AS t FROM information_schema.tables '
                . 'WHERE table_schema = DATABASE() AND table_name LIKE ? '
                . 'ORDER BY table_name',
                [$pat]
            );
        } else {
            $rows = DB::connection($conn)->select(
                'SELECT table_name AS t FROM information_schema.tables '
                . 'WHERE table_schema = DATABASE() ORDER BY table_name'
            );
        }

        foreach ($rows as $r) {
            $this->line($r->t ?? $r->T);
        }
        $this->info(count($rows) . ' table(s).');
        return self::SUCCESS;
    }
}
