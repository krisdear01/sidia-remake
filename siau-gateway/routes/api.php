<?php

use App\Http\Controllers\Admin\HibahAssetController;
use App\Http\Controllers\Admin\RoomDbrController;
use App\Http\Controllers\Admin\RoomIdentityMapController;
use App\Http\Controllers\Admin\RoomVisibilityController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\GedungPolygonController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\LandController;
use App\Http\Controllers\Api\V1\RoomAssetsController;
use App\Http\Controllers\Api\V1\RoomAvailabilityController;
use App\Http\Controllers\Api\V1\RoomController;
use App\Http\Controllers\Api\V1\RoomScheduleController;
use App\Http\Controllers\Api\V1\StatsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->middleware(['siau.jsonproblem', 'siau.strippii'])
    ->group(function (): void {

        Route::get('/health', [HealthController::class, 'public'])
            ->middleware('siau.cache:30,30');

        Route::middleware(['siau.ratelimit:public,' . config('siau.rate_limits.public_per_minute', 60)])
            ->group(function (): void {
                // s-maxage matches the internal TTL so a CDN absorbs the same
                // window the gateway caches for. browser max-age is small so
                // private clients still pick up changes quickly.
                Route::get('/stats', [StatsController::class, 'index'])
                    ->middleware('siau.cache:3600,60');
                Route::get('/buildings', [BuildingController::class, 'index'])
                    ->middleware('siau.cache:86400,60');
                Route::get('/buildings/{id}', [BuildingController::class, 'show'])
                    ->middleware('siau.cache:21600,60');
                Route::get('/gedung-polygons', [GedungPolygonController::class, 'index'])
                    ->middleware('siau.cache:86400,60');
                Route::get('/land', [LandController::class, 'index'])
                    ->middleware('siau.cache:86400,60');
                Route::get('/land/{id}', [LandController::class, 'show'])
                    ->middleware('siau.cache:21600,60');
                Route::get('/rooms', [RoomController::class, 'index'])
                    ->middleware('siau.cache:21600,60');
                Route::get('/rooms/{id}', [RoomController::class, 'show'])
                    ->middleware('siau.cache:21600,60');
                Route::get('/rooms/{id}/assets', [RoomAssetsController::class, 'index'])
                    ->middleware('siau.cache:3600,60');

                Route::middleware(['siau.ratelimit:schedule,' . config('siau.rate_limits.schedule_per_minute', 30)])
                    ->group(function (): void {
                        Route::get('/rooms/{id}/schedule', [RoomScheduleController::class, 'index'])
                            ->middleware('siau.cache:300,30');
                        Route::get('/rooms/{id}/availability', [RoomAvailabilityController::class, 'show'])
                            ->middleware('siau.cache:60,15');
                    });
            });

        Route::prefix('admin')
            ->middleware(['siau.admin'])
            ->group(function (): void {
                Route::get('/health', [HealthController::class, 'admin']);

                Route::get('/identity-map/unmatched', [RoomIdentityMapController::class, 'unmatched']);
                Route::post('/identity-map/resync', [RoomIdentityMapController::class, 'resync']);
                Route::put('/identity-map/{siisyanaId}', [RoomIdentityMapController::class, 'update']);

                // Hibah assets (BETA) — local-only asset records that augment SIISYANA.
                Route::post('/hibah-assets', [HibahAssetController::class, 'store']);
                Route::delete('/hibah-assets/{id}', [HibahAssetController::class, 'destroy'])
                    ->where('id', '[0-9]+');

                // Room visibility (is_public). Default public; admin can flip
                // to private to gate schedule/availability for non-admin callers.
                Route::put('/rooms/{id}/visibility', [RoomVisibilityController::class, 'update'])
                    ->where('id', '[0-9]+');

                // Daftar Barang Ruangan (DBR) — printable BMN export.
                Route::get('/rooms/{id}/dbr', [RoomDbrController::class, 'show'])
                    ->where('id', '[0-9]+');
            });
    });
