<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Room;
use App\Models\Asset;
use App\Models\Schedule;

class StatsController extends Controller
{
    public function index()
    {
        $stats = [
            'total_buildings' => Building::where('is_active', true)->count(),
            'total_rooms' => Room::where('is_active', true)->count(),
            'total_assets' => Asset::where('is_active', true)->count(),
            'rooms_available' => Room::where('status', 'AVAILABLE')->count(),
            'rooms_occupied' => Room::where('status', 'OCCUPIED')->count(),
            'rooms_maintenance' => Room::where('status', 'MAINTENANCE')->count(),
            'assets_good' => Asset::where('condition', 'Baik')->count(),
            'assets_damaged' => Asset::where('condition', 'Rusak')->count(),
            'assets_repair' => Asset::where('condition', 'Perbaikan')->count(),
            'today_schedules' => Schedule::whereDate('date', today())->count(),
            'total_land_area' => Building::sum('land_area'),
            'total_building_area' => Building::sum('building_area'),
        ];

        return response()->json($stats);
    }
}
