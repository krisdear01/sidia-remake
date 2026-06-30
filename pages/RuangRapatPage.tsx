import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowLeft, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { siauApi, SiauApiError } from '../api/client';
import type { SiauRoom } from '../types';
import { MEETING_JENIS_RUANGAN } from '../constants';
import { RoomCard } from '../components/RoomCard';

const matchesMeeting = (room: SiauRoom): boolean => {
    const nama = room.jenis_ruangan?.nama?.toLowerCase() ?? '';
    return MEETING_JENIS_RUANGAN.some((tok) => nama.includes(tok));
};

export const RuangRapatPage: React.FC = () => {
    const [rooms, setRooms] = useState<SiauRoom[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<SiauApiError | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadFirstPage = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await siauApi.rooms.list({ limit: 100 });
            setRooms(res.data.filter(matchesMeeting));
            setNextCursor(res.meta.pagination?.next_cursor ?? null);
        } catch (e) {
            setError(e instanceof SiauApiError ? e : new SiauApiError('UNKNOWN', 0, 'Gagal memuat data ruang rapat.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFirstPage(); }, []);

    const loadMore = async () => {
        if (nextCursor === null) return;
        setLoadingMore(true);
        try {
            const res = await siauApi.rooms.list({ limit: 100, cursor: nextCursor });
            setRooms((prev) => [...prev, ...res.data.filter(matchesMeeting)]);
            setNextCursor(res.meta.pagination?.next_cursor ?? null);
        } catch (e) {
            if (e instanceof SiauApiError) console.warn('siau rooms paginate failed:', e.code, e.detail);
        } finally {
            setLoadingMore(false);
        }
    };

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return rooms;
        return rooms.filter((r) =>
            r.nama.toLowerCase().includes(q) ||
            r.kode_ruangan.toLowerCase().includes(q) ||
            (r.gedung?.nama ?? '').toLowerCase().includes(q)
        );
    }, [rooms, searchTerm]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline">Kembali</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-500/20">
                                <Users className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Ruang Rapat</h1>
                                <p className="text-xs text-slate-500">Ruang rapat dan sidang di Universitas Udayana</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari ruang rapat, kode, atau gedung..."
                            className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:bg-white focus:ring-violet-500 sm:text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 flex items-start gap-4">
                        <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="font-semibold text-rose-900">Tidak dapat memuat data ruang rapat</p>
                            <p className="text-sm text-rose-700 mt-1">Layanan direktori sedang tidak tersedia.</p>
                        </div>
                        <button onClick={loadFirstPage} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700">
                            <RefreshCw size={16} /> Coba lagi
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 animate-pulse h-32" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((r) => <RoomCard key={r.id} room={r} showAvailability />)}
                        </div>

                        {filtered.length === 0 && !error && (
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Tidak ada ruang rapat yang ditemukan.</p>
                            </div>
                        )}

                        {nextCursor !== null && !error && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-6 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {loadingMore ? <><RefreshCw size={16} className="animate-spin" /> Memuat...</> : 'Muat lebih banyak'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
