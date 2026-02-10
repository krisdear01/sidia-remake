import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Layers, ArrowLeft, Search, Filter, Users, Calendar, ChevronDown } from 'lucide-react';

// Mock data representing Indonesian university buildings (Udayana style)
const MOCK_BUILDINGS = [
    {
        id: 1,
        name: 'Gedung Rektorat',
        code: 'GR-01',
        faculty: 'Rektorat',
        location: 'Kampus Bukit Jimbaran',
        floors: 4,
        buildingArea: 5200,
        yearBuilt: 1995,
        condition: 'Baik',
        description: 'Pusat administrasi universitas yang menaungi kantor Rektor, Wakil Rektor, dan unit-unit pendukung.',
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
        rooms: 48,
    },
    {
        id: 2,
        name: 'Gedung Fakultas Teknik',
        code: 'FT-01',
        faculty: 'Fakultas Teknik',
        location: 'Kampus Bukit Jimbaran',
        floors: 5,
        buildingArea: 8500,
        yearBuilt: 2001,
        condition: 'Baik',
        description: 'Gedung utama Fakultas Teknik yang memiliki ruang kuliah, laboratorium, dan ruang dosen.',
        image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&h=300&fit=crop',
        rooms: 62,
    },
    {
        id: 3,
        name: 'Gedung Perpustakaan Pusat',
        code: 'PP-01',
        faculty: 'Unit Pelaksana Teknis',
        location: 'Kampus Bukit Jimbaran',
        floors: 3,
        buildingArea: 4800,
        yearBuilt: 2005,
        condition: 'Baik',
        description: 'Perpustakaan pusat universitas dengan koleksi buku, jurnal, dan akses digital.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
        rooms: 24,
    },
    {
        id: 4,
        name: 'Gedung Fakultas Ekonomi',
        code: 'FE-01',
        faculty: 'Fakultas Ekonomi dan Bisnis',
        location: 'Kampus Bukit Jimbaran',
        floors: 4,
        buildingArea: 6200,
        yearBuilt: 1998,
        condition: 'Baik',
        description: 'Gedung utama FEB dengan fasilitas ruang kuliah dan pusat studi ekonomi.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
        rooms: 45,
    },
    {
        id: 5,
        name: 'Gedung Fakultas Hukum',
        code: 'FH-01',
        faculty: 'Fakultas Hukum',
        location: 'Kampus Bukit Jimbaran',
        floors: 4,
        buildingArea: 5800,
        yearBuilt: 1997,
        condition: 'Baik',
        description: 'Gedung Fakultas Hukum dengan fasilitas moot court dan ruang seminar.',
        image: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=400&h=300&fit=crop',
        rooms: 38,
    },
    {
        id: 6,
        name: 'Gedung MIPA Terpadu',
        code: 'MIPA-01',
        faculty: 'Fakultas MIPA',
        location: 'Kampus Bukit Jimbaran',
        floors: 5,
        buildingArea: 7200,
        yearBuilt: 2008,
        condition: 'Baik',
        description: 'Gedung terpadu FMIPA dengan laboratorium modern dan ruang penelitian.',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
        rooms: 55,
    },
    {
        id: 7,
        name: 'Gedung Kedokteran',
        code: 'FK-01',
        faculty: 'Fakultas Kedokteran',
        location: 'Kampus Denpasar',
        floors: 6,
        buildingArea: 9500,
        yearBuilt: 2010,
        condition: 'Baik',
        description: 'Gedung Fakultas Kedokteran dengan fasilitas skills lab dan ruang anatomi.',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
        rooms: 78,
    },
    {
        id: 8,
        name: 'Gedung Pertanian',
        code: 'FP-01',
        faculty: 'Fakultas Pertanian',
        location: 'Kampus Bukit Jimbaran',
        floors: 3,
        buildingArea: 4500,
        yearBuilt: 1996,
        condition: 'Cukup',
        description: 'Gedung Fakultas Pertanian dengan greenhouse dan laboratorium tanah.',
        image: 'https://images.unsplash.com/photo-1464938050520-ef2571a9c3d8?w=400&h=300&fit=crop',
        rooms: 32,
    },
];

const FACULTIES = ['Semua Fakultas', 'Rektorat', 'Fakultas Teknik', 'Fakultas Ekonomi dan Bisnis', 'Fakultas Hukum', 'Fakultas MIPA', 'Fakultas Kedokteran', 'Fakultas Pertanian', 'Unit Pelaksana Teknis'];
const LOCATIONS = ['Semua Lokasi', 'Kampus Bukit Jimbaran', 'Kampus Denpasar', 'Kampus Nias'];

export const GedungPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('Semua Fakultas');
    const [selectedLocation, setSelectedLocation] = useState('Semua Lokasi');
    const [selectedBuilding, setSelectedBuilding] = useState<typeof MOCK_BUILDINGS[0] | null>(null);

    const filteredBuildings = useMemo(() => {
        return MOCK_BUILDINGS.filter(building => {
            const matchesSearch = building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                building.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                building.faculty.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFaculty = selectedFaculty === 'Semua Fakultas' || building.faculty === selectedFaculty;
            const matchesLocation = selectedLocation === 'Semua Lokasi' || building.location === selectedLocation;

            return matchesSearch && matchesFaculty && matchesLocation;
        });
    }, [searchTerm, selectedFaculty, selectedLocation]);

    const stats = useMemo(() => ({
        totalBuildings: MOCK_BUILDINGS.length,
        totalArea: MOCK_BUILDINGS.reduce((acc, b) => acc + b.buildingArea, 0),
        totalRooms: MOCK_BUILDINGS.reduce((acc, b) => acc + b.rooms, 0),
    }), []);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline">Kembali</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
                                <Building2 className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Gedung</h1>
                                <p className="text-xs text-slate-500">Inventaris Gedung Universitas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Gedung</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalBuildings}</p>
                            </div>
                            <Building2 size={40} className="text-blue-300" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Total Luas</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalArea.toLocaleString('id-ID')} m²</p>
                            </div>
                            <Layers size={40} className="text-emerald-300" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg shadow-purple-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Total Ruangan</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalRooms}</p>
                            </div>
                            <Users size={40} className="text-purple-300" />
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* Search */}
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari gedung, kode, atau fakultas..."
                                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Faculty Filter */}
                        <div className="relative">
                            <select
                                value={selectedFaculty}
                                onChange={(e) => setSelectedFaculty(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
                            >
                                {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Location Filter */}
                        <div className="relative">
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
                            >
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Buildings Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBuildings.map((building) => (
                        <div
                            key={building.id}
                            onClick={() => setSelectedBuilding(building)}
                            className="group cursor-pointer rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="relative mb-4 overflow-hidden rounded-xl">
                                <img
                                    src={building.image}
                                    alt={building.name}
                                    className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 left-2 rounded-lg bg-white/90 backdrop-blur-sm px-2 py-1 text-xs font-semibold text-slate-700">
                                    {building.code}
                                </div>
                                <div className={`absolute top-2 right-2 rounded-lg px-2 py-1 text-xs font-semibold ${building.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {building.condition}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{building.name}</h3>
                            <p className="text-sm text-blue-600 font-medium mb-2">{building.faculty}</p>

                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Layers size={14} />
                                    <span>{building.floors} Lantai</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users size={14} />
                                    <span>{building.rooms} Ruang</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                <MapPin size={14} />
                                <span>{building.location}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredBuildings.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Tidak ada gedung yang ditemukan.</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedBuilding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="relative">
                            <img
                                src={selectedBuilding.image}
                                alt={selectedBuilding.name}
                                className="w-full h-64 object-cover rounded-t-2xl"
                            />
                            <button
                                onClick={() => setSelectedBuilding(null)}
                                className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="text-blue-600 font-mono text-sm font-semibold">{selectedBuilding.code}</span>
                                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedBuilding.name}</h2>
                                    <p className="text-slate-600 mt-1">{selectedBuilding.faculty}</p>
                                </div>
                                <div className={`rounded-lg px-3 py-1 text-sm font-semibold ${selectedBuilding.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {selectedBuilding.condition}
                                </div>
                            </div>

                            <p className="text-slate-600 mb-6">{selectedBuilding.description}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Jumlah Lantai</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedBuilding.floors}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Total Ruangan</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedBuilding.rooms}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Luas Bangunan</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedBuilding.buildingArea.toLocaleString('id-ID')} m²</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Tahun Dibangun</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedBuilding.yearBuilt}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-500">
                                <MapPin size={16} />
                                <span>{selectedBuilding.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
