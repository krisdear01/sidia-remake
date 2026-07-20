<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\Location;
use App\Models\RoomUtilization;
use Illuminate\Http\Request;

class RoomUtilizationController extends Controller
{
    public function index(Request $request)
    {
        $query = RoomUtilization::with(['faculty', 'location', 'building']);

        if ($request->filled('semester')) {
            $query->where('semester', $request->string('semester'));
        }

        if ($request->filled('session')) {
            $query->where('session', $request->string('session'));
        }

        if ($request->filled('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        if ($request->filled('faculty_id')) {
            $query->where('faculty_id', $request->faculty_id);
        }

        if ($request->filled('q')) {
            $query->where('gedung_name', 'like', '%' . $request->string('q') . '%');
        }

        return response()->json(
            $query->orderBy('faculty_name')->orderBy('gedung_name')->get()
        );
    }

    public function semesters()
    {
        $semesters = RoomUtilization::query()
            ->select('semester')
            ->distinct()
            ->orderByDesc('semester')
            ->pluck('semester');

        return response()->json($semesters);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'semester' => 'required|string|max:255',
            'session' => 'required|string|in:pagi,malam',
            'faculty_name' => 'required|string|max:255',
            'faculty_id' => 'nullable|exists:faculties,id',
            'campus_name' => 'required|string|max:255',
            'location_id' => 'nullable|exists:locations,id',
            'gedung_name' => 'required|string|max:255',
            'building_id' => 'nullable|exists:buildings,id',
            'room_count' => 'required|integer|min:0',
            'utilization_percent' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        $roomUtilization = RoomUtilization::create($validated);

        return response()->json($roomUtilization->load(['faculty', 'location', 'building']), 201);
    }

    public function show(RoomUtilization $roomUtilization)
    {
        return response()->json($roomUtilization->load(['faculty', 'location', 'building']));
    }

    public function update(Request $request, RoomUtilization $roomUtilization)
    {
        $validated = $request->validate([
            'semester' => 'string|max:255',
            'session' => 'string|in:pagi,malam',
            'faculty_name' => 'string|max:255',
            'faculty_id' => 'nullable|exists:faculties,id',
            'campus_name' => 'string|max:255',
            'location_id' => 'nullable|exists:locations,id',
            'gedung_name' => 'string|max:255',
            'building_id' => 'nullable|exists:buildings,id',
            'room_count' => 'integer|min:0',
            'utilization_percent' => 'numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        $roomUtilization->update($validated);

        return response()->json($roomUtilization->load(['faculty', 'location', 'building']));
    }

    public function destroy(RoomUtilization $roomUtilization)
    {
        $roomUtilization->delete();

        return response()->json(['message' => 'Room utilization deleted successfully']);
    }

    // Bulk import rows parsed client-side from the "Persentase Utilitas Pagi/Malam" xlsx sheets.
    public function import(Request $request)
    {
        $validated = $request->validate([
            'semester' => 'required|string|max:255',
            'session' => 'required|string|in:pagi,malam',
            'clear_existing' => 'nullable|boolean',
            'rows' => 'required|array',
            'rows.*.faculty_name' => 'required|string|max:255',
            'rows.*.campus_name' => 'required|string|max:255',
            'rows.*.gedung_name' => 'required|string|max:255',
            'rows.*.room_count' => 'required|integer|min:0',
            'rows.*.utilization_percent' => 'required|numeric|min:0|max:100',
            'rows.*.notes' => 'nullable|string',
        ]);

        $semester = $validated['semester'];
        $session = $validated['session'];
        $clearExisting = $validated['clear_existing'] ?? false;

        if ($clearExisting) {
            RoomUtilization::where('semester', $semester)
                ->where('session', $session)
                ->delete();
        }

        $imported = [];
        $errors = [];
        $index = 0;

        foreach ($validated['rows'] as $row) {
            $index++;

            try {
                $facultyId = Faculty::where('name', $row['faculty_name'])
                    ->orWhere('code', $row['faculty_name'])
                    ->value('id');

                $locationId = Location::where('name', 'like', '%' . $row['campus_name'] . '%')
                    ->orWhere('code', strtoupper($row['campus_name']))
                    ->value('id');

                $roomUtilization = RoomUtilization::create([
                    'semester' => $semester,
                    'session' => $session,
                    'faculty_name' => $row['faculty_name'],
                    'faculty_id' => $facultyId,
                    'campus_name' => $row['campus_name'],
                    'location_id' => $locationId,
                    'gedung_name' => $row['gedung_name'],
                    'room_count' => $row['room_count'],
                    'utilization_percent' => $row['utilization_percent'],
                    'notes' => $row['notes'] ?? null,
                ]);

                $imported[] = $roomUtilization;
            } catch (\Exception $e) {
                $errors[] = "Row {$index} ({$row['gedung_name']}): " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => 'Import completed',
            'imported_count' => count($imported),
            'error_count' => count($errors),
            'errors' => $errors,
            'rows' => collect($imported)->map(fn ($r) => [
                'id' => $r->id,
                'gedung_name' => $r->gedung_name,
            ]),
        ], count($imported) > 0 ? 201 : 400);
    }
}
