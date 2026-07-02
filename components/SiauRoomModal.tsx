import React, { useEffect, useState } from 'react';
import { X, Users, Building2, CheckCircle2, AlertCircle, Calendar, Package, Lock } from 'lucide-react';
import { siauApi, SiauApiError, isAuthenticated } from '../api/client';
import type { SiauRoom, SiauAsset, SiauBooking, SiauAvailability } from '../types';

interface Props {
    room: SiauRoom;
    onClose: () => void;
}

const toYmd = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const SiauRoomModal: React.FC<Props> = ({ room, onClose }) => {
    const [assets, setAssets] = useState<SiauAsset[] | null>(null);
    const [schedule, setSchedule] = useState<SiauBooking[] | null>(null);
    const [availability, setAvailability] = useState<SiauAvailability | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Schedule + availability are gated by the gateway when the room is
    // private: anonymous callers get a 403. Mirror that on the client to
    // avoid an inevitable failed request, and to render a clear notice.
    const canSeeSchedule = room.is_public || isAuthenticated();

    useEffect(() => {
        let cancelled = false;
        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);

        const requests: Array<Promise<any>> = [
            siauApi.rooms.assets(room.id, { limit: 200 }),
        ];
        if (canSeeSchedule) {
            requests.push(
                siauApi.rooms.schedule(room.id, toYmd(today), toYmd(weekLater)),
                siauApi.rooms.availability(room.id),
            );
        }

        Promise.allSettled(requests).then((results) => {
            if (cancelled) return;
            const [assetsRes, scheduleRes, availabilityRes] = results;
            if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value.data);
            else if (assetsRes.reason instanceof SiauApiError) setError('Sebagian data tidak dapat dimuat.');
            if (scheduleRes?.status === 'fulfilled') setSchedule(scheduleRes.value.data);
            if (availabilityRes?.status === 'fulfilled') setAvailability(availabilityRes.value.data);
        });

        return () => { cancelled = true; };
    }, [room.id, canSeeSchedule]);

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                    <div className="min-w-0">
                        <span className="text-blue-600 font-mono text-xs font-semibold">{room.kode_ruangan}</span>
                        <h2 className="text-2xl font-bold text-slate-900 mt-1 line-clamp-2">{room.nama}</h2>
                        {room.gedung?.nama && (
                            <p className="text-slate-500 mt-1">{room.gedung.nama}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Tutup">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {room.kapasitas != null && (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="flex items-center gap-1 text-slate-500 text-xs"><Users size={14} /> Kapasitas</div>
                                <p className="text-xl font-bold text-slate-900 mt-1">{room.kapasitas}</p>
                            </div>
                        )}
                        {room.jenis_ruangan?.nama && (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="flex items-center gap-1 text-slate-500 text-xs"><Building2 size={14} /> Tipe</div>
                                <p className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">{room.jenis_ruangan.nama}</p>
                            </div>
                        )}
                        {room.unit?.nama && (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="text-slate-500 text-xs">Unit</div>
                                <p className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">{room.unit.nama}</p>
                            </div>
                        )}
                        {availability && (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <div className="text-slate-500 text-xs">Saat ini</div>
                                {availability.available ? (
                                    <p className="inline-flex items-center gap-1 text-emerald-700 font-semibold mt-1">
                                        <CheckCircle2 size={16} /> Tersedia
                                    </p>
                                ) : (
                                    <p className="inline-flex items-center gap-1 text-amber-700 font-semibold mt-1">
                                        <AlertCircle size={16} /> Terpakai
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Package size={18} className="text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Aset</h3>
                            <span className="text-xs text-slate-400">{assets ? `(${assets.length})` : ''}</span>
                        </div>
                        {assets === null ? (
                            <p className="text-sm text-slate-500">Memuat aset...</p>
                        ) : assets.length === 0 ? (
                            <p className="text-sm text-slate-500">Tidak ada aset terdaftar.</p>
                        ) : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {assets.slice(0, 12).map((a) => (
                                    <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{a.nama_barang}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            {a.merk_type && <span className="line-clamp-1">{a.merk_type}</span>}
                                            {a.kuantitas != null && <span>· {a.kuantitas}x</span>}
                                            {a.kondisi && (
                                                <span className={`rounded px-1.5 py-0.5 font-semibold ${
                                                    a.kondisi === 'Baik' ? 'bg-emerald-100 text-emerald-700'
                                                    : a.kondisi === 'Rusak Ringan' ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-rose-100 text-rose-700'
                                                }`}>{a.kondisi}</span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {assets && assets.length > 12 && (
                            <p className="text-xs text-slate-400 mt-2">Menampilkan 12 dari {assets.length} aset.</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={18} className="text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Jadwal 7 Hari ke Depan</h3>
                        </div>
                        {!canSeeSchedule ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-2 text-sm text-slate-600">
                                <Lock size={14} className="shrink-0 mt-0.5 text-slate-400" />
                                <span>Ruangan privat. Jadwal hanya dapat dilihat oleh staf akademik (login admin diperlukan).</span>
                            </div>
                        ) : schedule === null ? (
                            <p className="text-sm text-slate-500">Memuat jadwal...</p>
                        ) : schedule.length === 0 ? (
                            <p className="text-sm text-slate-500">Belum ada jadwal pemesanan.</p>
                        ) : (
                            <ul className="space-y-2">
                                {schedule.slice(0, 8).map((s) => (
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
                                            }`}>{s.status}</span>
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
        </div>
    );
};
