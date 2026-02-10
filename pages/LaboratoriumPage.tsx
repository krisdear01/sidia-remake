import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Microscope, MapPin, Users, ArrowLeft, Search, ChevronDown, Beaker, Monitor, Cpu, FlaskConical, Atom } from 'lucide-react';

// Mock data representing Indonesian university laboratories
const MOCK_LABS = [
    {
        id: 1,
        name: 'Laboratorium Kimia Dasar',
        code: 'LAB-KD-01',
        building: 'Gedung MIPA Terpadu',
        faculty: 'Fakultas MIPA',
        floor: 2,
        capacity: 40,
        area: 120,
        status: 'AVAILABLE',
        type: 'Kimia',
        description: 'Laboratorium untuk praktikum kimia dasar mahasiswa tahun pertama.',
        equipment: ['Timbangan analitik', 'Spektrofotometer', 'pH meter', 'Bunsen burner', 'Fume hood'],
        manager: 'Dr. I Made Suarjana, M.Si.',
        operationalHours: '08:00 - 16:00',
    },
    {
        id: 2,
        name: 'Laboratorium Komputer',
        code: 'LAB-KOM-01',
        building: 'Gedung Fakultas Teknik',
        faculty: 'Fakultas Teknik',
        floor: 3,
        capacity: 60,
        area: 180,
        status: 'OCCUPIED',
        type: 'Komputer',
        description: 'Laboratorium komputer dengan workstation modern untuk praktikum pemrograman.',
        equipment: ['PC Workstation (60 unit)', 'Server rack', 'Proyektor', 'Smart board', 'AC sentral'],
        manager: 'I Gede Wahyu Pramartha, S.Kom., M.Eng.',
        operationalHours: '07:00 - 21:00',
    },
    {
        id: 3,
        name: 'Laboratorium Fisika',
        code: 'LAB-FIS-01',
        building: 'Gedung MIPA Terpadu',
        faculty: 'Fakultas MIPA',
        floor: 3,
        capacity: 35,
        area: 100,
        status: 'AVAILABLE',
        type: 'Fisika',
        description: 'Laboratorium fisika untuk eksperimen mekanika, optik, dan elektromagnetisme.',
        equipment: ['Osiloskop', 'Generator fungsi', 'Multimeter digital', 'Perangkat optik', 'Air track'],
        manager: 'Prof. Dr. I Wayan Supardi, M.Si.',
        operationalHours: '08:00 - 16:00',
    },
    {
        id: 4,
        name: 'Laboratorium Biologi Molekuler',
        code: 'LAB-BIO-01',
        building: 'Gedung MIPA Terpadu',
        faculty: 'Fakultas MIPA',
        floor: 4,
        capacity: 25,
        area: 90,
        status: 'AVAILABLE',
        type: 'Biologi',
        description: 'Laboratorium riset biologi molekuler dan genetika dengan peralatan canggih.',
        equipment: ['PCR machine', 'Gel electrophoresis', 'Centrifuge', 'Mikroskop fluoresen', 'Laminar flow'],
        manager: 'Dr. Ni Made Griadhi, M.Biotech.',
        operationalHours: '08:00 - 17:00',
    },
    {
        id: 5,
        name: 'Laboratorium Jaringan',
        code: 'LAB-NET-01',
        building: 'Gedung Fakultas Teknik',
        faculty: 'Fakultas Teknik',
        floor: 4,
        capacity: 30,
        area: 80,
        status: 'MAINTENANCE',
        type: 'Komputer',
        description: 'Laboratorium untuk praktikum jaringan komputer dan keamanan siber.',
        equipment: ['Router Cisco', 'Switch managed', 'Server rack', 'Kabel UTP', 'Crimping tools'],
        manager: 'I Made Oka Widyantara, S.T., M.T.',
        operationalHours: '08:00 - 20:00',
    },
    {
        id: 6,
        name: 'Laboratorium Anatomi',
        code: 'LAB-ANA-01',
        building: 'Gedung Kedokteran',
        faculty: 'Fakultas Kedokteran',
        floor: 1,
        capacity: 50,
        area: 200,
        status: 'OCCUPIED',
        type: 'Kedokteran',
        description: 'Laboratorium anatomi dengan spesimen dan model untuk studi kedokteran.',
        equipment: ['Meja diseksi', 'Model anatomi', 'Mikroskop', 'Spesimen awetan', 'Proyektor 3D'],
        manager: 'Prof. Dr. dr. I Gusti Ngurah Putu Kusuma, Sp.OT.',
        operationalHours: '08:00 - 16:00',
    },
    {
        id: 7,
        name: 'Laboratorium Teknik Sipil',
        code: 'LAB-SIP-01',
        building: 'Gedung Fakultas Teknik',
        faculty: 'Fakultas Teknik',
        floor: 1,
        capacity: 20,
        area: 250,
        status: 'AVAILABLE',
        type: 'Sipil',
        description: 'Laboratorium untuk pengujian material bangunan dan struktur.',
        equipment: ['UTM (Universal Testing Machine)', 'Compression tester', 'Mixer beton', 'Sieve shaker', 'Core drill'],
        manager: 'Ir. I Nyoman Sutarja, M.T.',
        operationalHours: '08:00 - 16:00',
    },
    {
        id: 8,
        name: 'Laboratorium Bahasa',
        code: 'LAB-BHS-01',
        building: 'Gedung Fakultas Ilmu Budaya',
        faculty: 'Fakultas Ilmu Budaya',
        floor: 2,
        capacity: 40,
        area: 100,
        status: 'AVAILABLE',
        type: 'Bahasa',
        description: 'Laboratorium multimedia untuk pembelajaran bahasa asing.',
        equipment: ['Headset audio (40 unit)', 'PC multimedia', 'Software CALL', 'Proyektor', 'Sound system'],
        manager: 'Dr. Ni Luh Putu Krisnawati, S.S., M.Hum.',
        operationalHours: '08:00 - 17:00',
    },
];

const LAB_TYPES = ['Semua Tipe', 'Kimia', 'Fisika', 'Biologi', 'Komputer', 'Kedokteran', 'Sipil', 'Bahasa'];
const STATUSES = ['Semua Status', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'Kimia': return <Beaker size={20} />;
        case 'Fisika': return <Atom size={20} />;
        case 'Biologi': return <FlaskConical size={20} />;
        case 'Komputer': return <Monitor size={20} />;
        case 'Kedokteran': return <Microscope size={20} />;
        default: return <Cpu size={20} />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700';
        case 'OCCUPIED': return 'bg-rose-100 text-rose-700';
        case 'MAINTENANCE': return 'bg-amber-100 text-amber-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'AVAILABLE': return 'Tersedia';
        case 'OCCUPIED': return 'Digunakan';
        case 'MAINTENANCE': return 'Perbaikan';
        default: return status;
    }
};

export const LaboratoriumPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('Semua Tipe');
    const [selectedStatus, setSelectedStatus] = useState('Semua Status');
    const [selectedLab, setSelectedLab] = useState<typeof MOCK_LABS[0] | null>(null);

    const filteredLabs = useMemo(() => {
        return MOCK_LABS.filter(lab => {
            const matchesSearch = lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lab.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lab.faculty.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = selectedType === 'Semua Tipe' || lab.type === selectedType;
            const matchesStatus = selectedStatus === 'Semua Status' || lab.status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [searchTerm, selectedType, selectedStatus]);

    const stats = useMemo(() => ({
        total: MOCK_LABS.length,
        available: MOCK_LABS.filter(l => l.status === 'AVAILABLE').length,
        totalCapacity: MOCK_LABS.reduce((acc, l) => acc + l.capacity, 0),
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-lg shadow-purple-500/20">
                                <Microscope className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Laboratorium</h1>
                                <p className="text-xs text-slate-500">Fasilitas Laboratorium Universitas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                    <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg shadow-purple-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Total Laboratorium</p>
                                <p className="text-3xl font-bold mt-1">{stats.total}</p>
                            </div>
                            <Microscope size={40} className="text-purple-300" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Tersedia Sekarang</p>
                                <p className="text-3xl font-bold mt-1">{stats.available}</p>
                            </div>
                            <Beaker size={40} className="text-emerald-300" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Kapasitas</p>
                                <p className="text-3xl font-bold mt-1">{stats.totalCapacity} orang</p>
                            </div>
                            <Users size={40} className="text-blue-300" />
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
                                placeholder="Cari laboratorium..."
                                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:ring-purple-500 sm:text-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500 sm:text-sm transition-all"
                            >
                                {LAB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500 sm:text-sm transition-all"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s === 'Semua Status' ? s : getStatusLabel(s)}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Labs Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredLabs.map((lab) => (
                        <div
                            key={lab.id}
                            onClick={() => setSelectedLab(lab)}
                            className="group cursor-pointer rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        {getTypeIcon(lab.type)}
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs text-slate-500">{lab.code}</p>
                                        <h3 className="font-bold text-slate-900 line-clamp-1">{lab.name}</h3>
                                    </div>
                                </div>
                                <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(lab.status)}`}>
                                    {getStatusLabel(lab.status)}
                                </span>
                            </div>

                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{lab.description}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                                    {lab.type}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    Lantai {lab.floor}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    {lab.capacity} orang
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <MapPin size={14} />
                                <span>{lab.building}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredLabs.length === 0 && (
                    <div className="text-center py-12">
                        <Microscope size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Tidak ada laboratorium yang ditemukan.</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedLab && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                                        {getTypeIcon(selectedLab.type)}
                                    </div>
                                    <div>
                                        <p className="font-mono text-sm text-slate-500">{selectedLab.code}</p>
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedLab.name}</h2>
                                        <p className="text-slate-600">{selectedLab.faculty}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLab(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${getStatusColor(selectedLab.status)}`}>
                                    {getStatusLabel(selectedLab.status)}
                                </span>
                                <span className="rounded-lg bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                                    {selectedLab.type}
                                </span>
                            </div>

                            <p className="text-slate-600 mb-6">{selectedLab.description}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Kapasitas</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedLab.capacity} orang</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Luas</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedLab.area} m²</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Lokasi</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedLab.building}</p>
                                    <p className="text-sm text-slate-500">Lantai {selectedLab.floor}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Jam Operasional</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedLab.operationalHours}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-semibold text-slate-900 mb-2">Kepala Laboratorium</h4>
                                <p className="text-slate-600">{selectedLab.manager}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">Peralatan Utama</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLab.equipment.map((eq, i) => (
                                        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                            {eq}
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
