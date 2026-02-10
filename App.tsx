
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Room, RoomStatus } from './types';
import { Modal } from './components/Modal';
import { RoomDetail } from './components/RoomDetail';
import { CategoryMenu } from './components/CategoryMenu';
import { AssetMap } from './components/AssetMap';
import { Search, Filter, ArrowRight, MapPin, Monitor, Clock, Building2, ChevronDown } from 'lucide-react';
import { isAuthenticated, roomsApi, categoriesApi, locationsApi } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { BuildingsPage } from './pages/BuildingsPage';
import { RoomsPage } from './pages/RoomsPage';
import { AssetsPage } from './pages/AssetsPage';
import { PolygonsPage } from './pages/PolygonsPage';
import { SchedulesPage } from './pages/SchedulesPage';

// E-Lelang Pages
import { AuctionListPage } from './pages/AuctionListPage';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { BidderRegisterPage } from './pages/BidderRegisterPage';
import { BidderLoginPage } from './pages/BidderLoginPage';
import { AdminAuctionsPage } from './pages/AdminAuctionsPage';

// Academic/Public Pages
import { GedungPage } from './pages/GedungPage';
import { LaboratoriumPage } from './pages/LaboratoriumPage';
import { RuangRapatPage } from './pages/RuangRapatPage';
import { PerpustakaanPage } from './pages/PerpustakaanPage';

// Public Home Page Component
const HomePage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState<any[]>([]);

  // Real-time clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsRes, locationsRes] = await Promise.all([
          roomsApi.list({ per_page: 100 }),
          locationsApi.list(),
        ]);

        // Transform API response to match existing Room type
        const transformedRooms = (roomsRes.data || []).map((room: any) => ({
          id: room.id.toString(),
          name: room.name,
          faculty: room.building?.faculty?.name || room.faculty_name || 'N/A',
          capacity: room.capacity,
          status: room.status as RoomStatus,
          currentActivity: room.current_activity || '-',
          nextAvailableTime: room.next_available_time || '-',
          assets: room.assets || [],
          schedule: room.schedules || [],
        }));

        setRooms(transformedRooms);
        setFilteredRooms(transformedRooms);
        setLocations(locationsRes || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to empty array if API fails
        setRooms([]);
        setFilteredRooms([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const results = rooms.filter(room =>
      room.name.toLowerCase().includes(lowerTerm) ||
      room.faculty.toLowerCase().includes(lowerTerm) ||
      room.currentActivity?.toLowerCase().includes(lowerTerm)
    );
    setFilteredRooms(results);
  }, [searchTerm, rooms]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date).replace(/\./g, ':');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Navbar / Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIDIA</h1>
              <p className="text-xs font-medium text-slate-500">Sistem Informasi Digital Aset</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="hidden md:inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              Admin Panel
            </a>
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-mono font-bold text-slate-800">{formatTime(currentTime)}</div>
              <div className="text-sm font-medium text-slate-500">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Category Menu Grid */}
        <CategoryMenu />

        {/* Search & Location Bar */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>

          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Cari Aset</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Kode Gedung, Nama Ruangan..."
                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs text-slate-400">Tekan enter untuk mencari</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">Contoh: Gedung A, Lab Komputer, dll.</p>
          </div>

          {/* Location Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Lokasi</label>
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
              >
                <option value="">-- Select all --</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400">Pilih lokasi spesifik untuk filter peta.</p>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-10">
          <AssetMap />
        </div>

        {/* Room/Asset List Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Daftar Ruangan & Aset</h2>
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
              <Filter size={16} />
              Filter Lanjutan
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="px-6 py-4 font-semibold tracking-wider">Ruangan</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Fakultas</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Aktivitas</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Next</th>
                    <th className="px-6 py-4 text-right font-semibold tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p>Memuat data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Monitor size={32} className="opacity-50" />
                          <p>Tidak ada data ditemukan.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => (
                      <tr key={room.id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-base">{room.name}</p>
                              <p className="text-xs text-slate-500">Cap: {room.capacity}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{room.faculty}</td>
                        <td className="px-6 py-4 text-center">
                          {room.status === RoomStatus.AVAILABLE && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Tersedia
                            </span>
                          )}
                          {room.status === RoomStatus.OCCUPIED && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                              Digunakan
                            </span>
                          )}
                          {room.status === RoomStatus.MAINTENANCE && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Perbaikan
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 truncate max-w-[200px]" title={room.currentActivity || ''}>
                          <span className="text-slate-700 font-medium">{room.currentActivity || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-blue-600 font-mono font-medium text-xs">
                            {room.nextAvailableTime !== '-' && <Clock size={14} />}
                            <span>{room.nextAvailableTime}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedRoom(room)}
                            className="inline-flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-400 transition-all hover:bg-blue-600 hover:text-white hover:shadow-md"
                          >
                            <ArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedRoom && (
        <Modal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          title={selectedRoom.name}
          subtitle={selectedRoom.faculty}
        >
          <RoomDetail room={selectedRoom} />
        </Modal>
      )}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

// Main App Component with Routing
const App: React.FC = () => {
  const [authState, setAuthState] = useState(isAuthenticated());

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        {/* E-Lelang Public Routes */}
        <Route path="/lelang" element={<AuctionListPage />} />
        <Route path="/lelang/:id" element={<AuctionDetailPage />} />
        <Route path="/lelang/register" element={<BidderRegisterPage />} />
        <Route path="/lelang/login" element={<BidderLoginPage />} />

        {/* Academic Public Routes */}
        <Route path="/gedung" element={<GedungPage />} />
        <Route path="/laboratorium" element={<LaboratoriumPage />} />
        <Route path="/ruang-rapat" element={<RuangRapatPage />} />
        <Route path="/perpustakaan" element={<PerpustakaanPage />} />

        {/* Admin Login */}
        <Route
          path="/admin/login"
          element={
            authState
              ? <Navigate to="/admin" replace />
              : <LoginPage onLoginSuccess={() => setAuthState(true)} />
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="buildings" element={<BuildingsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="polygons" element={<PolygonsPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="auctions" element={<AdminAuctionsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
