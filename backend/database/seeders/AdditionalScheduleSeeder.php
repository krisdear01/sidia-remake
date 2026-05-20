<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;
use App\Models\Schedule;
use Carbon\Carbon;
use Faker\Factory as Faker;

class AdditionalScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create('id_ID');
        $rooms = Room::all();

        if ($rooms->isEmpty()) {
            $this->command->info('No rooms found. Skipping schedule seeding.');
            return;
        }

        $departments = [
            'Prodi Teknik Informatika',
            'Prodi Teknik Sipil',
            'Prodi Teknik Elektro',
            'Prodi Manajemen',
            'Prodi Akuntansi',
            'Prodi Ilmu Hukum',
            'Prodi Kedokteran Umum',
            'Prodi Kedokteran Gigi',
            'Prodi Biologi',
            'Prodi Kimia',
            'Prodi Fisika'
        ];

        $subjectsByDept = [
            'Prodi Teknik Informatika' => ['Pemrograman Web', 'Kecerdasan Buatan', 'Jaringan Komputer', 'Basis Data', 'Algoritma'],
            'Prodi Teknik Sipil' => ['Mekanika Tanah', 'Struktur Beton', 'Hidrolika', 'Manajemen Konstruksi'],
            'Prodi Teknik Elektro' => ['Rangkaian Listrik', 'Elektronika Digital', 'Sistem Kendali', 'Telekomunikasi'],
            'Prodi Manajemen' => ['Manajemen Pemasaran', 'Manajemen SDM', 'Perilaku Organisasi', 'Kewirausahaan'],
            'Prodi Akuntansi' => ['Akuntansi Dasar', 'Perpajakan', 'Auditing', 'Sistem Informasi Akuntansi'],
            'Prodi Ilmu Hukum' => ['Hukum Pidana', 'Hukum Perdata', 'Hukum Tata Negara', 'Hukum Internasional'],
            'Prodi Kedokteran Umum' => ['Anatomi', 'Fisiologi', 'Patologi', 'Farmakologi'],
            'Prodi Kedokteran Gigi' => ['Biomaterial Kedokteran Gigi', 'Radiologi Kedokteran Gigi', 'Konservasi Gigi'],
            'Prodi Biologi' => ['Biologi Umum', 'Genetika', 'Ekologi', 'Mikrobiologi'],
            'Prodi Kimia' => ['Kimia Dasar', 'Kimia Organik', 'Kimia Analitik', 'Biokimia'],
            'Prodi Fisika' => ['Fisika Dasar', 'Mekanika Kuantum', 'Termodinamika', 'Fisika Zat Padat'],
        ];

        $startDate = Carbon::today();
        $daysToSeed = 14; // Seed for the next 2 weeks

        foreach ($rooms as $room) {
            // Determine department based on building/faculty (approximation)
            // Just picking a random department for variety if logical matching is too complex for this snippet
            $dept = $faker->randomElement($departments);
            $subjects = $subjectsByDept[$dept] ?? ['Kuliah Umum'];

            for ($i = 0; $i < $daysToSeed; $i++) {
                $date = $startDate->copy()->addDays($i);

                // Skip Sundays
                if ($date->dayOfWeek === Carbon::SUNDAY) {
                    continue;
                }

                // Create 2-3 schedules per day per room
                $dailySlots = rand(1, 3);
                $startHour = 8;

                for ($j = 0; $j < $dailySlots; $j++) {
                    $duration = rand(2, 4); // 2 to 4 hours
                    $startTime = Carbon::createFromTime($startHour, 0, 0);
                    $endTime = $startTime->copy()->addHours($duration);

                    // Avoid creating schedules that overlap with existing ones
                    // This is a simplified check; relying on not seeding overlapping times in this loop
                    // and hoping database seeding didn't fill EVERYTHING.
                    // But effectively, we are just adding "some" data.

                    // Check strict overlap with DB
                    $exists = Schedule::where('room_id', $room->id)
                        ->where('date', $date->toDateString())
                        ->where(function ($q) use ($startTime, $endTime) {
                            $q->whereBetween('start_time', [$startTime->format('H:i'), $endTime->format('H:i')])
                                ->orWhereBetween('end_time', [$startTime->format('H:i'), $endTime->format('H:i')]);
                        })
                        ->exists();

                    if (!$exists) {
                        Schedule::create([
                            'room_id' => $room->id,
                            'subject' => $faker->randomElement($subjects),
                            'department' => $dept,
                            'lecturer' => $faker->title . ' ' . $faker->name,
                            'date' => $date->toDateString(),
                            'start_time' => $startTime->format('H:i'),
                            'end_time' => $endTime->format('H:i'),
                            'day_of_week' => $date->locale('id')->dayName,
                            'is_recurring' => false, // Set some to true if needed
                            'sipirang_id' => 'SEED-' . strtoupper($faker->bothify('??####')),
                        ]);
                    }

                    $startHour += $duration + 1; // 1 hour break
                    if ($startHour >= 17)
                        break; // Stop if late
                }
            }
        }

        $this->command->info('Additional schedules seeded successfully.');
    }
}
