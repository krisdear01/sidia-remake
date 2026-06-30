import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    Package, Search, Loader2, AlertCircle, Building2, ChevronRight,
    ShieldAlert, ArrowLeft, X, Filter, ArrowUp, ArrowDown, ArrowUpDown,
    Plus, Trash2, Sparkles, Printer, FileSpreadsheet,
} from 'lucide-react';
import { siauApi, SiauApiError, adminSiauApi } from '../api/client';
import type { SiauRoom, SiauAsset, SiauBuilding, HibahAssetInput, DbrPayload } from '../types';
import { Paginator, PAGE_SIZE_OPTIONS } from '../components/Paginator';

/**
 * Admin → Aset
 *
 * Read-only browser of SIISYANA assets via the SIAU gateway.
 *
 * Data flow:
 *   - On mount and whenever the Gedung filter changes, pre-fetch ALL matching
 *     rooms from the gateway in batches of 200 (cursor-based). Stored as a
 *     single in-memory list.
 *   - Page size selector, page number jumps, and text search all operate
 *     client-side against that list — instant after the initial load.
 *   - The progress indicator shows how many rooms have been loaded so far;
 *     the paginator total updates live as more arrive.
 *   - Selecting a room fetches its assets via /rooms/{id}/assets.
 *
 * SIISYANA is the authoritative source — this page is read-only.
 */

const FETCH_BATCH_LIMIT = 200;

export const AssetsPage: React.FC = () => {
    // --- bulk room dataset ---
    const [allRooms, setAllRooms] = useState<SiauRoom[]>([]);
    const [bulkLoading, setBulkLoading] = useState(true);
    const [bulkProgress, setBulkProgress] = useState(0); // rooms loaded so far
    const [bulkError, setBulkError] = useState<string | null>(null);
    const fetchTokenRef = useRef(0); // race-guard for filter changes mid-fetch

    // --- filters ---
    const [buildings, setBuildings] = useState<SiauBuilding[]>([]);
    const [filterBuildingId, setFilterBuildingId] = useState<string>(''); // '' = all
    const [filterKode, setFilterKode] = useState('');
    const [filterNama, setFilterNama] = useState('');
    const [showFilters, setShowFilters] = useState(true);

    // --- pagination (client-side) ---
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageIndex, setPageIndex] = useState<number>(0); // 0-based

    // --- sorting (client-side) ---
    // null = natural cursor order (SIISYANA id ASC).
    // Cycles on header click: null → desc → asc → null.
    const [sortDir, setSortDir] = useState<'desc' | 'asc' | null>(null);
    const toggleAssetSort = () => {
        setSortDir((d) => (d === null ? 'desc' : d === 'desc' ? 'asc' : null));
        setPageIndex(0); // jump back to page 1 after re-sorting
    };

    // --- selected room + its assets ---
    const [selectedRoom, setSelectedRoom] = useState<SiauRoom | null>(null);
    const [assets, setAssets] = useState<SiauAsset[] | null>(null);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsError, setAssetsError] = useState<string | null>(null);
    const [assetsReloadTick, setAssetsReloadTick] = useState(0);

    // --- hibah modal + delete state ---
    const [showHibahModal, setShowHibahModal] = useState(false);
    const [deletingHibahId, setDeletingHibahId] = useState<number | null>(null);
    const [hibahMessage, setHibahMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    // --- DBR export state ---
    const [dbrExporting, setDbrExporting] = useState(false);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const friendlyError = (e: unknown): string => {
        if (e instanceof SiauApiError) {
            if (e.status === 503 || e.code === 'SIAU_GATEWAY_UNREACHABLE')
                return 'Layanan direktori sedang tidak tersedia.';
            if (e.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar.';
        }
        return 'Tidak dapat memuat data dari gateway.';
    };

    // -------------------------------------------------------------------------
    // Buildings (for the Gedung dropdown)
    // -------------------------------------------------------------------------
    useEffect(() => {
        siauApi.buildings.list({ limit: 200 })
            .then((res) => setBuildings(res.data))
            .catch(() => setBuildings([]));
    }, []);

    // -------------------------------------------------------------------------
    // Bulk fetch rooms — walks the cursor sequentially until exhausted.
    // Re-runs whenever the server-side filter (Gedung) changes.
    // -------------------------------------------------------------------------
    const bulkFetch = useCallback(async () => {
        const token = ++fetchTokenRef.current;
        setBulkLoading(true);
        setBulkError(null);
        setBulkProgress(0);
        setAllRooms([]);

        let cursor: number | null = null;
        const accumulator: SiauRoom[] = [];

        try {
            // Hard upper bound to avoid an infinite loop if the gateway misbehaves.
            for (let i = 0; i < 100; i++) {
                const params: { limit: number; cursor?: number; id_gedung?: number } = {
                    limit: FETCH_BATCH_LIMIT,
                };
                if (cursor !== null) params.cursor = cursor;
                if (filterBuildingId) params.id_gedung = Number(filterBuildingId);

                const res = await siauApi.rooms.list(params);

                // Filter changed underneath us — abandon this run.
                if (token !== fetchTokenRef.current) return;

                accumulator.push(...res.data);
                setAllRooms([...accumulator]);
                setBulkProgress(accumulator.length);

                const next: number | null = res.meta.pagination?.next_cursor ?? null;
                if (next === null) break;
                cursor = next;
            }
        } catch (e) {
            if (token === fetchTokenRef.current) setBulkError(friendlyError(e));
        } finally {
            if (token === fetchTokenRef.current) setBulkLoading(false);
        }
    }, [filterBuildingId]);

    useEffect(() => {
        bulkFetch();
    }, [bulkFetch]);

    // Reset to page 1 when filters or page size change.
    useEffect(() => {
        setPageIndex(0);
    }, [filterBuildingId, filterKode, filterNama, pageSize]);

    // -------------------------------------------------------------------------
    // Client-side filter + sort + paginate
    // -------------------------------------------------------------------------
    const visibleRooms = useMemo(() => {
        const kodeQ = filterKode.trim().toLowerCase();
        const namaQ = filterNama.trim().toLowerCase();
        const filtered = (!kodeQ && !namaQ)
            ? allRooms
            : allRooms.filter((r) =>
                (!kodeQ || r.kode_ruangan.toLowerCase().includes(kodeQ)) &&
                (!namaQ || r.nama.toLowerCase().includes(namaQ))
            );

        if (sortDir === null) return filtered;
        // Stable sort by asset_count; preserve original order as tiebreaker.
        const withIndex = filtered.map((r, i) => ({ r, i }));
        withIndex.sort((a, b) => {
            const av = a.r.asset_count ?? 0;
            const bv = b.r.asset_count ?? 0;
            const diff = sortDir === 'desc' ? bv - av : av - bv;
            return diff !== 0 ? diff : a.i - b.i;
        });
        return withIndex.map((x) => x.r);
    }, [allRooms, filterKode, filterNama, sortDir]);

    const totalPages = Math.max(1, Math.ceil(visibleRooms.length / pageSize));
    const safePageIndex = Math.min(pageIndex, totalPages - 1);
    const pagedRooms = useMemo(
        () => visibleRooms.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize),
        [visibleRooms, safePageIndex, pageSize]
    );

    const clearAllFilters = () => {
        setFilterBuildingId('');
        setFilterKode('');
        setFilterNama('');
    };

    const activeFilterCount =
        (filterBuildingId ? 1 : 0) +
        (filterKode.trim() ? 1 : 0) +
        (filterNama.trim() ? 1 : 0);

    // -------------------------------------------------------------------------
    // Assets for selected room (re-fetches when assetsReloadTick bumps)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!selectedRoom) {
            setAssets(null);
            setAssetsError(null);
            return;
        }
        let cancelled = false;
        setAssetsLoading(true);
        setAssetsError(null);
        siauApi.rooms.assets(selectedRoom.id, { limit: 200 })
            .then((res) => { if (!cancelled) setAssets(res.data); })
            .catch((e: unknown) => { if (!cancelled) setAssetsError(friendlyError(e)); })
            .finally(() => { if (!cancelled) setAssetsLoading(false); });
        return () => { cancelled = true; };
    }, [selectedRoom, assetsReloadTick]);

    // Clear any toast after 4s.
    useEffect(() => {
        if (!hibahMessage) return;
        const t = setTimeout(() => setHibahMessage(null), 4000);
        return () => clearTimeout(t);
    }, [hibahMessage]);

    const handleHibahCreated = () => {
        setShowHibahModal(false);
        setHibahMessage({ kind: 'success', text: 'Aset hibah berhasil ditambahkan.' });
        setAssetsReloadTick((n) => n + 1);
    };

    const handleCetakDbr = (roomId: string) => {
        window.open(`/admin/cetak/dbr/${roomId}`, '_blank', 'noopener,noreferrer');
    };

    const handleExportXlsx = async (room: SiauRoom) => {
        setDbrExporting(true);
        try {
            const res = await adminSiauApi.rooms.getDbr(room.id);
            const dbr = res.data as DbrPayload;
            const XLSX = await import('xlsx');

            // Header rows mirror the printable layout.
            const headerRows: (string | number | null)[][] = [
                [dbr.document.kementerian],
                [dbr.document.satker],
                [dbr.room.unit.panjang ?? ''],
                [dbr.document.judul],
                [],
                ['UPB', dbr.room.unit.panjang ?? '—'],
                ['Gedung', dbr.room.gedung.nama ?? '—'],
                ['Nama Ruangan', dbr.room.nama],
                ['Kode Ruangan', dbr.room.kode_ruangan],
                ['Jenis Ruangan', dbr.room.jenis_ruangan ?? '—'],
                ['Kapasitas', dbr.room.kapasitas ?? '—'],
                ['Penanggung Jawab', dbr.room.penanggung_jawab?.nama ?? 'Belum ditetapkan'],
                [],
                ['No.', 'Kode Barang', 'NUP', 'Nama Barang', 'Merk/Type', 'Tahun Perolehan', 'Jumlah', 'Keadaan', 'Nilai Perolehan (Rp)', 'Keterangan'],
            ];
            const assetRows = dbr.assets.map((a, i) => [
                i + 1,
                a.kode_barang + (a.source === 'hibah' ? ' (HIBAH)' : ''),
                a.no_aset ?? '',
                a.nama_barang,
                a.merk_type ?? '',
                a.tahun_perolehan ?? '',
                a.kuantitas ?? '',
                a.kondisi === 'Baik' ? 'B'
                    : a.kondisi === 'Rusak Ringan' ? 'RR'
                    : a.kondisi === 'Rusak Berat' ? 'RB' : '',
                a.nilai_perolehan ?? '',
                a.keterangan ?? '',
            ]);
            const totalRow = [
                '', '', '', '', '', `TOTAL (${dbr.totals.count} barang)`,
                dbr.assets.reduce((s, a) => s + (a.kuantitas ?? 0), 0),
                '', dbr.totals.nilai_perolehan, '',
            ];
            const allRows = [...headerRows, ...assetRows, totalRow];

            const ws = XLSX.utils.aoa_to_sheet(allRows);
            ws['!cols'] = [
                { wch: 5 }, { wch: 18 }, { wch: 8 }, { wch: 32 }, { wch: 18 },
                { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 22 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'DBR');

            const safeKode = room.kode_ruangan.replace(/[^A-Za-z0-9._-]+/g, '_');
            const filename = `DBR_${safeKode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, filename);

            setHibahMessage({ kind: 'success', text: `DBR ${room.kode_ruangan} diunduh.` });
        } catch (e: any) {
            setHibahMessage({ kind: 'error', text: 'Gagal mengekspor DBR ke Excel.' });
        } finally {
            setDbrExporting(false);
        }
    };

    const handleHibahDelete = async (hibahId: number, kode: string) => {
        if (!confirm(`Hapus aset hibah ${kode}? Tindakan ini tidak bisa dibatalkan.`)) return;
        setDeletingHibahId(hibahId);
        try {
            await adminSiauApi.hibahAssets.delete(hibahId);
            setHibahMessage({ kind: 'success', text: `Aset hibah ${kode} dihapus.` });
            setAssetsReloadTick((n) => n + 1);
        } catch (e: any) {
            setHibahMessage({ kind: 'error', text: 'Gagal menghapus aset hibah.' });
        } finally {
            setDeletingHibahId(null);
        }
    };

    // -------------------------------------------------------------------------
    // Asset detail view
    // -------------------------------------------------------------------------
    if (selectedRoom) {
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => setSelectedRoom(null)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mt-1"
                    >
                        <ArrowLeft size={18} /> Kembali
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900">
                            <span className="font-mono text-base text-blue-600 mr-2">{selectedRoom.kode_ruangan}</span>
                            {selectedRoom.nama}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {selectedRoom.gedung?.nama ?? '—'}
                            {selectedRoom.jenis_ruangan?.nama && <> · {selectedRoom.jenis_ruangan.nama}</>}
                            {selectedRoom.kapasitas != null && <> · Kapasitas {selectedRoom.kapasitas}</>}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-900">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>Data aset SIISYANA bersifat <b>read-only</b>. Aset Hibah (BETA) tersimpan terpisah di SIAU Gateway.</span>
                </div>

                {hibahMessage && (
                    <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                        hibahMessage.kind === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border border-rose-200 text-rose-900'
                    }`}>
                        {hibahMessage.kind === 'success'
                            ? <Sparkles size={16} />
                            : <AlertCircle size={16} />}
                        <span>{hibahMessage.text}</span>
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <h2 className="font-semibold text-slate-900">Aset di ruangan ini</h2>
                            <span className="text-xs text-slate-500">
                                {assetsLoading ? '...' : assets ? `${assets.length} aset` : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => handleCetakDbr(selectedRoom.id)}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 text-sm font-medium shadow"
                                title="Buka pratinjau DBR untuk dicetak / disimpan sebagai PDF"
                            >
                                <Printer size={16} />
                                Cetak DBR
                            </button>
                            <button
                                onClick={() => handleExportXlsx(selectedRoom)}
                                disabled={dbrExporting}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 text-sm font-medium shadow"
                                title="Unduh DBR sebagai berkas Excel (.xlsx)"
                            >
                                {dbrExporting
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <FileSpreadsheet size={16} />}
                                Export Excel
                            </button>
                            <button
                                onClick={() => setShowHibahModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 text-sm font-medium shadow"
                            >
                                <Plus size={16} />
                                Tambah Aset Hibah
                                <span className="inline-block rounded bg-purple-800/60 text-[10px] font-bold tracking-wider px-1.5 py-0.5">BETA</span>
                            </button>
                        </div>
                    </div>

                    {assetsError && (
                        <div className="p-6 flex items-start gap-3 text-rose-700 bg-rose-50 border-b border-rose-200">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1 text-sm">{assetsError}</div>
                            <button
                                onClick={() => { const r = selectedRoom; setSelectedRoom(null); setTimeout(() => setSelectedRoom(r), 0); }}
                                className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-rose-700"
                            >
                                Coba lagi
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                    <th className="px-4 py-3 font-semibold">Kode</th>
                                    <th className="px-4 py-3 font-semibold">Nama Barang</th>
                                    <th className="px-4 py-3 font-semibold">Merk/Type</th>
                                    <th className="px-4 py-3 font-semibold text-right">Jumlah</th>
                                    <th className="px-4 py-3 font-semibold">Kondisi</th>
                                    <th className="px-4 py-3 font-semibold">Tgl Perolehan</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assetsLoading ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                                        <Loader2 className="inline animate-spin text-blue-600 mr-2" size={18} />
                                        Memuat aset...
                                    </td></tr>
                                ) : !assets || assets.length === 0 ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                                        {assetsError ? '—' : 'Tidak ada aset terdaftar untuk ruangan ini.'}
                                    </td></tr>
                                ) : (
                                    assets.map((a) => {
                                        const isHibah = a.source === 'hibah';
                                        const hibahNumericId = isHibah ? Number(String(a.id).replace(/^hibah-/, '')) : null;
                                        return (
                                            <tr key={a.id} className={`hover:bg-slate-50 ${isHibah ? 'bg-purple-50/30' : ''}`}>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        {a.kode_barang}
                                                        {isHibah && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                                                                <Sparkles size={10} /> Hibah
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{a.nama_barang}</td>
                                                <td className="px-4 py-3 text-slate-600">{a.merk_type || '—'}</td>
                                                <td className="px-4 py-3 text-right text-slate-700">
                                                    {a.kuantitas != null ? a.kuantitas : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {a.kondisi ? (
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            a.kondisi === 'Baik' ? 'bg-emerald-100 text-emerald-700'
                                                            : a.kondisi === 'Rusak Ringan' ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-rose-100 text-rose-700'
                                                        }`}>{a.kondisi}</span>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {a.tanggal_perolehan
                                                        ? new Date(a.tanggal_perolehan).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {isHibah && hibahNumericId !== null && (
                                                        <button
                                                            onClick={() => handleHibahDelete(hibahNumericId, a.kode_barang)}
                                                            disabled={deletingHibahId === hibahNumericId}
                                                            className="inline-flex items-center justify-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                                                            aria-label={`Hapus ${a.kode_barang}`}
                                                            title="Hapus aset hibah"
                                                        >
                                                            {deletingHibahId === hibahNumericId
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <Trash2 size={14} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showHibahModal && selectedRoom && (
                    <HibahAssetModal
                        room={selectedRoom}
                        onClose={() => setShowHibahModal(false)}
                        onCreated={handleHibahCreated}
                    />
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Room picker view (default)
    // -------------------------------------------------------------------------
    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="text-blue-600" /> Aset SIISYANA
                </h1>
                <p className="text-slate-500">
                    Pilih sebuah ruangan untuk melihat daftar aset. Data dari SIISYANA melalui SIAU Gateway (read-only).
                </p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Ruangan</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={filterKode}
                                        onChange={(e) => setFilterKode(e.target.value)}
                                        placeholder="mis. FT-DA-01"
                                        className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 pl-9 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Ruangan</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={filterNama}
                                        onChange={(e) => setFilterNama(e.target.value)}
                                        placeholder="mis. Ruang Rapat"
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
                                {filterKode.trim() && (
                                    <FilterChip label={`Kode: ${filterKode}`} onClear={() => setFilterKode('')} />
                                )}
                                {filterNama.trim() && (
                                    <FilterChip label={`Nama: ${filterNama}`} onClear={() => setFilterNama('')} />
                                )}
                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs text-rose-600 hover:text-rose-700 font-medium ml-auto"
                                >
                                    Bersihkan semua
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {bulkError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-rose-900">Tidak dapat memuat daftar ruangan</p>
                        <p className="text-sm text-rose-700">{bulkError}</p>
                    </div>
                    <button
                        onClick={bulkFetch}
                        className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-700"
                    >
                        Coba lagi
                    </button>
                </div>
            )}

            {/* Rooms table */}
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
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <label className="flex items-center gap-2">
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
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                <th className="px-4 py-3 font-semibold">Kode</th>
                                <th className="px-4 py-3 font-semibold">Nama Ruangan</th>
                                <th className="px-4 py-3 font-semibold">Gedung</th>
                                <th className="px-4 py-3 font-semibold">Tipe</th>
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
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                                    <Loader2 className="inline animate-spin text-blue-600 mr-2" size={18} />
                                    Memuat ruangan dari gateway...
                                </td></tr>
                            ) : pagedRooms.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                                    {bulkError
                                        ? '—'
                                        : (filterKode || filterNama || filterBuildingId)
                                            ? 'Tidak ada ruangan yang cocok dengan filter.'
                                            : 'Tidak ada ruangan ditemukan.'}
                                </td></tr>
                            ) : (
                                pagedRooms.map((r) => (
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

                {/* Paginator */}
                <Paginator
                    pageIndex={safePageIndex}
                    totalPages={totalPages}
                    totalItems={visibleRooms.length}
                    pageSize={pageSize}
                    isLoading={bulkLoading}
                    onJump={setPageIndex}
                    label="ruangan"
                />
            </div>
        </div>
    );
};

// ============================================================================
// Hibah create modal
// ============================================================================

interface HibahAssetModalProps {
    room: SiauRoom;
    onClose: () => void;
    onCreated: () => void;
}

const HibahAssetModal: React.FC<HibahAssetModalProps> = ({ room, onClose, onCreated }) => {
    const [namaBarang, setNamaBarang] = useState('');
    const [merkType, setMerkType] = useState('');
    const [kondisi, setKondisi] = useState<'Baik' | 'Rusak Ringan' | 'Rusak Berat' | ''>('Baik');
    const [kuantitas, setKuantitas] = useState('1');
    const [tanggalPerolehan, setTanggalPerolehan] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const nama = namaBarang.trim();
        if (!nama) {
            setError('Nama barang wajib diisi.');
            return;
        }
        const qtyNum = Number(kuantitas);
        if (kuantitas !== '' && (!Number.isFinite(qtyNum) || qtyNum < 0)) {
            setError('Kuantitas harus angka non-negatif.');
            return;
        }

        const body: HibahAssetInput = {
            id_ruangan: Number(room.id),
            nama_barang: nama,
        };
        if (merkType.trim()) body.merk_type = merkType.trim();
        if (kondisi) body.kondisi = kondisi;
        if (kuantitas !== '') body.kuantitas = qtyNum;
        if (tanggalPerolehan) body.tanggal_perolehan = tanggalPerolehan;

        setSaving(true);
        try {
            await adminSiauApi.hibahAssets.create(body);
            onCreated();
        } catch (e: any) {
            const msg = e?.message ?? '';
            if (/HTTP error! status: 422/.test(msg)) {
                setError('Data tidak valid. Periksa kembali form.');
            } else if (/HTTP error! status: 401/.test(msg)) {
                setError('Sesi Anda berakhir. Silakan login kembali.');
            } else if (/HTTP error! status: 429/.test(msg)) {
                setError('Terlalu banyak permintaan. Tunggu sebentar.');
            } else {
                setError('Gagal menyimpan aset hibah.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900">Tambah Aset Hibah</h3>
                            <span className="inline-block rounded bg-purple-600 text-white text-[10px] font-bold tracking-wider px-1.5 py-0.5">BETA</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            <span className="font-mono">{room.kode_ruangan}</span> · {room.nama}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Tutup">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2 text-xs text-purple-800 bg-purple-50 border-b border-purple-100">
                    <Sparkles size={12} className="inline mr-1" />
                    Aset hibah tersimpan di SIAU Gateway, terpisah dari SIISYANA. <b>Tidak menulis ke database upstream.</b>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Nama Barang <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={namaBarang}
                            onChange={(e) => setNamaBarang(e.target.value)}
                            maxLength={255}
                            required
                            placeholder="mis. Proyektor Hibah Yayasan ABC"
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Merk / Type</label>
                        <input
                            type="text"
                            value={merkType}
                            onChange={(e) => setMerkType(e.target.value)}
                            maxLength={255}
                            placeholder="mis. Epson EB-X05"
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Kondisi</label>
                            <select
                                value={kondisi}
                                onChange={(e) => setKondisi(e.target.value as typeof kondisi)}
                                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500"
                            >
                                <option value="Baik">Baik</option>
                                <option value="Rusak Ringan">Rusak Ringan</option>
                                <option value="Rusak Berat">Rusak Berat</option>
                                <option value="">— Tidak diisi —</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Kuantitas</label>
                            <input
                                type="number"
                                value={kuantitas}
                                onChange={(e) => setKuantitas(e.target.value)}
                                min={0}
                                step="0.01"
                                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Perolehan</label>
                        <input
                            type="date"
                            value={tanggalPerolehan}
                            onChange={(e) => setTanggalPerolehan(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:ring-purple-500"
                        />
                    </div>

                    <p className="text-xs text-slate-500">
                        Kode barang akan dibuat otomatis dengan format <code className="bg-slate-100 px-1 rounded">HIBAH-YYYY-NNNN</code>.
                    </p>

                    {error && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !namaBarang.trim()}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            Simpan Aset Hibah
                        </button>
                    </div>
                </form>
            </div>
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
