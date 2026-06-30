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
        $adminPassword = env('SEED_ADMIN_PASSWORD');

        if (empty($adminPassword)) {
            if (! app()->environment('local', 'testing')) {
                throw new \RuntimeException(
                    'SEED_ADMIN_PASSWORD env var must be set when seeding outside local/testing environments.'
                );
            }
            $adminPassword = 'admin123';
            fwrite(STDERR, "WARNING: seeding admin with insecure dev password. Set SEED_ADMIN_PASSWORD to override.\n");
        }

        User::create([
            'name' => 'Admin SIAU',
            'email' => env('SEED_ADMIN_EMAIL', 'admin@siau.unud.ac.id'),
            'password' => Hash::make($adminPassword),
        ]);

        // Create categories
        $categories = [
            ['name' => 'Tanah', 'slug' => 'tanah', 'icon' => 'Map', 'color' => '#ef4444', 'sort_order' => 1],
            ['name' => 'Gedung', 'slug' => 'gedung', 'icon' => 'Building2', 'color' => '#3b82f6', 'sort_order' => 2],
            ['name' => 'Laboratorium', 'slug' => 'lab', 'icon' => 'Microscope', 'color' => '#8b5cf6', 'sort_order' => 3],
            ['name' => 'Ruang Rapat', 'slug' => 'rapat', 'icon' => 'Users', 'color' => '#f59e0b', 'sort_order' => 4],
            ['name' => 'Perpustakaan', 'slug' => 'perpus', 'icon' => 'BookOpen', 'color' => '#10b981', 'sort_order' => 5],
            ['name' => 'Ruang Kelas', 'slug' => 'kelas', 'icon' => 'GraduationCap', 'color' => '#6366f1', 'sort_order' => 6],
            ['name' => 'E-Lelang/Sewa', 'slug' => 'lelang', 'icon' => 'Gavel', 'color' => '#ec4899', 'sort_order' => 7],
            ['name' => 'Lainnya', 'slug' => 'lainnya', 'icon' => 'MoreHorizontal', 'color' => '#6b7280', 'sort_order' => 8],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }

        // Create locations
        $locations = [
            ['name' => 'Kampus Bukit Jimbaran', 'code' => 'JIMBARAN', 'latitude' => -8.7970, 'longitude' => 115.1720],
            ['name' => 'Kampus Denpasar', 'code' => 'DENPASAR', 'latitude' => -8.6513, 'longitude' => 115.2191],
            ['name' => 'Kampus Nias', 'code' => 'NIAS', 'latitude' => -8.6565, 'longitude' => 115.2145],
        ];

        foreach ($locations as $location) {
            Location::create($location);
        }

        // Create faculties
        $faculties = [
            ['name' => 'Fakultas Teknik', 'code' => 'FT', 'color' => '#1E90FF', 'location_id' => 1],
            ['name' => 'Fakultas Ekonomi dan Bisnis', 'code' => 'FEB', 'color' => '#40E0D0', 'location_id' => 1],
            ['name' => 'Fakultas Ilmu Budaya', 'code' => 'FIB', 'color' => '#FFD700', 'location_id' => 1],
            ['name' => 'Fakultas Kedokteran', 'code' => 'FK', 'color' => '#FF8C00', 'location_id' => 2],
            ['name' => 'Fakultas Hukum', 'code' => 'FH', 'color' => '#32CD32', 'location_id' => 1],
            ['name' => 'Fakultas MIPA', 'code' => 'FMIPA', 'color' => '#9932CC', 'location_id' => 1],
            ['name' => 'Fakultas Pertanian', 'code' => 'FP', 'color' => '#98FB98', 'location_id' => 1],
            ['name' => 'Rektorat', 'code' => 'REKT', 'color' => '#1e293b', 'location_id' => 1],
            ['name' => 'Unit Pelaksana Teknis', 'code' => 'UPT', 'color' => '#0891b2', 'location_id' => 1],
        ];

        foreach ($faculties as $faculty) {
            Faculty::create($faculty);
        }

        // Create buildings (matching frontend mock data)
        $buildings = [
            ['name' => 'Gedung Rektorat', 'code' => 'GR-01', 'faculty_id' => 8, 'location_id' => 1, 'category_id' => 2, 'floors' => 4, 'building_area' => 5200, 'land_area' => 3000, 'year_built' => 1995, 'condition' => 'Baik', 'description' => 'Pusat administrasi universitas yang menaungi kantor Rektor, Wakil Rektor, dan unit-unit pendukung.', 'is_active' => true],
            ['name' => 'Gedung Fakultas Teknik', 'code' => 'FT-01', 'faculty_id' => 1, 'location_id' => 1, 'category_id' => 2, 'floors' => 5, 'building_area' => 8500, 'land_area' => 4500, 'year_built' => 2001, 'condition' => 'Baik', 'description' => 'Gedung utama Fakultas Teknik yang memiliki ruang kuliah, laboratorium, dan ruang dosen.', 'is_active' => true],
            ['name' => 'Gedung Perpustakaan Pusat', 'code' => 'PP-01', 'faculty_id' => 9, 'location_id' => 1, 'category_id' => 5, 'floors' => 3, 'building_area' => 4800, 'land_area' => 2800, 'year_built' => 2005, 'condition' => 'Baik', 'description' => 'Perpustakaan pusat universitas dengan koleksi buku, jurnal, dan akses digital.', 'is_active' => true],
            ['name' => 'Gedung Fakultas Ekonomi', 'code' => 'FE-01', 'faculty_id' => 2, 'location_id' => 1, 'category_id' => 2, 'floors' => 4, 'building_area' => 6200, 'land_area' => 3500, 'year_built' => 1998, 'condition' => 'Baik', 'description' => 'Gedung utama FEB dengan fasilitas ruang kuliah dan pusat studi ekonomi.', 'is_active' => true],
            ['name' => 'Gedung Fakultas Hukum', 'code' => 'FH-01', 'faculty_id' => 5, 'location_id' => 1, 'category_id' => 2, 'floors' => 4, 'building_area' => 5800, 'land_area' => 3200, 'year_built' => 1997, 'condition' => 'Baik', 'description' => 'Gedung Fakultas Hukum dengan fasilitas moot court dan ruang seminar.', 'is_active' => true],
            ['name' => 'Gedung MIPA Terpadu', 'code' => 'MIPA-01', 'faculty_id' => 6, 'location_id' => 1, 'category_id' => 2, 'floors' => 5, 'building_area' => 7200, 'land_area' => 4000, 'year_built' => 2008, 'condition' => 'Baik', 'description' => 'Gedung terpadu FMIPA dengan laboratorium modern dan ruang penelitian.', 'is_active' => true],
            ['name' => 'Gedung Kedokteran', 'code' => 'FK-01', 'faculty_id' => 4, 'location_id' => 2, 'category_id' => 2, 'floors' => 6, 'building_area' => 9500, 'land_area' => 5000, 'year_built' => 2010, 'condition' => 'Baik', 'description' => 'Gedung Fakultas Kedokteran dengan fasilitas skills lab dan ruang anatomi.', 'is_active' => true],
            ['name' => 'Gedung Pertanian', 'code' => 'FP-01', 'faculty_id' => 7, 'location_id' => 1, 'category_id' => 2, 'floors' => 3, 'building_area' => 4500, 'land_area' => 2500, 'year_built' => 1996, 'condition' => 'Rusak Ringan', 'description' => 'Gedung Fakultas Pertanian dengan greenhouse dan laboratorium tanah.', 'is_active' => true],
            ['name' => 'Gedung Ilmu Budaya', 'code' => 'FIB-01', 'faculty_id' => 3, 'location_id' => 1, 'category_id' => 2, 'floors' => 4, 'building_area' => 5500, 'land_area' => 3000, 'year_built' => 2000, 'condition' => 'Baik', 'description' => 'Gedung Fakultas Ilmu Budaya dengan galeri seni dan teater mini.', 'is_active' => true],
        ];

        foreach ($buildings as $building) {
            Building::create($building);
        }

        // Create rooms - Laboratories
        $labs = [
            ['name' => 'Laboratorium Kimia Dasar', 'code' => 'LAB-KD-01', 'building_id' => 6, 'category_id' => 3, 'floor' => 2, 'capacity' => 40, 'area' => 120, 'status' => 'AVAILABLE', 'description' => 'Laboratorium untuk praktikum kimia dasar mahasiswa tahun pertama.', 'is_active' => true],
            ['name' => 'Laboratorium Komputer', 'code' => 'LAB-KOM-01', 'building_id' => 2, 'category_id' => 3, 'floor' => 3, 'capacity' => 60, 'area' => 180, 'status' => 'OCCUPIED', 'current_activity' => 'Praktikum Pemrograman Web', 'description' => 'Laboratorium komputer dengan workstation modern untuk praktikum pemrograman.', 'is_active' => true],
            ['name' => 'Laboratorium Fisika', 'code' => 'LAB-FIS-01', 'building_id' => 6, 'category_id' => 3, 'floor' => 3, 'capacity' => 35, 'area' => 100, 'status' => 'AVAILABLE', 'description' => 'Laboratorium fisika untuk eksperimen mekanika, optik, dan elektromagnetisme.', 'is_active' => true],
            ['name' => 'Laboratorium Biologi Molekuler', 'code' => 'LAB-BIO-01', 'building_id' => 6, 'category_id' => 3, 'floor' => 4, 'capacity' => 25, 'area' => 90, 'status' => 'AVAILABLE', 'description' => 'Laboratorium riset biologi molekuler dan genetika dengan peralatan canggih.', 'is_active' => true],
            ['name' => 'Laboratorium Jaringan', 'code' => 'LAB-NET-01', 'building_id' => 2, 'category_id' => 3, 'floor' => 4, 'capacity' => 30, 'area' => 80, 'status' => 'MAINTENANCE', 'current_activity' => 'Upgrade Perangkat Router', 'description' => 'Laboratorium untuk praktikum jaringan komputer dan keamanan siber.', 'is_active' => true],
            ['name' => 'Laboratorium Anatomi', 'code' => 'LAB-ANA-01', 'building_id' => 7, 'category_id' => 3, 'floor' => 1, 'capacity' => 50, 'area' => 200, 'status' => 'OCCUPIED', 'current_activity' => 'Praktikum Anatomi Semester 2', 'description' => 'Laboratorium anatomi dengan spesimen dan model untuk studi kedokteran.', 'is_active' => true],
            ['name' => 'Laboratorium Teknik Sipil', 'code' => 'LAB-SIP-01', 'building_id' => 2, 'category_id' => 3, 'floor' => 1, 'capacity' => 20, 'area' => 250, 'status' => 'AVAILABLE', 'description' => 'Laboratorium untuk pengujian material bangunan dan struktur.', 'is_active' => true],
            ['name' => 'Laboratorium Bahasa', 'code' => 'LAB-BHS-01', 'building_id' => 9, 'category_id' => 3, 'floor' => 2, 'capacity' => 40, 'area' => 100, 'status' => 'AVAILABLE', 'description' => 'Laboratorium multimedia untuk pembelajaran bahasa asing.', 'is_active' => true],
        ];

        foreach ($labs as $lab) {
            Room::create($lab);
        }

        // Create rooms - Meeting Rooms
        $meetingRooms = [
            ['name' => 'Ruang Rapat Utama Rektorat', 'code' => 'RR-REK-01', 'building_id' => 1, 'category_id' => 4, 'floor' => 3, 'capacity' => 50, 'area' => 120, 'status' => 'AVAILABLE', 'description' => 'Ruang rapat utama untuk kegiatan rapat pimpinan universitas dan pertemuan penting.', 'is_active' => true],
            ['name' => 'Ruang Sidang Senat', 'code' => 'RR-SEN-01', 'building_id' => 1, 'category_id' => 4, 'floor' => 4, 'capacity' => 100, 'area' => 250, 'status' => 'OCCUPIED', 'current_activity' => 'Sidang Senat Akademik', 'description' => 'Ruang sidang untuk rapat senat akademik dan kegiatan ceremonial universitas.', 'is_active' => true],
            ['name' => 'Ruang Rapat Fakultas Teknik', 'code' => 'RR-FT-01', 'building_id' => 2, 'category_id' => 4, 'floor' => 2, 'capacity' => 25, 'area' => 60, 'status' => 'AVAILABLE', 'description' => 'Ruang rapat untuk kegiatan koordinasi fakultas dan prodi di lingkungan FT.', 'is_active' => true],
            ['name' => 'Ruang Meeting Ekonomi A', 'code' => 'RR-FE-01', 'building_id' => 4, 'category_id' => 4, 'floor' => 2, 'capacity' => 20, 'area' => 45, 'status' => 'AVAILABLE', 'description' => 'Ruang meeting untuk diskusi dan presentasi tim di FEB.', 'is_active' => true],
            ['name' => 'Ruang Diskusi MIPA', 'code' => 'RR-MIPA-01', 'building_id' => 6, 'category_id' => 4, 'floor' => 1, 'capacity' => 15, 'area' => 35, 'status' => 'AVAILABLE', 'description' => 'Ruang diskusi kecil untuk pembimbingan dan meeting grup riset.', 'is_active' => true],
            ['name' => 'Mini Auditorium FK', 'code' => 'RR-FK-01', 'building_id' => 7, 'category_id' => 4, 'floor' => 2, 'capacity' => 80, 'area' => 150, 'status' => 'MAINTENANCE', 'current_activity' => 'Perbaikan Sound System', 'description' => 'Mini auditorium untuk seminar, workshop, dan presentasi ilmiah FK.', 'is_active' => true],
            ['name' => 'Ruang Rapat Hukum', 'code' => 'RR-FH-01', 'building_id' => 5, 'category_id' => 4, 'floor' => 2, 'capacity' => 30, 'area' => 65, 'status' => 'AVAILABLE', 'description' => 'Ruang rapat untuk koordinasi fakultas dan kegiatan moot court preparation.', 'is_active' => true],
            ['name' => 'Co-Working Space Perpustakaan', 'code' => 'RR-PP-01', 'building_id' => 3, 'category_id' => 4, 'floor' => 2, 'capacity' => 12, 'area' => 40, 'status' => 'AVAILABLE', 'description' => 'Ruang diskusi dan co-working space untuk mahasiswa dan dosen.', 'is_active' => true],
        ];

        foreach ($meetingRooms as $room) {
            Room::create($room);
        }

        // Create rooms - Library/Reading Rooms
        $libraryRooms = [
            ['name' => 'Perpustakaan Pusat - Ruang Baca Utama', 'code' => 'PP-RB-01', 'building_id' => 3, 'category_id' => 5, 'floor' => 1, 'capacity' => 300, 'area' => 500, 'status' => 'AVAILABLE', 'description' => 'Ruang baca utama perpustakaan pusat dengan koleksi 125.000 buku.', 'is_active' => true],
            ['name' => 'Perpustakaan Fakultas Teknik', 'code' => 'PFT-01', 'building_id' => 2, 'category_id' => 5, 'floor' => 1, 'capacity' => 60, 'area' => 120, 'status' => 'AVAILABLE', 'description' => 'Perpustakaan khusus dengan koleksi literatur teknik dan standar nasional/internasional.', 'is_active' => true],
            ['name' => 'Perpustakaan Fakultas Kedokteran', 'code' => 'PFK-01', 'building_id' => 7, 'category_id' => 5, 'floor' => 2, 'capacity' => 80, 'area' => 140, 'status' => 'AVAILABLE', 'description' => 'Perpustakaan medis dengan koleksi buku kedokteran dan akses database medis internasional.', 'is_active' => true],
            ['name' => 'Perpustakaan FEB', 'code' => 'PFEB-01', 'building_id' => 4, 'category_id' => 5, 'floor' => 1, 'capacity' => 50, 'area' => 100, 'status' => 'AVAILABLE', 'description' => 'Perpustakaan ekonomi dan bisnis dengan koleksi buku manajemen dan akuntansi.', 'is_active' => true],
            ['name' => 'Perpustakaan Hukum', 'code' => 'PFH-01', 'building_id' => 5, 'category_id' => 5, 'floor' => 1, 'capacity' => 40, 'area' => 80, 'status' => 'OCCUPIED', 'current_activity' => 'Renovasi Ruangan', 'description' => 'Perpustakaan hukum dengan koleksi peraturan perundang-undangan dan jurnal hukum.', 'is_active' => true],
            ['name' => 'Ruang Baca MIPA', 'code' => 'RBMIPA-01', 'building_id' => 6, 'category_id' => 5, 'floor' => 2, 'capacity' => 35, 'area' => 70, 'status' => 'AVAILABLE', 'description' => 'Ruang baca khusus mahasiswa FMIPA dengan koleksi buku sains dan matematika.', 'is_active' => true],
            ['name' => 'Digital Library Corner', 'code' => 'DLC-01', 'building_id' => 3, 'category_id' => 5, 'floor' => 2, 'capacity' => 40, 'area' => 80, 'status' => 'AVAILABLE', 'description' => 'Fasilitas akses digital dengan komputer dan layanan e-resources untuk penelitian.', 'is_active' => true],
            ['name' => 'Quiet Study Zone', 'code' => 'QSZ-01', 'building_id' => 3, 'category_id' => 5, 'floor' => 3, 'capacity' => 50, 'area' => 100, 'status' => 'AVAILABLE', 'description' => 'Zona belajar tenang untuk fokus dan konsentrasi maksimal.', 'is_active' => true],
        ];

        foreach ($libraryRooms as $room) {
            Room::create($room);
        }

        // Create rooms - Regular Classrooms
        $classrooms = [
            ['name' => 'Ruang Kelas 3.01 FT', 'code' => 'R301-FT', 'building_id' => 2, 'category_id' => 6, 'floor' => 3, 'capacity' => 40, 'area' => 60, 'status' => 'OCCUPIED', 'current_activity' => 'Kuliah Kalkulus II', 'is_active' => true],
            ['name' => 'Ruang Kelas 3.02 FT', 'code' => 'R302-FT', 'building_id' => 2, 'category_id' => 6, 'floor' => 3, 'capacity' => 35, 'area' => 55, 'status' => 'AVAILABLE', 'is_active' => true],
            ['name' => 'Ruang Kelas 2.05 FEB', 'code' => 'R205-FEB', 'building_id' => 4, 'category_id' => 6, 'floor' => 2, 'capacity' => 50, 'area' => 70, 'status' => 'OCCUPIED', 'current_activity' => 'Kuliah Manajemen Keuangan', 'is_active' => true],
            ['name' => 'Auditorium Widya', 'code' => 'AUDW', 'building_id' => 1, 'category_id' => 6, 'floor' => 1, 'capacity' => 200, 'area' => 300, 'status' => 'MAINTENANCE', 'current_activity' => 'Perbaikan AC', 'is_active' => true],
        ];

        foreach ($classrooms as $room) {
            Room::create($room);
        }

        // Create assets for labs
        $assets = [
            // Lab Kimia
            ['name' => 'Timbangan Analitik', 'code' => 'AST-KD-001', 'brand' => 'Ohaus Explorer', 'room_id' => 1, 'quantity' => 10, 'condition' => 'Baik'],
            ['name' => 'Spektrofotometer', 'code' => 'AST-KD-002', 'brand' => 'Shimadzu UV-1800', 'room_id' => 1, 'quantity' => 2, 'condition' => 'Baik'],
            ['name' => 'pH Meter', 'code' => 'AST-KD-003', 'brand' => 'Hanna Instruments', 'room_id' => 1, 'quantity' => 10, 'condition' => 'Baik'],
            ['name' => 'Fume Hood', 'code' => 'AST-KD-004', 'brand' => 'Labconco', 'room_id' => 1, 'quantity' => 4, 'condition' => 'Baik'],
            // Lab Komputer
            ['name' => 'PC Workstation', 'code' => 'AST-KOM-001', 'brand' => 'Lenovo ThinkCentre', 'room_id' => 2, 'quantity' => 60, 'condition' => 'Baik'],
            ['name' => 'Server Rack', 'code' => 'AST-KOM-002', 'brand' => 'Dell PowerEdge', 'room_id' => 2, 'quantity' => 2, 'condition' => 'Baik'],
            ['name' => 'Proyektor', 'code' => 'AST-KOM-003', 'brand' => 'Epson EB-X51', 'room_id' => 2, 'quantity' => 2, 'condition' => 'Baik'],
            // Lab Fisika
            ['name' => 'Osiloskop', 'code' => 'AST-FIS-001', 'brand' => 'Tektronix TBS1052B', 'room_id' => 3, 'quantity' => 10, 'condition' => 'Baik'],
            ['name' => 'Generator Fungsi', 'code' => 'AST-FIS-002', 'brand' => 'Keysight 33210A', 'room_id' => 3, 'quantity' => 10, 'condition' => 'Baik'],
            ['name' => 'Air Track', 'code' => 'AST-FIS-003', 'brand' => 'PASCO', 'room_id' => 3, 'quantity' => 5, 'condition' => 'Baik'],
            // Lab Biologi
            ['name' => 'PCR Machine', 'code' => 'AST-BIO-001', 'brand' => 'Bio-Rad T100', 'room_id' => 4, 'quantity' => 2, 'condition' => 'Baik'],
            ['name' => 'Gel Electrophoresis', 'code' => 'AST-BIO-002', 'brand' => 'Bio-Rad', 'room_id' => 4, 'quantity' => 4, 'condition' => 'Baik'],
            ['name' => 'Microcentrifuge', 'code' => 'AST-BIO-003', 'brand' => 'Eppendorf', 'room_id' => 4, 'quantity' => 4, 'condition' => 'Baik'],
            ['name' => 'Laminar Flow', 'code' => 'AST-BIO-004', 'brand' => 'ESCO', 'room_id' => 4, 'quantity' => 2, 'condition' => 'Baik'],
            // Meeting Room Rektorat
            ['name' => 'Proyektor', 'code' => 'AST-RR-001', 'brand' => 'Epson EB-2250U', 'room_id' => 9, 'quantity' => 1, 'condition' => 'Baik'],
            ['name' => 'Video Conference System', 'code' => 'AST-RR-002', 'brand' => 'Poly Studio X50', 'room_id' => 9, 'quantity' => 1, 'condition' => 'Baik'],
            ['name' => 'Sound System', 'code' => 'AST-RR-003', 'brand' => 'JBL Professional', 'room_id' => 9, 'quantity' => 1, 'condition' => 'Baik'],
        ];

        foreach ($assets as $asset) {
            Asset::create($asset);
        }

        // Create schedules for today
        $today = now()->toDateString();
        $schedules = [
            ['room_id' => 2, 'subject' => 'Praktikum Pemrograman Web', 'department' => 'Prodi Teknik Informatika', 'date' => $today, 'start_time' => '08:00', 'end_time' => '10:00'],
            ['room_id' => 2, 'subject' => 'Praktikum Basis Data', 'department' => 'Prodi Teknik Informatika', 'date' => $today, 'start_time' => '10:00', 'end_time' => '12:00'],
            ['room_id' => 6, 'subject' => 'Praktikum Anatomi Semester 2', 'department' => 'Prodi Kedokteran', 'date' => $today, 'start_time' => '08:00', 'end_time' => '12:00'],
            ['room_id' => 10, 'subject' => 'Sidang Senat Akademik', 'department' => 'Rektorat', 'date' => $today, 'start_time' => '09:00', 'end_time' => '12:00'],
            ['room_id' => 25, 'subject' => 'Kuliah Kalkulus II', 'department' => 'Prodi Teknik Sipil', 'date' => $today, 'start_time' => '08:00', 'end_time' => '10:00'],
            ['room_id' => 27, 'subject' => 'Kuliah Manajemen Keuangan', 'department' => 'Prodi Manajemen', 'date' => $today, 'start_time' => '10:00', 'end_time' => '12:00'],
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
                'fill_color' => '#1E90FF',
                'stroke_color' => '#1565c0',
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
                'fill_color' => '#40E0D0',
                'stroke_color' => '#00bcd4',
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
                'faculty_id' => 8,
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
            [
                'name' => 'Area FMIPA',
                'faculty_id' => 6,
                'location_id' => 1,
                'fill_color' => '#9932CC',
                'stroke_color' => '#7b1fa2',
                'fill_opacity' => 0.4,
                'land_area' => 40000,
                'geojson' => [
                    'type' => 'Polygon',
                    'coordinates' => [
                        [
                            [115.1750, -8.7960],
                            [115.1790, -8.7960],
                            [115.1790, -8.7995],
                            [115.1750, -8.7995],
                            [115.1750, -8.7960],
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
