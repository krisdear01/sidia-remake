<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with(['room.building', 'building', 'category']);

        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->has('building_id')) {
            $query->where('building_id', $request->building_id);
        }

        if ($request->has('condition')) {
            $query->where('condition', $request->condition);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%");
            });
        }

        $assets = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return response()->json($assets);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:assets,code',
            'brand' => 'nullable|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'building_id' => 'nullable|exists:buildings,id',
            'category_id' => 'nullable|exists:categories,id',
            'quantity' => 'integer|min:1',
            'condition' => 'in:Baik,Rusak,Perbaikan',
            'acquisition_year' => 'nullable|digits:4',
            'acquisition_value' => 'nullable|numeric',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
        ]);

        $asset = Asset::create($validated);

        return response()->json($asset->load(['room', 'building', 'category']), 201);
    }

    public function show(Asset $asset)
    {
        return response()->json($asset->load(['room.building', 'building', 'category']));
    }

    public function update(Request $request, Asset $asset)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'code' => 'string|unique:assets,code,' . $asset->id,
            'brand' => 'nullable|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'building_id' => 'nullable|exists:buildings,id',
            'category_id' => 'nullable|exists:categories,id',
            'quantity' => 'integer|min:1',
            'condition' => 'in:Baik,Rusak,Perbaikan',
            'acquisition_year' => 'nullable|digits:4',
            'acquisition_value' => 'nullable|numeric',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $asset->update($validated);

        return response()->json($asset->load(['room', 'building', 'category']));
    }

    public function destroy(Asset $asset)
    {
        $asset->delete();

        return response()->json(['message' => 'Asset deleted successfully']);
    }
}
