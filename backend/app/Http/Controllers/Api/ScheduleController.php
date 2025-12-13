<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Room;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::with(['room.building.faculty']);

        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        } else {
            // Default to today
            $query->whereDate('date', today());
        }

        $schedules = $query->orderBy('start_time')->get();

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'subject' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'lecturer' => 'nullable|string|max:255',
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'day_of_week' => 'nullable|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
            'is_recurring' => 'boolean',
        ]);

        $schedule = Schedule::create($validated);

        // Update room status if schedule is active now
        if ($schedule->isActive()) {
            $schedule->room->update([
                'status' => 'OCCUPIED',
                'current_activity' => $schedule->subject,
            ]);
        }

        return response()->json($schedule->load('room'), 201);
    }

    public function show(Schedule $schedule)
    {
        return response()->json($schedule->load(['room.building.faculty']));
    }

    public function update(Request $request, Schedule $schedule)
    {
        $validated = $request->validate([
            'room_id' => 'exists:rooms,id',
            'subject' => 'string|max:255',
            'department' => 'nullable|string|max:255',
            'lecturer' => 'nullable|string|max:255',
            'date' => 'date',
            'start_time' => 'date_format:H:i',
            'end_time' => 'date_format:H:i|after:start_time',
            'day_of_week' => 'nullable|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
            'is_recurring' => 'boolean',
        ]);

        $schedule->update($validated);

        return response()->json($schedule->load('room'));
    }

    public function destroy(Schedule $schedule)
    {
        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted successfully']);
    }

    // Sync with SIPIRANG (mock implementation)
    public function syncWithSipirang(Request $request)
    {
        // TODO: Replace with actual SIPIRANG API integration
        // This is a mock implementation

        $mockSchedules = [
            [
                'room_code' => 'R301',
                'subject' => 'Kalkulus II',
                'department' => 'Prodi Teknik Informatika',
                'lecturer' => 'Dr. I Wayan Test',
                'date' => today()->toDateString(),
                'start_time' => '08:00',
                'end_time' => '10:00',
                'sipirang_id' => 'SIP-001',
            ],
            [
                'room_code' => 'R301',
                'subject' => 'Praktikum Algoritma',
                'department' => 'Prodi Teknik Informatika',
                'lecturer' => 'I Made Sample',
                'date' => today()->toDateString(),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'sipirang_id' => 'SIP-002',
            ],
        ];

        $synced = 0;
        foreach ($mockSchedules as $mockSchedule) {
            $room = Room::where('code', $mockSchedule['room_code'])->first();
            if (!$room)
                continue;

            Schedule::updateOrCreate(
                ['sipirang_id' => $mockSchedule['sipirang_id']],
                [
                    'room_id' => $room->id,
                    'subject' => $mockSchedule['subject'],
                    'department' => $mockSchedule['department'],
                    'lecturer' => $mockSchedule['lecturer'],
                    'date' => $mockSchedule['date'],
                    'start_time' => $mockSchedule['start_time'],
                    'end_time' => $mockSchedule['end_time'],
                ]
            );
            $synced++;
        }

        return response()->json([
            'message' => "Synced {$synced} schedules from SIPIRANG",
            'synced_count' => $synced,
        ]);
    }
}
