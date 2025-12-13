<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\Request;

class BuildingController extends Controller
{
    public function index(Request $request)
    {
        $query = Building::with(['faculty', 'location', 'category']);

        if ($request->has('faculty_id')) {
            $query->where('faculty_id', $request->faculty_id);
        }

        if ($request->has('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $buildings = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return response()->json($buildings);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:buildings,code',
            'faculty_id' => 'nullable|exists:faculties,id',
            'location_id' => 'nullable|exists:locations,id',
            'category_id' => 'nullable|exists:categories,id',
            'floors' => 'integer|min:1',
            'land_area' => 'nullable|numeric',
            'building_area' => 'nullable|numeric',
            'year_built' => 'nullable|digits:4',
            'condition' => 'in:Baik,Rusak Ringan,Rusak Berat',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
        ]);

        $building = Building::create($validated);

        return response()->json($building->load(['faculty', 'location', 'category']), 201);
    }

    public function show(Building $building)
    {
        return response()->json($building->load(['faculty', 'location', 'category', 'rooms', 'polygon']));
    }

    public function update(Request $request, Building $building)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'code' => 'string|unique:buildings,code,' . $building->id,
            'faculty_id' => 'nullable|exists:faculties,id',
            'location_id' => 'nullable|exists:locations,id',
            'category_id' => 'nullable|exists:categories,id',
            'floors' => 'integer|min:1',
            'land_area' => 'nullable|numeric',
            'building_area' => 'nullable|numeric',
            'year_built' => 'nullable|digits:4',
            'condition' => 'in:Baik,Rusak Ringan,Rusak Berat',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $building->update($validated);

        return response()->json($building->load(['faculty', 'location', 'category']));
    }

    public function destroy(Building $building)
    {
        $building->delete();

        return response()->json(['message' => 'Building deleted successfully']);
    }
}
