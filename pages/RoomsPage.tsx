import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    DoorOpen, Search, Loader2, AlertCircle, ShieldAlert, Building2, CheckCircle2,
    Filter, X, ChevronRight, Users, ArrowUp, ArrowDown, ArrowUpDown, Globe, Lock,
} from 'lucide-react';
import { siauApi, adminSiauApi, SiauApiError } from '../api/client';
import type { SiauRoom, SiauBuilding } from '../types';
import { Paginator, PAGE_SIZE_OPTIONS } from '../components/Paginator';
import { SiauRoomModal } from '../components/SiauRoomModal';

/**
 * Admin → Ruangan
 *
 * Read-only directory of SIISYANA rooms via the SIAU Gateway. Previously
 * read SIDIA's local SQLite (28 seeded rows with full CRUD); now reads the
 * authoritative ~2,672 SIISYANA rooms. Clicking a row opens SiauRoomModal
 * for assets/schedule/availability. Distinct from /admin/assets which
 * focuses on browsing the assets in each room.
 */

const FETCH_BATCH_LIMIT = 200;

export const RoomsPage: React.FC = () => {
    const [allRooms, setAllRooms] = useState<SiauRoom[]>([]);
    const [bulkLoading, setBulkLoading] = useState(true);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const fetchTokenRef = useRef(0);

    const [buildings, setBuildings] = useState<SiauBuilding[]>([]);
    const [filterBuildingId, setFilterBuildingId] = useState<string>('');
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(true);

    const [pageSize, setPageSize] = useState<number>(10);
    const [pageIndex, setPageIndex] = useState<number>(0);
    const [selectedRoom, setSelectedRoom] = useState<SiauRoom | null>(null);

    // Per-row visibility toggle pending state, keyed by room id.
    const [visPending, setVisPending] = useState<Record<string, boolean>>({});
    const [visError, setVisError] = useState<string | null>(null);

    // Sort by asset_count. Default 'desc' (most assets first).
    // Cycles on header click: desc → asc → null (natural order).
    const [sortDir, setSortDir] = useState<'desc' | 'asc' | null>('desc');
    const toggleAssetSort = () => {
        setSortDir((d) => (d === 'desc' ? 'asc' : d === 'asc' ? null : 'desc'));
        setPageIndex(0);
    };

    const friendlyError = (e: unknown): string => {
        if (e instanceof SiauApiError) {
            if (e.status === 503 || e.code === 'SIAU_GATEWAY_UNREACHABLE')
                return 'Layanan direktori sedang tidak tersedia.';
            if (e.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar.';
        }
        return 'Tidak dapat memuat data dari gateway.';
    };

    // Buildings (for the Gedung dropdown)
    useEffect(() => {
        siauApi.buildings.list({ limit: 200 })
            .then((res) => setBuildings(res.data))
            .catch(() => setBuildings([]));
    }, []);

    // Bulk fetch rooms — walks the cursor.
    const bulkFetch = useCallback(async () => {
        const token = ++fetchTokenRef.current;
        setBulkLoading(true);
        setBulkError(null);
        setBulkProgress(0);
        setAllRooms([]);

        let cursor: number | null = null;
        const accumulator: SiauRoom[] = [];
        try {
            for (let i = 0; i < 100; i++) {
                const params: { limit: number; cursor?: number; id_gedung?: number } = {
                    limit: FETCH_BATCH_LIMIT,
                };
                if (cursor !== null) params.cursor = cursor;
                if (filterBuildingId) params.id_gedung = Number(filterBuildingId);
                const res = await siauApi.rooms.list(params);
                if (token !== fetchTokenRef.current) return;
                accumulator.push(...res.data);
                setAllRooms([...accumulator]);
                setBulkProgress(accumulator.length);
                const next = res.meta.pagination?.next_cursor ?? null;
                if (next === null) break;
                cursor = next;
            }
        } catch (e) {
            if (token === fetchTokenRef.current) setBulkError(friendlyError(e));
        } finally {
            if (token === fetchTokenRef.current) setBulkLoading(false);
        }
    }, [filterBuildingId]);

    useEffect(() => { bulkFetch(); }, [bulkFetch]);

    useEffect(() => { setPageIndex(0); }, [filterBuildingId, search, pageSize]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const base = !q ? allRooms : allRooms.filter((r) =>
            r.nama.toLowerCase().includes(q) ||
            r.kode_ruangan.toLowerCase().includes(q) ||
            (r.gedung?.nama ?? '').toLowerCase().includes(q) ||
            (r.jenis_ruangan?.nama ?? '').toLowerCase().includes(q)
        );
        if (sortDir === null) return base;
        const withIndex = base.map((r, i) => ({ r, i }));
        withIndex.sort((a, b) => {
            const av = a.r.asset_count ?? 0;
            const bv = b.r.asset_count ?? 0;
            const diff = sortDir === 'desc' ? bv - av : av - bv;
            return diff !== 0 ? diff : a.i - b.i;
        });
        return withIndex.map((x) => x.r);
    }, [allRooms, search, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePageIndex = Math.min(pageIndex, totalPages - 1);
    const pageRows = filtered.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);

    const activeFilterCount = (filterBuildingId ? 1 : 0) + (search.trim() ? 1 : 0);

    const clearFilters = () => {
        setFilterBuildingId('');
        setSearch('');
    };

    const handleToggleVisibility = async (room: SiauRoom, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = !room.is_public;
        setVisError(null);
        setVisPending((p) => ({ ...p, [room.id]: true }));
        // Optimistic update.
        setAllRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, is_public: target } : r)));
        try {
            await adminSiauApi.rooms.setVisibility(room.id, target);
        } catch (err) {
            // Rollback on failure.
            setAllRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, is_public: !target } : r)));
            setVisError(`Gagal mengubah visibilitas ${room.kode_ruangan}.`);
        } finally {
            setVisPending((p) => {
                const { [room.id]: _, ...rest } = p;
                return rest;
            });
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <DoorOpen className="text-blue-600" /> Direktori Ruangan
                </h1>
                <p className="text-slate-500">
                    Daftar ruangan Universitas Udayana dari SIISYANA melalui SIAU Gateway.
                </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-900">
                <ShieldAlert size={16} className="shrink-0" />
                <span>Data ruangan SIISYANA bersifat <b>read-only</b>. Untuk perubahan, gunakan aplikasi SI-ISYANA.</span>
            </div>

            {/* Filter card */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <button
                    onClick={() => setShowFilters((v) => !v)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-500" />
                        <span className="font-semibold text-slate-900">Filter & Pencarian</span>
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold w-6 h-6">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
                    <ChevronRight
                        size={18}
                        className={`text-slate-400 transition-transform ${showFilters ? 'rotate-90' : ''}`}
                    />
                </button>

                {showFilters && (
                    <div className="p-4 border-t border-slate-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Gedung</label>
                                <select
                                    value={filterBuildingId}
                                    onChange={(e) => setFilterBuildingId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
                                >
                                    <option value="">— Semua Gedung —</option>
                                    {buildings.map((b) => (
                                        <option key={b.id} value={b.id}>{b.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Ruangan</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="kode, nama, gedung, atau tipe..."
                                        className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 pl-9 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-500">Filter aktif:</span>
                                {filterBuildingId && (
                                    <FilterChip
                                        label={`Gedung: ${buildings.find((b) => b.id === filterBuildingId)?.nama ?? filterBuildingId}`}
                                        onClear={() => setFilterBuildingId('')}
                                    />
                                )}
                                {search.trim() && (
                                    <FilterChip label={`Cari: ${search}`} onClear={() => setSearch('')} />
                                )}
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-rose-600 hover:text-rose-700 font-medium ml-auto"
                                >
                                    Bersihkan semua
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {visError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2 text-sm text-rose-800">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="flex-1">{visError}</span>
                    <button onClick={() => setVisError(null)} className="text-rose-600 hover:text-rose-700">
                        <X size={14} />
                    </button>
                </div>
            )}

            {bulkError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-rose-900">Tidak dapat memuat daftar ruangan</p>
                        <p className="text-sm text-rose-700">{bulkError}</p>
                    </div>
                    <button onClick={bulkFetch} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-700">
                        Coba lagi
                    </button>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-slate-900">Daftar Ruangan</h2>
                        {bulkLoading && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Loader2 size={12} className="animate-spin" />
                                memuat {bulkProgress}...
                            </span>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Tampilkan</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span>per halaman</span>
                    </label>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                <th className="px-4 py-3 font-semibold">Kode</th>
                                <th className="px-4 py-3 font-semibold">Nama Ruangan</th>
                                <th className="px-4 py-3 font-semibold">Gedung</th>
                                <th className="px-4 py-3 font-semibold">Tipe</th>
                                <th className="px-4 py-3 font-semibold text-right">Kapasitas</th>
                                <th className="px-4 py-3 font-semibold text-center">Validasi</th>
                                <th className="px-4 py-3 font-semibold text-center">Akses</th>
                                <th className="px-4 py-3 font-semibold text-right">
                                    <button
                                        onClick={toggleAssetSort}
                                        className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                                        aria-label={`Urutkan berdasarkan jumlah aset${sortDir ? ` (${sortDir === 'desc' ? 'terbanyak ke tersedikit' : 'tersedikit ke terbanyak'})` : ''}`}
                                    >
                                        Aset
                                        {sortDir === 'desc' ? (
                                            <ArrowDown size={12} className="text-blue-600" />
                                        ) : sortDir === 'asc' ? (
                                            <ArrowUp size={12} className="text-blue-600" />
                                        ) : (
                                            <ArrowUpDown size={12} className="opacity-40" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {bulkLoading && allRooms.length === 0 ? (
                                <tr><td colSpan={9} className="py-12 text-center text-slate-400">
                                    <Loader2 className="inline animate-spin text-blue-600 mr-2" size={18} />
                                    Memuat ruangan dari gateway...
                                </td></tr>
                            ) : pageRows.length === 0 ? (
                                <tr><td colSpan={9} className="py-12 text-center text-slate-400">
                                    {bulkError ? '—' : activeFilterCount > 0 ? 'Tidak ada ruangan yang cocok dengan filter.' : 'Tidak ada ruangan ditemukan.'}
                                </td></tr>
                            ) : (
                                pageRows.map((r) => (
                                    <tr
                                        key={r.id}
                                        onClick={() => setSelectedRoom(r)}
                                        className="group cursor-pointer hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.kode_ruangan}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{r.nama}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Building2 size={14} className="text-slate-400" />
                                                <span className="line-clamp-1">{r.gedung?.nama ?? '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{r.jenis_ruangan?.nama ?? '—'}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">
                                            {r.kapasitas != null ? (
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    <Users size={12} className="text-slate-400" />
                                                    {r.kapasitas}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {r.status_validasi === 'validated' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                                                    <CheckCircle2 size={12} /> Tervalidasi
                                                </span>
                                            ) : r.status_validasi === 'pending' ? (
                                                <span className="inline-flex rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                                                    Menunggu
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={(e) => handleToggleVisibility(r, e)}
                                                disabled={!!visPending[r.id]}
                                                aria-label={`Ubah akses ${r.kode_ruangan} (saat ini ${r.is_public ? 'publik' : 'privat'})`}
                                                title={r.is_public
                                                    ? 'Publik — klik untuk jadikan privat'
                                                    : 'Privat — klik untuk jadikan publik'}
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                                                    r.is_public
                                                        ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                } ${visPending[r.id] ? 'opacity-60 cursor-wait' : ''}`}
                                            >
                                                {visPending[r.id]
                                                    ? <Loader2 size={12} className="animate-spin" />
                                                    : r.is_public
                                                        ? <Globe size={12} />
                                                        : <Lock size={12} />}
                                                {r.is_public ? 'Publik' : 'Privat'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                            <span className={(r.asset_count ?? 0) === 0 ? 'text-slate-400' : ''}>
                                                {r.asset_count ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Paginator
                    pageIndex={safePageIndex}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    pageSize={pageSize}
                    isLoading={bulkLoading}
                    onJump={setPageIndex}
                    label="ruangan"
                />
            </div>

            {selectedRoom && (
                <SiauRoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
            )}
        </div>
    );
};

interface FilterChipProps {
    label: string;
    onClear: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, onClear }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium pl-2 pr-1 py-1">
        {label}
        <button
            onClick={onClear}
            className="rounded-full hover:bg-blue-200 p-0.5"
            aria-label={`Hapus ${label}`}
        >
            <X size={12} />
        </button>
    </span>
);
