<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class InspectSchema extends Command
{
    protected $signature = 'siau:inspect {connection} {tables*}';
    protected $description = 'Read-only describe of named tables. SELECTs from information_schema only.';

    public function handle(): int
    {
        $conn = $this->argument('connection');
        foreach ($this->argument('tables') as $t) {
            $cols = DB::connection($conn)->select(
                'SELECT column_name, data_type, is_nullable, column_key '
                . 'FROM information_schema.columns '
                . 'WHERE table_schema = DATABASE() AND table_name = ? '
                . 'ORDER BY ordinal_position',
                [$t]
            );
            $this->line("== {$t} (" . count($cols) . " cols) ==");
            if (empty($cols)) {
                $this->warn("  (no such table or no SELECT grant)");
                continue;
            }
            foreach ($cols as $c) {
                $this->line(sprintf('  %-32s %-12s %s %s',
                    $c->column_name ?? $c->COLUMN_NAME,
                    $c->data_type ?? $c->DATA_TYPE,
                    ($c->is_nullable ?? $c->IS_NULLABLE) === 'YES' ? 'NULL' : 'NOT NULL',
                    $c->column_key ?? $c->COLUMN_KEY ?: ''
                ));
            }
        }
        return self::SUCCESS;
    }
}
