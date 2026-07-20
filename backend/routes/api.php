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
use App\Http\Controllers\Api\RoomUtilizationController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BidderAuthController;
use App\Http\Controllers\Api\AuctionController;
use App\Http\Controllers\Api\BidController;
use App\Http\Controllers\Api\AdminAuctionController;
use App\Http\Controllers\Api\SiauProxyController;
use App\Http\Controllers\Api\Admin\AdminSiauProxyController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// SIAU Gateway ADMIN proxy — Sanctum-gated, injects SIAU_ADMIN_TOKEN server-side.
// Browser MUST NOT know about this token. Routes mirror gateway /admin/identity-map/*.
Route::prefix('v1/admin/siau')
    ->middleware(['auth:sanctum', 'throttle:30,1'])
    ->group(function () {
        Route::get('/identity-map/unmatched', [AdminSiauProxyController::class, 'unmatched']);
        Route::post('/identity-map/resync', [AdminSiauProxyController::class, 'resync']);
        Route::put('/identity-map/{siisyanaId}', [AdminSiauProxyController::class, 'updateMapping'])
            ->where('siisyanaId', '[0-9]+');

        // Hibah assets (BETA)
        Route::post('/hibah-assets', [AdminSiauProxyController::class, 'createHibahAsset']);
        Route::delete('/hibah-assets/{id}', [AdminSiauProxyController::class, 'deleteHibahAsset'])
            ->where('id', '[0-9]+');

        // Room visibility (is_public toggle)
        Route::put('/rooms/{id}/visibility', [AdminSiauProxyController::class, 'updateRoomVisibility'])
            ->where('id', '[0-9]+');

        // Daftar Barang Ruangan (DBR) — printable BMN export
        Route::get('/rooms/{id}/dbr', [AdminSiauProxyController::class, 'roomDbr'])
            ->where('id', '[0-9]+');
    });

// SIAU Gateway proxy (read-only, public, no auth — forwards to siau-gateway)
Route::prefix('v1/siau')->middleware(['throttle:60,1'])->group(function () {
    Route::get('/health', [SiauProxyController::class, 'health']);
    Route::get('/buildings', [SiauProxyController::class, 'buildings']);
    Route::get('/buildings/{id}', [SiauProxyController::class, 'building'])->where('id', '[0-9]+');
    Route::get('/search', [SiauProxyController::class, 'search']);
    Route::get('/gedung-polygons', [SiauProxyController::class, 'gedungPolygons']);
    Route::get('/land', [SiauProxyController::class, 'land']);
    Route::get('/land/{id}', [SiauProxyController::class, 'landDetail'])->where('id', '[0-9]+');
    Route::get('/rooms', [SiauProxyController::class, 'rooms']);
    Route::get('/rooms/{id}', [SiauProxyController::class, 'room'])->where('id', '[0-9]+');
    Route::get('/rooms/{id}/assets', [SiauProxyController::class, 'roomAssets'])->where('id', '[0-9]+');

    Route::middleware('throttle:30,1')->group(function () {
        Route::get('/rooms/{id}/schedule', [SiauProxyController::class, 'schedule'])->where('id', '[0-9]+');
        Route::get('/rooms/{id}/availability', [SiauProxyController::class, 'availability'])->where('id', '[0-9]+');
    });
});

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

    // Auth — throttled to deter brute-force
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    // ==================== E-LELANG PUBLIC ROUTES ====================

    // Auctions (public listing)
    Route::get('/auctions', [AuctionController::class, 'index']);
    Route::get('/auctions/{id}', [AuctionController::class, 'show']);
    Route::get('/auctions/{id}/bids', [AuctionController::class, 'bids']);

    // Facilities (public listing)
    Route::get('/facilities', [AuctionController::class, 'facilities']);
    Route::get('/facilities/{id}/availability', [AuctionController::class, 'facilityAvailability']);

    // Bidder Auth (public)
    Route::post('/bidder/register', [BidderAuthController::class, 'register']);
    Route::post('/bidder/login', [BidderAuthController::class, 'login']);
    Route::get('/bidder/verify-email/{token}', [BidderAuthController::class, 'verifyEmail']);
});

// ==================== BIDDER PROTECTED ROUTES ====================
Route::prefix('v1/bidder')->middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [BidderAuthController::class, 'logout']);
    Route::get('/profile', [BidderAuthController::class, 'profile']);
    Route::put('/profile', [BidderAuthController::class, 'updateProfile']);
    Route::post('/resend-verification', [BidderAuthController::class, 'resendVerification']);

    // Deposits
    Route::post('/auctions/{id}/deposit', [BidController::class, 'submitDeposit']);
    Route::get('/my-deposits', [BidController::class, 'myDeposits']);

    // Bidding
    Route::post('/auctions/{id}/bid', [BidController::class, 'placeBid']);
    Route::get('/my-bids', [BidController::class, 'myBids']);

    // Facility Bookings
    Route::post('/facilities/{id}/book', [BidController::class, 'bookFacility']);
    Route::get('/my-bookings', [BidController::class, 'myBookings']);
    Route::post('/bookings/{id}/cancel', [BidController::class, 'cancelBooking']);
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

    // Room Utilizations — admin-only report data, no public routes
    Route::get('/room-utilizations/semesters', [RoomUtilizationController::class, 'semesters']);
    Route::post('/room-utilizations/import', [RoomUtilizationController::class, 'import']);
    Route::apiResource('room-utilizations', RoomUtilizationController::class);

    // ==================== E-LELANG ADMIN ROUTES ====================

    // Auction Management
    Route::get('/auctions', [AdminAuctionController::class, 'index']);
    Route::post('/auctions', [AdminAuctionController::class, 'store']);
    Route::put('/auctions/{id}', [AdminAuctionController::class, 'update']);
    Route::delete('/auctions/{id}', [AdminAuctionController::class, 'destroy']);
    Route::put('/auctions/{id}/status', [AdminAuctionController::class, 'updateStatus']);
    Route::post('/auctions/{id}/determine-winner', [AdminAuctionController::class, 'determineWinner']);

    // Bidder Management
    Route::get('/bidders', [AdminAuctionController::class, 'bidders']);
    Route::get('/bidders/{id}', [AdminAuctionController::class, 'bidderShow']);
    Route::put('/bidders/{id}/verify', [AdminAuctionController::class, 'verifyBidder']);

    // Deposit Management
    Route::get('/deposits', [AdminAuctionController::class, 'deposits']);
    Route::put('/deposits/{id}/verify', [AdminAuctionController::class, 'verifyDeposit']);
    Route::post('/deposits/{id}/refund', [AdminAuctionController::class, 'refundDeposit']);

    // Facility Booking Management
    Route::get('/facility-bookings', [AdminAuctionController::class, 'facilityBookings']);
    Route::put('/facility-bookings/{id}/status', [AdminAuctionController::class, 'updateBookingStatus']);
    Route::post('/facility-bookings/{id}/complete', [AdminAuctionController::class, 'completeBooking']);
});

