import React, { useEffect, useRef, useState } from 'react';
import { Users, MapPin, Clock, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { fetchAvailabilityThrottled } from '../api/client';
import type { SiauRoom, SiauAvailability } from '../types';

interface Props {
    room: SiauRoom;
    onClick?: (room: SiauRoom) => void;
    showAvailability?: boolean;
}

export const RoomCard: React.FC<Props> = ({ room, onClick, showAvailability = false }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [availability, setAvailability] = useState<SiauAvailability | null>(null);
    const [availLoading, setAvailLoading] = useState(false);

    useEffect(() => {
        if (!showAvailability || availability || !ref.current) return;
        const node = ref.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    observer.disconnect();
                    setAvailLoading(true);
                    fetchAvailabilityThrottled(room.id)
                        .then((res) => setAvailability(res.data))
                        .catch(() => setAvailability(null))
                        .finally(() => setAvailLoading(false));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [showAvailability, room.id, availability]);

    return (
        <div
            ref={ref}
            onClick={() => onClick?.(room)}
            className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                    <span className="text-blue-600 font-mono text-xs font-semibold">{room.kode_ruangan}</span>
                    <h3 className="font-bold text-slate-900 mt-0.5 line-clamp-1">{room.nama}</h3>
                </div>
                {showAvailability && (
                    availLoading ? (
                        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-500">
                            <Loader2 size={12} className="animate-spin" /> Cek...
                        </span>
                    ) : availability ? (
                        availability.available ? (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 size={12} /> Tersedia
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                                <AlertCircle size={12} /> Terpakai
                            </span>
                        )
                    ) : null
                )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {room.jenis_ruangan?.nama && (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {room.jenis_ruangan.nama}
                    </span>
                )}
                {room.kapasitas != null && (
                    <div className="flex items-center gap-1"><Users size={14} /><span>{room.kapasitas} orang</span></div>
                )}
                {room.asset_count != null && room.asset_count > 0 && (
                    <div className="flex items-center gap-1"><Building2 size={14} /><span>{room.asset_count} aset</span></div>
                )}
            </div>

            {room.gedung?.nama && (
                <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                    <MapPin size={14} />
                    <span className="line-clamp-1">{room.gedung.nama}</span>
                </div>
            )}

            {showAvailability && availability && !availability.available && availability.next_free_slot && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-700">
                    <Clock size={12} />
                    <span>Tersedia: {new Date(availability.next_free_slot).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                </div>
            )}
        </div>
    );
};
