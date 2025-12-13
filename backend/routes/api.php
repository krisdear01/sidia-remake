<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BuildingController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\PolygonController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\FacultyController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\AuthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes (no auth required)
Route::prefix('v1')->group(function () {
    // Stats
    Route::get('/stats', [StatsController::class, 'index']);

    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);

    // Locations
    Route::get('/locations', [LocationController::class, 'index']);
    Route::get('/locations/{location}', [LocationController::class, 'show']);

    // Faculties
    Route::get('/faculties', [FacultyController::class, 'index']);
    Route::get('/faculties/{faculty}', [FacultyController::class, 'show']);

    // Buildings
    Route::get('/buildings', [BuildingController::class, 'index']);
    Route::get('/buildings/{building}', [BuildingController::class, 'show']);

    // Rooms
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{room}', [RoomController::class, 'show']);

    // Assets
    Route::get('/assets', [AssetController::class, 'index']);
    Route::get('/assets/{asset}', [AssetController::class, 'show']);

    // Polygons
    Route::get('/polygons', [PolygonController::class, 'index']);
    Route::get('/polygons/geojson', [PolygonController::class, 'geojson']);
    Route::get('/polygons/{polygon}', [PolygonController::class, 'show']);

    // Schedules
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/{schedule}', [ScheduleController::class, 'show']);

    // Auth
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Protected routes (admin only)
Route::prefix('v1/admin')->middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Categories CRUD
    Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);

    // Locations CRUD
    Route::apiResource('locations', LocationController::class)->except(['index', 'show']);

    // Faculties CRUD
    Route::apiResource('faculties', FacultyController::class)->except(['index', 'show']);

    // Buildings CRUD
    Route::apiResource('buildings', BuildingController::class)->except(['index', 'show']);

    // Rooms CRUD
    Route::apiResource('rooms', RoomController::class)->except(['index', 'show']);

    // Assets CRUD
    Route::apiResource('assets', AssetController::class)->except(['index', 'show']);

    // Polygons CRUD
    Route::apiResource('polygons', PolygonController::class)->except(['index', 'show']);
    Route::post('/polygons/import', [PolygonController::class, 'importGeoJson']);
    Route::delete('/polygons/delete-all', [PolygonController::class, 'deleteAll']);

    // Schedules CRUD
    Route::apiResource('schedules', ScheduleController::class)->except(['index', 'show']);
    Route::post('/schedules/sync-sipirang', [ScheduleController::class, 'syncWithSipirang']);
});
