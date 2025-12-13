<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Location;
use App\Models\Faculty;
use App\Models\Building;
use App\Models\Room;
use App\Models\Asset;
use App\Models\Schedule;
use App\Models\Polygon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'name' => 'Admin SIDIA',
            'email' => 'admin@sidia.unud.ac.id',
            'password' => Hash::make('admin123'),
        ]);

        // Create categories
        $categories = [
            ['name' => 'Tanah', 'slug' => 'tanah', 'icon' => 'Map', 'color' => '#ef4444', 'sort_order' => 1],
            ['name' => 'Gedung', 'slug' => 'gedung', 'icon' => 'Building2', 'color' => '#3b82f6', 'sort_order' => 2],
            ['name' => 'Laboratorium', 'slug' => 'lab', 'icon' => 'Microscope', 'color' => '#8b5cf6', 'sort_order' => 3],
            ['name' => 'Ruang Rapat', 'slug' => 'rapat', 'icon' => 'Users', 'color' => '#f59e0b', 'sort_order' => 4],
            ['name' => 'Perpustakaan', 'slug' => 'perpus', 'icon' => 'BookOpen', 'color' => '#10b981', 'sort_order' => 5],
            ['name' => 'E-Lelang/Sewa', 'slug' => 'lelang', 'icon' => 'Gavel', 'color' => '#ec4899', 'sort_order' => 6],
            ['name' => 'Lainnya', 'slug' => 'lainnya', 'icon' => 'MoreHorizontal', 'color' => '#6b7280', 'sort_order' => 7],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }

        // Create locations
        $locations = [
            ['name' => 'Kampus Jimbaran', 'code' => 'JIMBARAN', 'latitude' => -8.7980, 'longitude' => 115.1720],
            ['name' => 'Kampus Sudirman', 'code' => 'SUDIRMAN', 'latitude' => -8.6513, 'longitude' => 115.2191],
            ['name' => 'Kampus Nias', 'code' => 'NIAS', 'latitude' => -8.6565, 'longitude' => 115.2145],
        ];

        foreach ($locations as $location) {
            Location::create($location);
        }

        // Create faculties
        $faculties = [
            ['name' => 'Fakultas Teknik', 'code' => 'FT', 'color' => '#a855f7', 'location_id' => 1],
            ['name' => 'Fakultas Ekonomi & Bisnis', 'code' => 'FEB', 'color' => '#3b82f6', 'location_id' => 1],
            ['name' => 'Fakultas Ilmu Budaya', 'code' => 'FIB', 'color' => '#f97316', 'location_id' => 2],
            ['name' => 'Fakultas Kedokteran', 'code' => 'FK', 'color' => '#10b981', 'location_id' => 2],
            ['name' => 'Fakultas Hukum', 'code' => 'FH', 'color' => '#ef4444', 'location_id' => 2],
            ['name' => 'Rektorat', 'code' => 'REKT', 'color' => '#1e293b', 'location_id' => 1],
        ];

        foreach ($faculties as $faculty) {
            Faculty::create($faculty);
        }

        // Create buildings
        $buildings = [
            ['name' => 'Gedung Teknik A', 'code' => 'GTA', 'faculty_id' => 1, 'location_id' => 1, 'category_id' => 2, 'floors' => 3, 'building_area' => 2500, 'land_area' => 1500, 'year_built' => 2010],
            ['name' => 'Gedung Teknik B', 'code' => 'GTB', 'faculty_id' => 1, 'location_id' => 1, 'category_id' => 2, 'floors' => 4, 'building_area' => 3000, 'land_area' => 1800, 'year_built' => 2015],
            ['name' => 'Gedung FEB', 'code' => 'GFEB', 'faculty_id' => 2, 'location_id' => 1, 'category_id' => 2, 'floors' => 5, 'building_area' => 5000, 'land_area' => 3000, 'year_built' => 2012],
            ['name' => 'Gedung Rektorat', 'code' => 'REKT', 'faculty_id' => 6, 'location_id' => 1, 'category_id' => 2, 'floors' => 3, 'building_area' => 4000, 'land_area' => 2500, 'year_built' => 2000],
            ['name' => 'Perpustakaan Pusat', 'code' => 'PERPUS', 'faculty_id' => null, 'location_id' => 1, 'category_id' => 5, 'floors' => 2, 'building_area' => 3500, 'land_area' => 2000, 'year_built' => 2018],
        ];

        foreach ($buildings as $building) {
            Building::create($building);
        }

        // Create rooms
        $rooms = [
            ['name' => 'Ruang Kelas 3.01', 'code' => 'R301', 'building_id' => 1, 'floor' => 3, 'capacity' => 40, 'status' => 'OCCUPIED', 'current_activity' => 'Kuliah Kalkulus II'],
            ['name' => 'Ruang Kelas 3.02', 'code' => 'R302', 'building_id' => 1, 'floor' => 3, 'capacity' => 35, 'status' => 'AVAILABLE'],
            ['name' => 'Ruang Kelas 2.05', 'code' => 'R205', 'building_id' => 3, 'floor' => 2, 'capacity' => 50, 'status' => 'OCCUPIED', 'current_activity' => 'Kuliah Manajemen Keuangan'],
            ['name' => 'Lab Komputer A', 'code' => 'LABA', 'building_id' => 2, 'category_id' => 3, 'floor' => 1, 'capacity' => 25, 'status' => 'AVAILABLE'],
            ['name' => 'Auditorium Widya', 'code' => 'AUDW', 'building_id' => 4, 'floor' => 1, 'capacity' => 200, 'status' => 'MAINTENANCE', 'current_activity' => 'Perbaikan AC'],
            ['name' => 'Ruang Baca', 'code' => 'RBACA', 'building_id' => 5, 'floor' => 1, 'capacity' => 100, 'status' => 'AVAILABLE'],
        ];

        foreach ($rooms as $room) {
            Room::create($room);
        }

        // Create assets
        $assets = [
            ['name' => 'Proyektor', 'code' => 'AST-001', 'brand' => 'Epson EB-X05', 'room_id' => 1, 'quantity' => 1, 'condition' => 'Baik'],
            ['name' => 'Papan Tulis', 'code' => 'AST-002', 'brand' => 'Whiteboard 200x100cm', 'room_id' => 1, 'quantity' => 2, 'condition' => 'Baik'],
            ['name' => 'Kursi Kuliah', 'code' => 'AST-003', 'brand' => 'Chitose DTC-04', 'room_id' => 1, 'quantity' => 40, 'condition' => 'Baik'],
            ['name' => 'AC Split', 'code' => 'AST-004', 'brand' => 'Daikin 2PK', 'room_id' => 1, 'quantity' => 2, 'condition' => 'Baik'],
            ['name' => 'Proyektor', 'code' => 'AST-005', 'brand' => 'BenQ MX550', 'room_id' => 2, 'quantity' => 1, 'condition' => 'Baik'],
            ['name' => 'Kursi Kuliah', 'code' => 'AST-006', 'brand' => 'Chitose DTC-04', 'room_id' => 2, 'quantity' => 35, 'condition' => 'Baik'],
            ['name' => 'Smart TV', 'code' => 'AST-007', 'brand' => 'Samsung 65"', 'room_id' => 3, 'quantity' => 1, 'condition' => 'Baik'],
            ['name' => 'PC All-in-One', 'code' => 'AST-008', 'brand' => 'Lenovo IdeaCentre', 'room_id' => 4, 'quantity' => 25, 'condition' => 'Baik'],
            ['name' => 'Sound System', 'code' => 'AST-009', 'brand' => 'Yamaha', 'room_id' => 5, 'quantity' => 1, 'condition' => 'Baik'],
        ];

        foreach ($assets as $asset) {
            Asset::create($asset);
        }

        // Create schedules for today
        $today = now()->toDateString();
        $schedules = [
            ['room_id' => 1, 'subject' => 'Kuliah Kalkulus II', 'department' => 'Prodi Teknik Informatika', 'date' => $today, 'start_time' => '08:00', 'end_time' => '10:00'],
            ['room_id' => 1, 'subject' => 'Praktikum Algoritma', 'department' => 'Prodi Teknik Informatika', 'date' => $today, 'start_time' => '10:00', 'end_time' => '12:00'],
            ['room_id' => 1, 'subject' => 'Sistem Operasi', 'department' => 'Prodi Teknologi Informasi', 'date' => $today, 'start_time' => '13:00', 'end_time' => '15:00'],
            ['room_id' => 2, 'subject' => 'Bahasa Inggris Teknik', 'department' => 'Prodi Teknik Mesin', 'date' => $today, 'start_time' => '08:00', 'end_time' => '09:40'],
            ['room_id' => 3, 'subject' => 'Manajemen Keuangan', 'department' => 'Prodi Manajemen', 'date' => $today, 'start_time' => '10:00', 'end_time' => '14:00'],
        ];

        foreach ($schedules as $schedule) {
            Schedule::create($schedule);
        }

        // Create sample polygons (GeoJSON format)
        $polygons = [
            [
                'name' => 'Area Fakultas Teknik',
                'faculty_id' => 1,
                'location_id' => 1,
                'fill_color' => '#a855f7',
                'stroke_color' => '#7c3aed',
                'fill_opacity' => 0.4,
                'land_area' => 50000,
                'geojson' => [
                    'type' => 'Polygon',
                    'coordinates' => [
                        [
                            [115.1685, -8.7950],
                            [115.1725, -8.7950],
                            [115.1725, -8.7990],
                            [115.1685, -8.7990],
                            [115.1685, -8.7950],
                        ]
                    ],
                ],
            ],
            [
                'name' => 'Area FEB',
                'faculty_id' => 2,
                'location_id' => 1,
                'fill_color' => '#3b82f6',
                'stroke_color' => '#1d4ed8',
                'fill_opacity' => 0.4,
                'land_area' => 35000,
                'geojson' => [
                    'type' => 'Polygon',
                    'coordinates' => [
                        [
                            [115.1730, -8.7950],
                            [115.1770, -8.7950],
                            [115.1770, -8.7985],
                            [115.1730, -8.7985],
                            [115.1730, -8.7950],
                        ]
                    ],
                ],
            ],
            [
                'name' => 'Area Rektorat',
                'faculty_id' => 6,
                'location_id' => 1,
                'fill_color' => '#1e293b',
                'stroke_color' => '#0f172a',
                'fill_opacity' => 0.5,
                'land_area' => 25000,
                'geojson' => [
                    'type' => 'Polygon',
                    'coordinates' => [
                        [
                            [115.1700, -8.8000],
                            [115.1740, -8.8000],
                            [115.1740, -8.8030],
                            [115.1700, -8.8030],
                            [115.1700, -8.8000],
                        ]
                    ],
                ],
            ],
        ];

        foreach ($polygons as $polygon) {
            Polygon::create($polygon);
        }
    }
}
