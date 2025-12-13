<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index()
    {
        $locations = Location::where('is_active', true)->get();

        return response()->json($locations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:locations,code',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $location = Location::create($validated);

        return response()->json($location, 201);
    }

    public function show(Location $location)
    {
        return response()->json($location->load(['faculties', 'buildings']));
    }

    public function update(Request $request, Location $location)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'code' => 'string|unique:locations,code,' . $location->id,
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'is_active' => 'boolean',
        ]);

        $location->update($validated);

        return response()->json($location);
    }

    public function destroy(Location $location)
    {
        $location->delete();

        return response()->json(['message' => 'Location deleted successfully']);
    }
}
