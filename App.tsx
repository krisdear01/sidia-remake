
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CategoryMenu } from './components/CategoryMenu';
import { AssetMap } from './components/AssetMap';
import { SiauRoomModal } from './components/SiauRoomModal';
import { MapDetailModal } from './components/MapDetailModal';
import { Paginator, PAGE_SIZE_OPTIONS } from './components/Paginator';
import { Search, Filter, ArrowRight, MapPin, Monitor, Building2, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { isAuthenticated, siauApi, SiauApiError } from './api/client';
import type { SiauRoom, SiauBuilding, SiauSearchResults, PolygonFeatureProperties } from './types';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { BuildingsPage } from './pages/BuildingsPage';
import { RoomsPage } from './pages/RoomsPage';
import { AssetsPage } from './pages/AssetsPage';
import { PolygonsPage } from './pages/PolygonsPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { RoomUtilizationPage } from './pages/RoomUtilizationPage';
import { IdentityMapPage } from './pages/admin/IdentityMapPage';
import { CetakDbrPage } from './pages/admin/CetakDbrPage';
import { PenyusutanAsetPage } from './pages/PenyusutanAsetPage';

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
  const [selectedRoom, setSelectedRoom] = useState<SiauRoom | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState<SiauRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SiauApiError | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [buildings, setBuildings] = useState<SiauBuilding[]>([]);
  const fetchTokenRef = useRef(0);

  // Sort by asset_count. Default 'desc' (most assets first).
  // Cycles on header click: desc → asc → null (natural order).
  const [assetSort, setAssetSort] = useState<'desc' | 'asc' | null>('desc');
  const toggleAssetSort = () =>
    setAssetSort((d) => (d === 'desc' ? 'asc' : d === 'asc' ? null : 'desc'));

  // Advanced filters (Filter Lanjutan)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterTipe, setFilterTipe] = useState('');
  const [filterValidasi, setFilterValidasi] = useState<'' | 'validated' | 'pending'>('');
  const advancedActiveCount = (filterTipe ? 1 : 0) + (filterValidasi ? 1 : 0);
  const resetAdvanced = () => { setFilterTipe(''); setFilterValidasi(''); };

  // Client-side pagination for the room table.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Global "Cari Aset" search (gedung / ruangan / tanah / aset).
  const [searchResults, setSearchResults] = useState<SiauSearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Detail modals opened from a search result.
  const [detailFeature, setDetailFeature] = useState<PolygonFeatureProperties | null>(null);
  const [detailCentroid, setDetailCentroid] = useState<[number, number] | null>(null);
  const [roomModal, setRoomModal] = useState<SiauRoom | null>(null);

  // Debounced global search: >=2 chars, 250ms.
  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await siauApi.search(q, 8);
        if (!cancelled) { setSearchResults(res.data); setSearchOpen(true); }
      } catch {
        if (!cancelled) setSearchResults(null);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchTerm]);

  const openGedung = (id: string) => {
    setDetailFeature({ asset_type: 'bangunan', siisyana_gedung_id: Number(id), siisyana_tanah_id: null, name: 'Gedung' } as PolygonFeatureProperties);
    setDetailCentroid(null); setSearchOpen(false);
  };
  const openTanah = (id: string) => {
    setDetailFeature({ asset_type: 'tanah', siisyana_gedung_id: null, siisyana_tanah_id: Number(id), name: 'Tanah' } as PolygonFeatureProperties);
    setDetailCentroid(null); setSearchOpen(false);
  };
  const openRoomById = async (roomId: string) => {
    setSearchOpen(false);
    try { const r = await siauApi.rooms.get(roomId); setRoomModal(r.data); } catch { /* ignore */ }
  };

  const searchTotal = searchResults
    ? searchResults.gedung.length + searchResults.ruangan.length + searchResults.tanah.length + searchResults.aset.length
    : 0;

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load buildings (for the filter dropdown)
  useEffect(() => {
    siauApi.buildings.list({ limit: 200 })
      .then((res) => setBuildings(res.data))
      .catch(() => setBuildings([]));
  }, []);

  // Bulk-fetch all rooms — walk the cursor sequentially so sort-by-aset is
  // global, not just the first page. Re-runs whenever the server-side filter
  // (Gedung) changes.
  const bulkFetch = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setLoading(true);
    setError(null);
    setRooms([]);

    let cursor: number | null = null;
    const accumulator: SiauRoom[] = [];
    try {
      for (let i = 0; i < 100; i++) {
        const params: { id_gedung?: number; limit: number; cursor?: number } = { limit: 200 };
        if (cursor !== null) params.cursor = cursor;
        if (selectedBuilding) params.id_gedung = Number(selectedBuilding);
        const res = await siauApi.rooms.list(params);
        if (token !== fetchTokenRef.current) return;
        accumulator.push(...res.data);
        setRooms([...accumulator]);
        const next = res.meta.pagination?.next_cursor ?? null;
        if (next === null) break;
        cursor = next;
      }
    } catch (e: unknown) {
      if (token !== fetchTokenRef.current) return;
      setError(e instanceof SiauApiError ? e : new SiauApiError('UNKNOWN', 0, 'Gagal memuat data ruangan.'));
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [selectedBuilding]);

  useEffect(() => { bulkFetch(); }, [bulkFetch]);

  // Distinct room types for the advanced "Tipe" filter, from loaded data.
  const tipeOptions = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => { if (r.jenis_ruangan?.nama) set.add(r.jenis_ruangan.nama); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let base = !q ? rooms : rooms.filter((r) =>
      r.nama.toLowerCase().includes(q) ||
      r.kode_ruangan.toLowerCase().includes(q) ||
      (r.gedung?.nama ?? '').toLowerCase().includes(q) ||
      (r.jenis_ruangan?.nama ?? '').toLowerCase().includes(q)
    );
    if (filterTipe) base = base.filter((r) => r.jenis_ruangan?.nama === filterTipe);
    if (filterValidasi) base = base.filter((r) => r.status_validasi === filterValidasi);
    if (assetSort === null) return base;
    const withIndex = base.map((r, i) => ({ r, i }));
    withIndex.sort((a, b) => {
      const av = a.r.asset_count ?? 0;
      const bv = b.r.asset_count ?? 0;
      const diff = assetSort === 'desc' ? bv - av : av - bv;
      return diff !== 0 ? diff : a.i - b.i;
    });
    return withIndex.map((x) => x.r);
  }, [rooms, searchTerm, assetSort, filterTipe, filterValidasi]);

  // Reset to the first page whenever the filtered set changes.
  useEffect(() => { setPageIndex(0); }, [searchTerm, selectedBuilding, filterTipe, filterValidasi, assetSort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRooms = useMemo(
    () => filteredRooms.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize),
    [filteredRooms, safePageIndex, pageSize]
  );

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <MapPin className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIAU</h1>
              <p className="text-xs font-medium text-slate-500">Sistem Informasi Aset Udayana</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-mono font-bold text-slate-800">{formatTime(currentTime)}</div>
              <div className="text-sm font-medium text-slate-500">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">

        {/* Category Menu Grid */}
        <CategoryMenu />

        {/* Search & Location Bar */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>

          {/* Search Input + global results dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Cari Aset</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Gedung, ruangan, tanah, atau aset..."
                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 pr-9 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => { if (searchResults) setSearchOpen(true); }}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              />
              {searchLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                </div>
              )}

              {/* Results dropdown */}
              {searchOpen && searchTerm.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {searchTotal === 0 && !searchLoading ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">Tidak ada hasil untuk "{searchTerm.trim()}".</p>
                  ) : (
                    <div className="py-1 text-sm">
                      <SearchGroup label="Gedung" items={searchResults?.gedung ?? []} render={(g: any) => (
                        <button key={`g${g.id}`} onMouseDown={(e) => { e.preventDefault(); openGedung(g.id); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                          <Building2 size={16} className="text-blue-600 shrink-0" />
                          <span className="min-w-0"><span className="font-medium text-slate-900">{g.nama}</span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">{g.kode}{g.nomor_kib ? ` · KIB ${g.nomor_kib}` : ''}</span></span>
                        </button>
                      )} />
                      <SearchGroup label="Ruangan" items={searchResults?.ruangan ?? []} render={(r: any) => (
                        <button key={`r${r.id}`} onMouseDown={(e) => { e.preventDefault(); openRoomById(r.id); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                          <Monitor size={16} className="text-emerald-600 shrink-0" />
                          <span className="min-w-0"><span className="font-medium text-slate-900">{r.nama}</span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">{r.kode_ruangan}</span>
                            {r.gedung_nama && <span className="ml-2 text-xs text-slate-400">· {r.gedung_nama}</span>}</span>
                        </button>
                      )} />
                      <SearchGroup label="Tanah" items={searchResults?.tanah ?? []} render={(t: any) => (
                        <button key={`t${t.id}`} onMouseDown={(e) => { e.preventDefault(); openTanah(t.id); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                          <MapPin size={16} className="text-amber-600 shrink-0" />
                          <span className="min-w-0"><span className="font-medium text-slate-900">{t.nomor_shp ?? t.nomor_kib ?? 'Tanah'}</span>
                            {t.lokasi && <span className="ml-2 text-xs text-slate-400">{t.lokasi}</span>}</span>
                        </button>
                      )} />
                      <SearchGroup label="Aset" items={searchResults?.aset ?? []} render={(a: any) => (
                        <button key={`a${a.id}`} disabled={!a.id_ruangan} onMouseDown={(e) => { e.preventDefault(); if (a.id_ruangan) openRoomById(a.id_ruangan); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 disabled:opacity-50">
                          <Building2 size={16} className="text-purple-600 shrink-0" />
                          <span className="min-w-0"><span className="font-medium text-slate-900">{a.nama_barang}</span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">{a.kode_barang}</span>
                            {a.merk_type && <span className="ml-2 text-xs text-slate-400">· {a.merk_type}</span>}</span>
                        </button>
                      )} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">Cari gedung, ruangan, tanah, atau aset dari data SIISYANA.</p>
          </div>

          {/* Building Dropdown (sourced from SIAU gateway) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Gedung</label>
            <div className="relative">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all"
              >
                <option value="">-- Semua Gedung --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.nama}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400">Filter daftar ruangan berdasarkan gedung.</p>
          </div>
        </div>

        {/* Map Section — homepage shows land/tanah only (buildings live on /gedung) */}
        <div className="mb-10">
          <AssetMap landOnly />
        </div>

        {/* Room/Asset List Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-slate-900">Daftar Ruangan & Aset</h2>
              <span className="text-sm text-slate-400">{filteredRooms.length} hasil</span>
              <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                Tampilkan
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-slate-300 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                / halaman
              </label>
            </div>
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              aria-expanded={showAdvanced}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                showAdvanced || advancedActiveCount > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={16} />
              Filter Lanjutan
              {advancedActiveCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                  {advancedActiveCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced filter panel */}
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipe Ruangan</label>
                <div className="relative">
                  <select
                    value={filterTipe}
                    onChange={(e) => setFilterTipe(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-2.5 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Semua Tipe --</option>
                    {tipeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status Validasi</label>
                <div className="relative">
                  <select
                    value={filterValidasi}
                    onChange={(e) => setFilterValidasi(e.target.value as '' | 'validated' | 'pending')}
                    className="block w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 p-2.5 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Semua Status --</option>
                    <option value="validated">Tervalidasi</option>
                    <option value="pending">Menunggu</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetAdvanced}
                  disabled={advancedActiveCount === 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="px-6 py-4 font-semibold tracking-wider">Ruangan</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Gedung</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Tipe</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Validasi</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">
                      <button
                        onClick={toggleAssetSort}
                        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 transition-colors"
                        aria-label={`Urutkan berdasarkan jumlah aset${assetSort ? ` (${assetSort === 'desc' ? 'terbanyak ke tersedikit' : 'tersedikit ke terbanyak'})` : ''}`}
                      >
                        Aset
                        {assetSort === 'desc' ? (
                          <ArrowDown size={12} className="text-blue-600" />
                        ) : assetSort === 'asc' ? (
                          <ArrowUp size={12} className="text-blue-600" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
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
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-rose-600">
                        Layanan direktori sedang tidak tersedia.
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
                    pagedRooms.map((room) => (
                      <tr key={room.id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-base line-clamp-1">{room.nama}</p>
                              <p className="text-xs text-slate-500">
                                {room.kode_ruangan}
                                {room.kapasitas != null && <> · Cap: {room.kapasitas}</>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{room.gedung?.nama ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-600">{room.jenis_ruangan?.nama ?? '—'}</td>
                        <td className="px-6 py-4 text-center">
                          {room.status_validasi === 'validated' ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Tervalidasi
                            </span>
                          ) : room.status_validasi === 'pending' ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Menunggu
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-700 font-medium">
                          {room.asset_count ?? 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedRoom(room)}
                            aria-label={`Detail ${room.nama}`}
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
              {loading && rooms.length > 0 && (
                <div className="border-t border-slate-100 p-3 text-center text-xs text-slate-500">
                  Memuat lainnya... ({rooms.length})
                </div>
              )}
            </div>
            {!error && filteredRooms.length > 0 && (
              <Paginator
                pageIndex={safePageIndex}
                totalPages={totalPages}
                totalItems={filteredRooms.length}
                pageSize={pageSize}
                isLoading={loading}
                onJump={(p) => setPageIndex(Math.min(Math.max(0, p), totalPages - 1))}
                label="ruangan"
              />
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal — lazy-loads assets, schedule, availability from SIAU gateway */}
      {selectedRoom && (
        <SiauRoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}

      {/* Search-result detail: gedung/tanah -> MapDetailModal; ruangan/aset -> SiauRoomModal */}
      <MapDetailModal
        isOpen={detailFeature !== null}
        onClose={() => setDetailFeature(null)}
        feature={detailFeature}
        centroid={detailCentroid}
      />
      {roomModal && (
        <SiauRoomModal room={roomModal} onClose={() => setRoomModal(null)} />
      )}
    </div>
  );
};

/** Section in the global-search dropdown; renders nothing when empty. */
const SearchGroup: React.FC<{ label: string; items: any[]; render: (item: any) => React.ReactNode }> = ({ label, items, render }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      {items.map(render)}
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
        <Route path="/lab" element={<LaboratoriumPage />} />
        <Route path="/ruang-rapat" element={<RuangRapatPage />} />
        <Route path="/perpustakaan" element={<PerpustakaanPage />} />
        <Route path="/perpus" element={<PerpustakaanPage />} />

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
          <Route path="validate-rooms" element={<IdentityMapPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="penyusutan" element={<PenyusutanAsetPage />} />
          <Route path="polygons" element={<PolygonsPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="utilitas-ruangan" element={<RoomUtilizationPage />} />
          <Route path="auctions" element={<AdminAuctionsPage />} />
        </Route>

        {/* Standalone admin print views — protected but outside AdminLayout so they print clean */}
        <Route
          path="/admin/cetak/dbr/:roomId"
          element={
            <ProtectedRoute>
              <CetakDbrPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
