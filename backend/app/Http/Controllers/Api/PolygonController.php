<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Polygon;
use Illuminate\Http\Request;

class PolygonController extends Controller
{
    public function index(Request $request)
    {
        $query = Polygon::with(['building', 'faculty', 'location'])
            ->where('is_active', true);

        if ($request->has('faculty_id')) {
            $query->where('faculty_id', $request->faculty_id);
        }

        if ($request->has('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        $polygons = $query->get();

        return response()->json($polygons);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'building_id' => 'nullable|exists:buildings,id',
            'faculty_id' => 'nullable|exists:faculties,id',
            'location_id' => 'nullable|exists:locations,id',
            'geojson' => 'required|array',
            'fill_color' => 'string|max:7',
            'stroke_color' => 'string|max:7',
            'fill_opacity' => 'numeric|min:0|max:1',
            'land_area' => 'nullable|numeric',
            'description' => 'nullable|string',
        ]);

        $polygon = Polygon::create($validated);

        return response()->json($polygon->load(['building', 'faculty', 'location']), 201);
    }

    public function show(Polygon $polygon)
    {
        return response()->json($polygon->load(['building', 'faculty', 'location']));
    }

    public function update(Request $request, Polygon $polygon)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'building_id' => 'nullable|exists:buildings,id',
            'faculty_id' => 'nullable|exists:faculties,id',
            'location_id' => 'nullable|exists:locations,id',
            'geojson' => 'array',
            'fill_color' => 'string|max:7',
            'stroke_color' => 'string|max:7',
            'fill_opacity' => 'numeric|min:0|max:1',
            'land_area' => 'nullable|numeric',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $polygon->update($validated);

        return response()->json($polygon->load(['building', 'faculty', 'location']));
    }

    public function destroy(Polygon $polygon)
    {
        $polygon->delete();

        return response()->json(['message' => 'Polygon deleted successfully']);
    }

    // Get all polygons as GeoJSON FeatureCollection
    public function geojson(Request $request)
    {
        $query = Polygon::with(['building', 'faculty'])
            ->where('is_active', true);

        if ($request->has('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        $polygons = $query->get();

        $features = $polygons->map(function ($polygon) {
            return [
                'type' => 'Feature',
                'geometry' => $polygon->geojson,
                'properties' => [
                    'id' => $polygon->id,
                    'name' => $polygon->name,
                    'building' => $polygon->building?->name,
                    'faculty' => $polygon->faculty?->name,
                    'fill_color' => $polygon->fill_color,
                    'stroke_color' => $polygon->stroke_color,
                    'fill_opacity' => $polygon->fill_opacity,
                    'land_area' => $polygon->land_area,
                ],
            ];
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }
}
