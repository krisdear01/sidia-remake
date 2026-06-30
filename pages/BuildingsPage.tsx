import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Building2, Search, Loader2, AlertCircle, ShieldAlert, CheckCircle2,
    MapPin, Layers, Clock,
} from 'lucide-react';
import { siauApi, SiauApiError } from '../api/client';
import type { SiauBuilding } from '../types';
import { Paginator, PAGE_SIZE_OPTIONS } from '../components/Paginator';

/**
 * Admin → Gedung
 *
 * Read-only directory of SIISYANA buildings via the SIAU Gateway. Previously
 * read SIDIA's local SQLite (9 seeded rows with full CRUD); now reads the
 * authoritative ~169 SIISYANA buildings. No write surface — SIISYANA is the
 * source of truth and the gateway exposes no building writes.
 */

export const BuildingsPage: React.FC = () => {
    const [allBuildings, setAllBuildings] = useState<SiauBuilding[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState<number>(10);
    const [pageIndex, setPageIndex] = useState<number>(0);

    const friendlyError = (e: unknown): string => {
        if (e instanceof SiauApiError) {
            if (e.status === 503 || e.code === 'SIAU_GATEWAY_UNREACHABLE')
                return 'Layanan direktori sedang tidak tersedia.';
            if (e.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar.';
        }
        return 'Tidak dapat memuat daftar gedung.';
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 169 buildings fits comfortably in one page at limit=200.
            const res = await siauApi.buildings.list({ limit: 200 });
            setAllBuildings(res.data);
        } catch (e) {
            setAllBuildings([]);
            setError(friendlyError(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPageIndex(0); }, [search, pageSize]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allBuildings;
        return allBuildings.filter((b) =>
            b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q)
        );
    }, [allBuildings, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePageIndex = Math.min(pageIndex, totalPages - 1);
    const pageRows = filtered.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="text-blue-600" /> Direktori Gedung
                </h1>
                <p className="text-slate-500">
                    Daftar gedung Universitas Udayana dari SIISYANA melalui SIAU Gateway.
                </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-900">
                <ShieldAlert size={16} className="shrink-0" />
                <span>Data gedung SIISYANA bersifat <b>read-only</b>. Untuk perubahan, gunakan aplikasi SI-ISYANA.</span>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama atau kode gedung..."
                        className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-rose-900">Tidak dapat memuat daftar gedung</p>
                        <p className="text-sm text-rose-700">{error}</p>
                    </div>
                    <button onClick={load} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-700">
                        Coba lagi
                    </button>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-semibold text-slate-900">Daftar Gedung</h2>
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
                                <th className="px-4 py-3 font-semibold">Nama Gedung</th>
                                <th className="px-4 py-3 font-semibold text-right">Lantai</th>
                                <th className="px-4 py-3 font-semibold text-right">Luas (m²)</th>
                                <th className="px-4 py-3 font-semibold">Jam Operasional</th>
                                <th className="px-4 py-3 font-semibold">Koordinat</th>
                                <th className="px-4 py-3 font-semibold text-center">Validasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && allBuildings.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                                    <Loader2 className="inline animate-spin text-blue-600 mr-2" size={18} />
                                    Memuat gedung dari gateway...
                                </td></tr>
                            ) : pageRows.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                                    {error ? '—' : search ? 'Tidak ada gedung yang cocok.' : 'Tidak ada gedung ditemukan.'}
                                </td></tr>
                            ) : (
                                pageRows.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.kode || '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{b.nama}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">
                                            {b.jumlah_lantai != null ? (
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    <Layers size={12} className="text-slate-400" />
                                                    {b.jumlah_lantai}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">
                                            {b.luas_gedung != null
                                                ? b.luas_gedung.toLocaleString('id-ID')
                                                : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {(b.jam_buka || b.jam_tutup) ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    {b.jam_buka ?? '—'} – {b.jam_tutup ?? '—'}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {(b.latitude != null && b.longitude != null) ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {b.is_valid ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                                                    <CheckCircle2 size={12} /> Tervalidasi
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
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
                    isLoading={loading}
                    onJump={setPageIndex}
                    label="gedung"
                />
            </div>
        </div>
    );
};
