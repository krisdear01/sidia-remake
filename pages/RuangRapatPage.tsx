import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, ArrowLeft, Search, ChevronDown, Clock, Wifi, Tv, Coffee, Wind, Video } from 'lucide-react';

// Mock data representing Indonesian university meeting rooms
const MOCK_MEETING_ROOMS = [
    {
        id: 1,
        name: 'Ruang Rapat Utama Rektorat',
        code: 'RR-REK-01',
        building: 'Gedung Rektorat',
        faculty: 'Rektorat',
        floor: 3,
        capacity: 50,
        area: 120,
        status: 'AVAILABLE',
        description: 'Ruang rapat utama untuk kegiatan rapat pimpinan universitas dan pertemuan penting.',
        amenities: ['Proyektor', 'Video Conference', 'AC', 'Sound System', 'WiFi', 'Whiteboard'],
        operationalHours: '08:00 - 17:00',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    },
    {
        id: 2,
        name: 'Ruang Sidang Senat',
        code: 'RR-SEN-01',
        building: 'Gedung Rektorat',
        faculty: 'Rektorat',
        floor: 4,
        capacity: 100,
        area: 250,
        status: 'OCCUPIED',
        description: 'Ruang sidang untuk rapat senat akademik dan kegiatan ceremonial universitas.',
        amenities: ['Podium', 'Proyektor', 'Video Conference', 'AC', 'Sound System', 'WiFi', 'Panggung'],
        operationalHours: '08:00 - 17:00',
        image: 'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?w=400&h=300&fit=crop',
    },
    {
        id: 3,
        name: 'Ruang Rapat Fakultas Teknik',
        code: 'RR-FT-01',
        building: 'Gedung Fakultas Teknik',
        faculty: 'Fakultas Teknik',
        floor: 2,
        capacity: 25,
        area: 60,
        status: 'AVAILABLE',
        description: 'Ruang rapat untuk kegiatan koordinasi fakultas dan prodi di lingkungan FT.',
        amenities: ['Proyektor', 'AC', 'WiFi', 'Whiteboard', 'TV'],
        operationalHours: '07:00 - 21:00',
        image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=400&h=300&fit=crop',
    },
    {
        id: 4,
        name: 'Ruang Meeting Ekonomi A',
        code: 'RR-FE-01',
        building: 'Gedung Fakultas Ekonomi',
        faculty: 'Fakultas Ekonomi dan Bisnis',
        floor: 2,
        capacity: 20,
        area: 45,
        status: 'AVAILABLE',
        description: 'Ruang meeting untuk diskusi dan presentasi tim di FEB.',
        amenities: ['Smart TV', 'AC', 'WiFi', 'Whiteboard'],
        operationalHours: '08:00 - 20:00',
        image: 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=400&h=300&fit=crop',
    },
    {
        id: 5,
        name: 'Ruang Diskusi MIPA',
        code: 'RR-MIPA-01',
        building: 'Gedung MIPA Terpadu',
        faculty: 'Fakultas MIPA',
        floor: 1,
        capacity: 15,
        area: 35,
        status: 'AVAILABLE',
        description: 'Ruang diskusi kecil untuk pembimbingan dan meeting grup riset.',
        amenities: ['TV', 'AC', 'WiFi', 'Whiteboard'],
        operationalHours: '08:00 - 17:00',
        image: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?w=400&h=300&fit=crop',
    },
    {
        id: 6,
        name: 'Mini Auditorium FK',
        code: 'RR-FK-01',
        building: 'Gedung Kedokteran',
        faculty: 'Fakultas Kedokteran',
        floor: 2,
        capacity: 80,
        area: 150,
        status: 'MAINTENANCE',
        description: 'Mini auditorium untuk seminar, workshop, dan presentasi ilmiah FK.',
        amenities: ['Proyektor', 'Video Conference', 'AC', 'Sound System', 'WiFi', 'Podium', 'Panggung kecil'],
        operationalHours: '08:00 - 17:00',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
    },
    {
        id: 7,
        name: 'Ruang Rapat Hukum',
        code: 'RR-FH-01',
        building: 'Gedung Fakultas Hukum',
        faculty: 'Fakultas Hukum',
        floor: 2,
        capacity: 30,
        area: 65,
        status: 'AVAILABLE',
        description: 'Ruang rapat untuk koordinasi fakultas dan kegiatan moot court preparation.',
        amenities: ['Proyektor', 'AC', 'WiFi', 'Whiteboard', 'Sound System'],
        operationalHours: '08:00 - 17:00',
        image: 'https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=400&h=300&fit=crop',
    },
    {
        id: 8,
        name: 'Co-Working Space Perpustakaan',
        code: 'RR-PP-01',
        building: 'Gedung Perpustakaan Pusat',
        faculty: 'Unit Pelaksana Teknis',
        floor: 2,
        capacity: 12,
        area: 40,
        status: 'AVAILABLE',
        description: 'Ruang diskusi dan co-working space untuk mahasiswa dan dosen.',
        amenities: ['Smart TV', 'AC', 'WiFi', 'Colokan listrik', 'Whiteboard'],
        operationalHours: '08:00 - 21:00',
        image: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=400&h=300&fit=crop',
    },
];

const CAPACITY_RANGES = ['Semua Kapasitas', '< 20 orang', '20-50 orang', '> 50 orang'];
const STATUSES = ['Semua Status', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

const getAmenityIcon = (amenity: string) => {
    if (amenity.toLowerCase().includes('wifi')) return <Wifi size={14} />;
    if (amenity.toLowerCase().includes('tv') || amenity.toLowerCase().includes('proyektor')) return <Tv size={14} />;
    if (amenity.toLowerCase().includes('video')) return <Video size={14} />;
    if (amenity.toLowerCase().includes('ac')) return <Wind size={14} />;
    return <Coffee size={14} />;
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

export const RuangRapatPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCapacity, setSelectedCapacity] = useState('Semua Kapasitas');
    const [selectedStatus, setSelectedStatus] = useState('Semua Status');
    const [selectedRoom, setSelectedRoom] = useState<typeof MOCK_MEETING_ROOMS[0] | null>(null);

    const filteredRooms = useMemo(() => {
        return MOCK_MEETING_ROOMS.filter(room => {
            const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.building.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesCapacity = true;
            if (selectedCapacity === '< 20 orang') {
                matchesCapacity = room.capacity < 20;
            } else if (selectedCapacity === '20-50 orang') {
                matchesCapacity = room.capacity >= 20 && room.capacity <= 50;
            } else if (selectedCapacity === '> 50 orang') {
                matchesCapacity = room.capacity > 50;
            }

            const matchesStatus = selectedStatus === 'Semua Status' || room.status === selectedStatus;

            return matchesSearch && matchesCapacity && matchesStatus;
        });
    }, [searchTerm, selectedCapacity, selectedStatus]);

    const stats = useMemo(() => ({
        total: MOCK_MEETING_ROOMS.length,
        available: MOCK_MEETING_ROOMS.filter(r => r.status === 'AVAILABLE').length,
        totalCapacity: MOCK_MEETING_ROOMS.reduce((acc, r) => acc + r.capacity, 0),
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20">
                                <Users className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Ruang Rapat</h1>
                                <p className="text-xs text-slate-500">Fasilitas Ruang Meeting Universitas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm font-medium">Total Ruang Rapat</p>
                                <p className="text-3xl font-bold mt-1">{stats.total}</p>
                            </div>
                            <Users size={40} className="text-amber-200" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Tersedia Sekarang</p>
                                <p className="text-3xl font-bold mt-1">{stats.available}</p>
                            </div>
                            <Clock size={40} className="text-emerald-300" />
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
                                placeholder="Cari ruang rapat..."
                                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:ring-amber-500 sm:text-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedCapacity}
                                onChange={(e) => setSelectedCapacity(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-amber-500 sm:text-sm transition-all"
                            >
                                {CAPACITY_RANGES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-amber-500 sm:text-sm transition-all"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s === 'Semua Status' ? s : getStatusLabel(s)}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <div
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className="group cursor-pointer rounded-2xl bg-white overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="relative h-40">
                                <img
                                    src={room.image}
                                    alt={room.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <div className="absolute bottom-3 left-3 right-3">
                                    <p className="font-mono text-xs text-white/80">{room.code}</p>
                                    <h3 className="font-bold text-white line-clamp-1">{room.name}</h3>
                                </div>
                                <span className={`absolute top-3 right-3 rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(room.status)}`}>
                                    {getStatusLabel(room.status)}
                                </span>
                            </div>

                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-600">{room.building}</span>
                                    <span className="text-sm font-bold text-amber-600">{room.capacity} orang</span>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-3">
                                    {room.amenities.slice(0, 4).map((amenity, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                            {getAmenityIcon(amenity)}
                                            <span className="hidden sm:inline">{amenity}</span>
                                        </span>
                                    ))}
                                    {room.amenities.length > 4 && (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                            +{room.amenities.length - 4}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={14} />
                                    <span>{room.operationalHours}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredRooms.length === 0 && (
                    <div className="text-center py-12">
                        <Users size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Tidak ada ruang rapat yang ditemukan.</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="relative h-56">
                            <img
                                src={selectedRoom.image}
                                alt={selectedRoom.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="absolute bottom-4 left-4">
                                <p className="font-mono text-sm text-white/80">{selectedRoom.code}</p>
                                <h2 className="text-2xl font-bold text-white">{selectedRoom.name}</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${getStatusColor(selectedRoom.status)}`}>
                                    {getStatusLabel(selectedRoom.status)}
                                </span>
                                <span className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                                    Kapasitas {selectedRoom.capacity} orang
                                </span>
                            </div>

                            <p className="text-slate-600 mb-6">{selectedRoom.description}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Lokasi</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedRoom.building}</p>
                                    <p className="text-sm text-slate-500">Lantai {selectedRoom.floor}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-slate-500 text-sm">Luas Ruangan</p>
                                    <p className="text-2xl font-bold text-slate-900">{selectedRoom.area} m²</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 col-span-2">
                                    <p className="text-slate-500 text-sm">Jam Operasional</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedRoom.operationalHours}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Fasilitas</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRoom.amenities.map((amenity, i) => (
                                        <span key={i} className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                                            {getAmenityIcon(amenity)}
                                            {amenity}
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
