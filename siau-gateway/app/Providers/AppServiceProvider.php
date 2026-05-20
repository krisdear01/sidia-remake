<?php

namespace App\Providers;

use App\Database\ReadOnlyGuard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach (['siisyana_ro', 'sipirang_ro'] as $name) {
            ReadOnlyGuard::attach(DB::connection($name));
        }
    }
}
