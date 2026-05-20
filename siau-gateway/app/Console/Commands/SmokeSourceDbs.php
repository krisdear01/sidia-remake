<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class SmokeSourceDbs extends Command
{
    protected $signature = 'siau:smoke {--write : Also attempt a write to prove ReadOnlyGuard blocks it}';

    protected $description = 'Read-only smoke test against SIISYANA + SIPIRANG. Touches nothing.';

    public function handle(): int
    {
        $ok = true;

        foreach (['siisyana_ro', 'sipirang_ro'] as $name) {
            $this->line("== {$name} ==");

            try {
                $row = DB::connection($name)->select('SELECT 1 AS ok')[0] ?? null;
                $this->info("  SELECT 1   → ok={$row->ok}");
            } catch (Throwable $e) {
                $ok = false;
                $this->error("  SELECT 1   FAILED: " . $this->scrub($e->getMessage()));
                continue;
            }

            try {
                $count = DB::connection($name)->select('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()')[0]->c ?? null;
                $this->info("  Tables visible to credential: {$count}");
            } catch (Throwable $e) {
                $ok = false;
                $this->error("  table count FAILED: " . $this->scrub($e->getMessage()));
            }

            if ($this->option('write')) {
                $this->line("  Attempting INSERT (should be blocked by ReadOnlyGuard, never reaches the DB)…");
                try {
                    DB::connection($name)->statement(
                        "INSERT INTO __siau_should_never_exist (id) VALUES (1)"
                    );
                    $this->error("  ✗ ReadOnlyGuard DID NOT block the write. Aborting.");
                    return self::FAILURE;
                } catch (\RuntimeException $e) {
                    if (str_contains($e->getMessage(), 'ReadOnlyGuard')) {
                        $this->info("  ✓ ReadOnlyGuard blocked it: " . $e->getMessage());
                    } else {
                        $ok = false;
                        $this->error("  ✗ Unexpected RuntimeException: " . $e->getMessage());
                    }
                } catch (Throwable $e) {
                    $ok = false;
                    $this->error("  ✗ Unexpected exception (NOT from guard): " . $this->scrub($e->getMessage()));
                }
            }
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    private function scrub(string $msg): string
    {
        // Defensive: do not echo passwords if PDO ever puts them in messages.
        $msg = preg_replace('/password=[^ ;]+/i', 'password=<redacted>', $msg) ?? $msg;
        $msg = preg_replace('/(user(name)?=)[^ ;]+/i', '$1<redacted>', $msg) ?? $msg;
        return $msg;
    }
}
