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

    // Import GeoJSON FeatureCollection
    public function importGeoJson(Request $request)
    {
        $validated = $request->validate([
            'geojson' => 'required|array',
            'geojson.type' => 'required|string|in:FeatureCollection',
            'geojson.features' => 'required|array',
            'location_id' => 'nullable|exists:locations,id',
            'faculty_id' => 'nullable|exists:faculties,id',
            'default_fill_color' => 'nullable|string|max:7',
            'default_stroke_color' => 'nullable|string|max:7',
            'default_fill_opacity' => 'nullable|numeric|min:0|max:1',
            'clear_existing' => 'nullable|boolean',
        ]);

        $geojson = $validated['geojson'];
        $locationId = $validated['location_id'] ?? null;
        $facultyId = $validated['faculty_id'] ?? null;
        $defaultFillColor = $validated['default_fill_color'] ?? '#3b82f6';
        $defaultStrokeColor = $validated['default_stroke_color'] ?? '#1d4ed8';
        $defaultFillOpacity = $validated['default_fill_opacity'] ?? 0.4;
        $clearExisting = $validated['clear_existing'] ?? false;

        // Optionally clear existing polygons
        if ($clearExisting) {
            Polygon::query()->delete();
        }

        $imported = [];
        $errors = [];
        $index = 0;

        foreach ($geojson['features'] as $feature) {
            $index++;
            
            try {
                // Skip features without geometry
                if (empty($feature['geometry'])) {
                    $errors[] = "Feature {$index}: Missing geometry, skipped.";
                    continue;
                }

                $geometry = $feature['geometry'];
                $properties = $feature['properties'] ?? [];

                // Generate name from properties or use index
                $name = $properties['name'] 
                    ?? $properties['NAME'] 
                    ?? $properties['NO.SHP'] 
                    ?? $properties['id'] 
                    ?? "Polygon {$index}";

                // Calculate approximate land area from coordinates if not provided
                $landArea = $properties['land_area'] ?? $properties['area'] ?? null;

                $polygon = Polygon::create([
                    'name' => $name,
                    'geojson' => $geometry,
                    'location_id' => $locationId,
                    'faculty_id' => $facultyId,
                    'fill_color' => $properties['fill_color'] ?? $defaultFillColor,
                    'stroke_color' => $properties['stroke_color'] ?? $defaultStrokeColor,
                    'fill_opacity' => $properties['fill_opacity'] ?? $defaultFillOpacity,
                    'land_area' => $landArea,
                    'description' => $properties['description'] ?? null,
                    'is_active' => true,
                ]);

                $imported[] = $polygon;
            } catch (\Exception $e) {
                $errors[] = "Feature {$index}: " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => 'Import completed',
            'imported_count' => count($imported),
            'error_count' => count($errors),
            'errors' => $errors,
            'polygons' => collect($imported)->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
            ]),
        ], count($imported) > 0 ? 201 : 400);
    }

    // Delete all polygons
    public function deleteAll()
    {
        $count = Polygon::count();
        Polygon::query()->delete();

        return response()->json([
            'message' => "Deleted {$count} polygons",
            'deleted_count' => $count,
        ]);
    }
}
