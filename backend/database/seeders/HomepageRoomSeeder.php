<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;
use App\Models\Schedule;
use Carbon\Carbon;
use Faker\Factory as Faker;

class HomepageRoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create('id_ID');

        // Specific rooms shown on homepage
        $targetRooms = [
            'Ruang Kelas 3.02 FT' => [
                'department' => 'Prodi Teknik Sipil',
                'subjects' => ['Mekanika Bahan', 'Struktur Baja', 'Hidrologi']
            ],
            'Ruang Meeting Ekonomi A' => [
                'department' => 'Prodi Ekonomi Pembangunan',
                'subjects' => ['Rapat Koordinasi Dosen', 'Sidang Skripsi', 'Evaluasi Kurikulum']
            ],
            'Ruang Rapat Fakultas Teknik' => [
                'department' => 'Fakultas Teknik',
                'subjects' => ['Rapat Pimpinan', 'Workshop Akreditasi', 'Kunjungan Industri']
            ],
            'Ruang Rapat Hukum' => [
                'department' => 'Fakultas Hukum',
                'subjects' => ['Simulasi Sidang', 'Diskusi Bedah Kasus', 'Seminar Hukum Adat']
            ],
            'Ruang Rapat Utama Rektorat' => [
                'department' => 'Rektorat',
                'subjects' => ['Rapat Koordinasi Universitas', 'Sosialisasi Kebijakan Baru', 'Review Anggaran']
            ]
        ];

        $today = Carbon::today();

        foreach ($targetRooms as $roomName => $data) {
            $room = Room::where('name', $roomName)->first();

            if (!$room) {
                $this->command->warn("Room {$roomName} not found. Skipping.");
                continue;
            }

            // Planner: Add schedules for today afternoon and tomorrow
            $schedules = [];

            // 1. Today Afternoon (13:00 - 15:00)
            $schedules[] = [
                'start_time' => '13:00',
                'end_time' => '15:00',
                'date' => $today->toDateString(),
                'subject' => $faker->randomElement($data['subjects']),
            ];

            // 2. Today Late Afternoon (16:00 - 18:00)
            $schedules[] = [
                'start_time' => '16:00',
                'end_time' => '18:00',
                'date' => $today->toDateString(),
                'subject' => $faker->randomElement($data['subjects']),
            ];

            // 3. Tomorrow Morning (08:00 - 10:00)
            $tomorrow = $today->copy()->addDay();
            $schedules[] = [
                'start_time' => '08:00',
                'end_time' => '10:00',
                'date' => $tomorrow->toDateString(),
                'subject' => $data['subjects'][0] ?? 'Meeting',
            ];

            // 4. Tomorrow Afternoon (13:00 - 15:00)
            $schedules[] = [
                'start_time' => '13:00',
                'end_time' => '15:00',
                'date' => $tomorrow->toDateString(),
                'subject' => $data['subjects'][1] ?? 'Workshop',
            ];

            foreach ($schedules as $sched) {
                // Check for overlapping schedules to avoid collision with existing data
                $exists = Schedule::where('room_id', $room->id)
                    ->where('date', $sched['date'])
                    ->where(function ($q) use ($sched) {
                        $q->whereBetween('start_time', [$sched['start_time'], $sched['end_time']])
                            ->orWhereBetween('end_time', [$sched['start_time'], $sched['end_time']])
                            ->orWhere(function ($subQ) use ($sched) {
                                $subQ->where('start_time', '<=', $sched['start_time'])
                                    ->where('end_time', '>=', $sched['end_time']);
                            });
                    })
                    ->exists();

                if (!$exists) {
                    Schedule::create([
                        'room_id' => $room->id,
                        'subject' => $sched['subject'],
                        'department' => $data['department'],
                        'lecturer' => $faker->title . ' ' . $faker->name,
                        'date' => $sched['date'],
                        'start_time' => $sched['start_time'],
                        'end_time' => $sched['end_time'],
                        'day_of_week' => Carbon::parse($sched['date'])->locale('id')->dayName,
                        'is_recurring' => false,
                        'sipirang_id' => 'MOCK-' . strtoupper($faker->bothify('??####')),
                    ]);
                    $this->command->info("Added schedule for {$roomName} on {$sched['date']} at {$sched['start_time']}");
                } else {
                    $this->command->info("Skipped overlapping schedule for {$roomName} on {$sched['date']}");
                }
            }
        }
    }
}
