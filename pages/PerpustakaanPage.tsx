import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Search, AlertCircle, RefreshCw, Calendar, X } from 'lucide-react';
import { siauApi, SiauApiError } from '../api/client';
import type { SiauRoom, SiauBooking } from '../types';
import { UPT_PERPUSTAKAAN_UNIT_ID } from '../constants';
import { RoomCard } from '../components/RoomCard';

const toYmd = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const PerpustakaanPage: React.FC = () => {
    const [rooms, setRooms] = useState<SiauRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<SiauApiError | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<SiauRoom | null>(null);
    const [schedule, setSchedule] = useState<SiauBooking[] | null>(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState<SiauApiError | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await siauApi.rooms.list({ id_unit: UPT_PERPUSTAKAAN_UNIT_ID, limit: 200 });
            setRooms(res.data);
        } catch (e) {
            setError(e instanceof SiauApiError ? e : new SiauApiError('UNKNOWN', 0, 'Gagal memuat data perpustakaan.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (!selectedRoom) {
            setSchedule(null);
            setScheduleError(null);
            return;
        }
        setScheduleLoading(true);
        setScheduleError(null);
        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        siauApi.rooms.schedule(selectedRoom.id, toYmd(today), toYmd(weekLater))
            .then((res) => setSchedule(res.data))
            .catch((e: unknown) => setScheduleError(e instanceof SiauApiError ? e : new SiauApiError('UNKNOWN', 0, 'Gagal memuat jadwal.')))
            .finally(() => setScheduleLoading(false));
    }, [selectedRoom]);

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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 shadow-lg shadow-amber-500/20">
                                <BookOpen className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Perpustakaan</h1>
                                <p className="text-xs text-slate-500">UPT Perpustakaan Universitas Udayana</p>
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
                            placeholder="Cari ruang perpustakaan..."
                            className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:ring-amber-500 sm:text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 flex items-start gap-4">
                        <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="font-semibold text-rose-900">Tidak dapat memuat data perpustakaan</p>
                            <p className="text-sm text-rose-700 mt-1">Layanan direktori sedang tidak tersedia.</p>
                        </div>
                        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700">
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
                            {filtered.map((r) => (
                                <RoomCard key={r.id} room={r} onClick={setSelectedRoom} showAvailability />
                            ))}
                        </div>

                        {filtered.length === 0 && !error && (
                            <div className="text-center py-12">
                                <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Tidak ada ruang perpustakaan yang ditemukan.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedRoom(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <span className="text-amber-600 font-mono text-sm font-semibold">{selectedRoom.kode_ruangan}</span>
                                <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedRoom.nama}</h2>
                                {selectedRoom.gedung?.nama && (
                                    <p className="text-slate-500 mt-1">{selectedRoom.gedung.nama}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
                                aria-label="Tutup"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar size={18} className="text-slate-500" />
                                <h3 className="font-semibold text-slate-900">Jadwal 7 Hari ke Depan</h3>
                            </div>

                            {scheduleLoading && <p className="text-sm text-slate-500">Memuat jadwal...</p>}
                            {scheduleError && <p className="text-sm text-rose-700">Tidak dapat memuat jadwal ruangan ini.</p>}
                            {!scheduleLoading && !scheduleError && schedule && schedule.length === 0 && (
                                <p className="text-sm text-slate-500">Belum ada jadwal pemesanan.</p>
                            )}
                            {!scheduleLoading && !scheduleError && schedule && schedule.length > 0 && (
                                <ul className="space-y-2">
                                    {schedule.map((s) => (
                                        <li key={s.booking_id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-sm font-medium text-slate-900 line-clamp-1">
                                                    {s.event_title ?? 'Pemesanan'}
                                                </span>
                                                <span className={`text-xs font-semibold rounded px-2 py-0.5 ${
                                                    s.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                                                    : s.status === 'pending' ? 'bg-amber-100 text-amber-700'
                                                    : s.status === 'cancelled' ? 'bg-slate-100 text-slate-600'
                                                    : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {s.start_time && new Date(s.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                {' – '}
                                                {s.end_time && new Date(s.end_time).toLocaleString('id-ID', { timeStyle: 'short' })}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
