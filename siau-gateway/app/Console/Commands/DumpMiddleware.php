<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;

class DumpMiddleware extends Command
{
    protected $signature = 'siau:dump-middleware';
    protected $description = 'Print the middleware stack for each /api/v1 route.';

    public function handle(): int
    {
        foreach (Route::getRoutes() as $r) {
            $uri = $r->uri();
            if (!str_starts_with($uri, 'api/v1/')) continue;
            $this->line($uri);
            foreach ($r->gatherMiddleware() as $m) {
                $this->line('  - ' . $m);
            }
        }
        return self::SUCCESS;
    }
}
