import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MapPin, ArrowLeft, Search, ChevronDown, Clock, Wifi, Users, BookMarked, Library, GraduationCap, Laptop } from 'lucide-react';

// Mock data representing Indonesian university library facilities
const MOCK_LIBRARIES = [
    {
        id: 1,
        name: 'Perpustakaan Pusat',
        code: 'PP-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Perpustakaan Pusat',
        floor: '1-3',
        type: 'Utama',
        status: 'OPEN',
        description: 'Perpustakaan pusat universitas dengan koleksi lengkap buku, jurnal, dan akses database elektronik internasional.',
        collections: 125000,
        readingCapacity: 300,
        operationalHours: 'Senin-Jumat: 08:00-21:00, Sabtu: 08:00-16:00',
        facilities: ['Ruang Baca', 'Ruang Diskusi', 'E-Corner', 'WiFi', 'AC', 'Loker', 'Mesin Fotokopi', 'Cafe'],
        services: ['Peminjaman Buku', 'Akses E-Journal', 'Referensi Online', 'Layanan Antar Perpustakaan', 'Pelatihan Literasi'],
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=300&fit=crop',
    },
    {
        id: 2,
        name: 'Perpustakaan Fakultas Teknik',
        code: 'PFT-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Fakultas Teknik',
        floor: '1',
        type: 'Fakultas',
        status: 'OPEN',
        description: 'Perpustakaan khusus dengan koleksi literatur teknik, standar nasional/internasional, dan jurnal teknik.',
        collections: 18500,
        readingCapacity: 60,
        operationalHours: 'Senin-Jumat: 08:00-16:00',
        facilities: ['Ruang Baca', 'Komputer Akses', 'WiFi', 'AC'],
        services: ['Peminjaman Buku', 'Akses Database IEEE', 'Koleksi Tugas Akhir'],
        image: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=300&fit=crop',
    },
    {
        id: 3,
        name: 'Perpustakaan Fakultas Kedokteran',
        code: 'PFK-01',
        location: 'Kampus Denpasar',
        building: 'Gedung Kedokteran',
        floor: '2',
        type: 'Fakultas',
        status: 'OPEN',
        description: 'Perpustakaan medis dengan koleksi buku kedokteran, jurnal klinis, dan akses database medis internasional.',
        collections: 22000,
        readingCapacity: 80,
        operationalHours: 'Senin-Jumat: 07:30-17:00',
        facilities: ['Ruang Baca', 'Discussion Room', 'E-Corner', 'WiFi', 'AC'],
        services: ['Peminjaman Buku', 'Akses PubMed', 'Akses Scopus', 'Koleksi Jurnal Medis'],
        image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop',
    },
    {
        id: 4,
        name: 'Perpustakaan FEB',
        code: 'PFEB-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Fakultas Ekonomi',
        floor: '1',
        type: 'Fakultas',
        status: 'OPEN',
        description: 'Perpustakaan ekonomi dan bisnis dengan koleksi buku manajemen, akuntansi, dan ekonomi.',
        collections: 15000,
        readingCapacity: 50,
        operationalHours: 'Senin-Jumat: 08:00-16:00',
        facilities: ['Ruang Baca', 'Komputer Akses', 'WiFi', 'AC'],
        services: ['Peminjaman Buku', 'Akses JSTOR', 'Koleksi Jurnal Ekonomi'],
        image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop',
    },
    {
        id: 5,
        name: 'Perpustakaan Hukum',
        code: 'PFH-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Fakultas Hukum',
        floor: '1',
        type: 'Fakultas',
        status: 'CLOSED',
        description: 'Perpustakaan hukum dengan koleksi peraturan perundang-undangan, jurnal hukum, dan dokumen legal.',
        collections: 12000,
        readingCapacity: 40,
        operationalHours: 'Senin-Jumat: 08:00-16:00',
        facilities: ['Ruang Baca', 'Koleksi Hukum Digital', 'WiFi', 'AC'],
        services: ['Peminjaman Buku', 'Akses Database Hukum', 'Koleksi Peraturan'],
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
    },
    {
        id: 6,
        name: 'Ruang Baca MIPA',
        code: 'RBMIPA-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung MIPA Terpadu',
        floor: '2',
        type: 'Ruang Baca',
        status: 'OPEN',
        description: 'Ruang baca khusus mahasiswa FMIPA dengan koleksi buku sains dan matematika.',
        collections: 8000,
        readingCapacity: 35,
        operationalHours: 'Senin-Jumat: 08:00-17:00',
        facilities: ['Ruang Baca', 'WiFi', 'AC', 'Colokan Listrik'],
        services: ['Baca di Tempat', 'Referensi Koleksi'],
        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    },
    {
        id: 7,
        name: 'Digital Library Corner',
        code: 'DLC-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Perpustakaan Pusat',
        floor: '2',
        type: 'Digital',
        status: 'OPEN',
        description: 'Fasilitas akses digital dengan komputer dan layanan e-resources untuk penelitian dan pembelajaran.',
        collections: 0,
        readingCapacity: 40,
        operationalHours: 'Senin-Jumat: 08:00-21:00',
        facilities: ['Komputer (40 unit)', 'WiFi', 'AC', 'Printer', 'Scanner'],
        services: ['Akses E-Journal', 'Akses E-Book', 'Akses Database', 'Printing & Scanning'],
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop',
    },
    {
        id: 8,
        name: 'Quiet Study Zone',
        code: 'QSZ-01',
        location: 'Kampus Bukit Jimbaran',
        building: 'Gedung Perpustakaan Pusat',
        floor: '3',
        type: 'Zona Studi',
        status: 'OPEN',
        description: 'Zona belajar tenang untuk fokus dan konsentrasi maksimal. Dilarang berbicara dan menggunakan telepon.',
        collections: 0,
        readingCapacity: 50,
        operationalHours: 'Senin-Jumat: 08:00-21:00',
        facilities: ['Meja Individual', 'Lampu Baca', 'WiFi', 'AC', 'Colokan Listrik'],
        services: ['Belajar Mandiri', 'Fokus Studi'],
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    },
];

const TYPES = ['Semua Tipe', 'Utama', 'Fakultas', 'Ruang Baca', 'Digital', 'Zona Studi'];
const STATUSES = ['Semua Status', 'OPEN', 'CLOSED'];

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'Utama': return <Library size={20} />;
        case 'Fakultas': return <GraduationCap size={20} />;
        case 'Digital': return <Laptop size={20} />;
        default: return <BookOpen size={20} />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'OPEN': return 'bg-emerald-100 text-emerald-700';
        case 'CLOSED': return 'bg-rose-100 text-rose-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'OPEN': return 'Buka';
        case 'CLOSED': return 'Tutup';
        default: return status;
    }
};

export const PerpustakaanPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('Semua Tipe');
    const [selectedStatus, setSelectedStatus] = useState('Semua Status');
    const [selectedLibrary, setSelectedLibrary] = useState<typeof MOCK_LIBRARIES[0] | null>(null);

    const filteredLibraries = useMemo(() => {
        return MOCK_LIBRARIES.filter(lib => {
            const matchesSearch = lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lib.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lib.building.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = selectedType === 'Semua Tipe' || lib.type === selectedType;
            const matchesStatus = selectedStatus === 'Semua Status' || lib.status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [searchTerm, selectedType, selectedStatus]);

    const stats = useMemo(() => ({
        total: MOCK_LIBRARIES.length,
        totalCollections: MOCK_LIBRARIES.reduce((acc, l) => acc + l.collections, 0),
        totalCapacity: MOCK_LIBRARIES.reduce((acc, l) => acc + l.readingCapacity, 0),
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 shadow-lg shadow-teal-500/20">
                                <BookOpen className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Perpustakaan</h1>
                                <p className="text-xs text-slate-500">Fasilitas Perpustakaan & Ruang Baca</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                    <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white shadow-lg shadow-teal-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-teal-100 text-sm font-medium">Total Perpustakaan</p>
                                <p className="text-3xl font-bold mt-1">{stats.total}</p>
                            </div>
                            <Library size={40} className="text-teal-200" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-lg shadow-indigo-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm font-medium">Total Koleksi</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalCollections.toLocaleString('id-ID')}</p>
                            </div>
                            <BookMarked size={40} className="text-indigo-300" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-white shadow-lg shadow-rose-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-rose-100 text-sm font-medium">Kapasitas Baca</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalCapacity} orang</p>
                            </div>
                            <Users size={40} className="text-rose-300" />
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari perpustakaan..."
                                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:ring-teal-500 sm:text-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-teal-500 focus:bg-white focus:ring-teal-500 sm:text-sm transition-all"
                            >
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-teal-500 focus:bg-white focus:ring-teal-500 sm:text-sm transition-all"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s === 'Semua Status' ? s : getStatusLabel(s)}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Libraries Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredLibraries.map((library) => (
                        <div
                            key={library.id}
                            onClick={() => setSelectedLibrary(library)}
                            className="group cursor-pointer rounded-2xl bg-white overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="relative h-40">
                                <img
                                    src={library.image}
                                    alt={library.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <div className="absolute bottom-3 left-3 right-3">
                                    <p className="font-mono text-xs text-white/80">{library.code}</p>
                                    <h3 className="font-bold text-white line-clamp-1">{library.name}</h3>
                                </div>
                                <span className={`absolute top-3 right-3 rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(library.status)}`}>
                                    {getStatusLabel(library.status)}
                                </span>
                            </div>

                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                        {getTypeIcon(library.type)}
                                        {library.type}
                                    </span>
                                    {library.collections > 0 && (
                                        <span className="text-sm font-bold text-slate-600">
                                            {library.collections.toLocaleString('id-ID')} koleksi
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{library.description}</p>

                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Users size={14} />
                                        <span>{library.readingCapacity} tempat</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} />
                                        <span>{library.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredLibraries.length === 0 && (
                    <div className="text-center py-12">
                        <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Tidak ada perpustakaan yang ditemukan.</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedLibrary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="relative h-56">
                            <img
                                src={selectedLibrary.image}
                                alt={selectedLibrary.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <button
                                onClick={() => setSelectedLibrary(null)}
                                className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="absolute bottom-4 left-4">
                                <p className="font-mono text-sm text-white/80">{selectedLibrary.code}</p>
                                <h2 className="text-2xl font-bold text-white">{selectedLibrary.name}</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${getStatusColor(selectedLibrary.status)}`}>
                                    {getStatusLabel(selectedLibrary.status)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
                                    {getTypeIcon(selectedLibrary.type)}
                                    {selectedLibrary.type}
                                </span>
                            </div>

                            <p className="text-slate-600 mb-6">{selectedLibrary.description}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Lokasi</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedLibrary.building}</p>
                                    <p className="text-sm text-slate-500">Lantai {selectedLibrary.floor}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Kapasitas</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedLibrary.readingCapacity} orang</p>
                                </div>
                                {selectedLibrary.collections > 0 && (
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-slate-500 text-sm">Jumlah Koleksi</p>
                                        <p className="text-2xl font-bold text-slate-900">{selectedLibrary.collections.toLocaleString('id-ID')}</p>
                                    </div>
                                )}
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Jam Operasional</p>
                                    <p className="text-sm font-bold text-slate-900">{selectedLibrary.operationalHours}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-semibold text-slate-900 mb-3">Fasilitas</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLibrary.facilities.map((facility, i) => (
                                        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                            {facility}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Layanan</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLibrary.services.map((service, i) => (
                                        <span key={i} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                                            {service}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
