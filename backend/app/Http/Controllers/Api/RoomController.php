<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $query = Room::with(['building.faculty', 'category', 'assets']);

        if ($request->has('building_id')) {
            $query->where('building_id', $request->building_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('current_activity', 'like', "%{$search}%")
                    ->orWhereHas('building.faculty', function ($fq) use ($search) {
                        $fq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $rooms = $query->orderBy('name')->paginate($request->per_page ?? 15);

        // Add computed fields
        $rooms->getCollection()->transform(function ($room) {
            $room->faculty_name = $room->building?->faculty?->name ?? 'N/A';
            $room->building_name = $room->building?->name ?? 'N/A';
            return $room;
        });

        return response()->json($rooms);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:rooms,code',
            'building_id' => 'required|exists:buildings,id',
            'category_id' => 'nullable|exists:categories,id',
            'floor' => 'integer|min:1',
            'capacity' => 'integer|min:0',
            'area' => 'nullable|numeric',
            'status' => 'in:AVAILABLE,OCCUPIED,MAINTENANCE',
            'current_activity' => 'nullable|string',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
        ]);

        $room = Room::create($validated);

        return response()->json($room->load(['building.faculty', 'category']), 201);
    }

    public function show(Room $room)
    {
        return response()->json($room->load([
            'building.faculty',
            'category',
            'assets',
            'schedules' => function ($q) {
                $q->whereDate('date', today())->orderBy('start_time');
            }
        ]));
    }

    public function update(Request $request, Room $room)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'code' => 'string|unique:rooms,code,' . $room->id,
            'building_id' => 'exists:buildings,id',
            'category_id' => 'nullable|exists:categories,id',
            'floor' => 'integer|min:1',
            'capacity' => 'integer|min:0',
            'area' => 'nullable|numeric',
            'status' => 'in:AVAILABLE,OCCUPIED,MAINTENANCE',
            'current_activity' => 'nullable|string',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $room->update($validated);

        return response()->json($room->load(['building.faculty', 'category']));
    }

    public function destroy(Room $room)
    {
        $room->delete();

        return response()->json(['message' => 'Room deleted successfully']);
    }
}
