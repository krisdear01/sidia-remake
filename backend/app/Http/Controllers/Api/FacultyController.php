<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use Illuminate\Http\Request;

class FacultyController extends Controller
{
    public function index()
    {
        $faculties = Faculty::with('location')->get();

        return response()->json($faculties);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:faculties,code',
            'color' => 'string|max:7',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $faculty = Faculty::create($validated);

        return response()->json($faculty->load('location'), 201);
    }

    public function show(Faculty $faculty)
    {
        return response()->json($faculty->load(['location', 'buildings']));
    }

    public function update(Request $request, Faculty $faculty)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'code' => 'string|unique:faculties,code,' . $faculty->id,
            'color' => 'string|max:7',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $faculty->update($validated);

        return response()->json($faculty->load('location'));
    }

    public function destroy(Faculty $faculty)
    {
        $faculty->delete();

        return response()->json(['message' => 'Faculty deleted successfully']);
    }
}
