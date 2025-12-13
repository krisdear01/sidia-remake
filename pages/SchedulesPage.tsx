import React, { useState, useEffect } from 'react';
import { schedulesApi, roomsApi } from '../api/client';
import { Calendar, Clock, RefreshCw, Loader2, User, BookOpen } from 'lucide-react';

interface Schedule {
    id: number;
    subject: string;
    department?: string;
    lecturer?: string;
    room?: { name: string; building?: { name: string } };
    date: string;
    start_time: string;
    end_time: string;
}

export const SchedulesPage: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncLoading, setSyncLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadSchedules();
    }, [selectedDate]);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            const res = await schedulesApi.list({ date: selectedDate });
            setSchedules(res || []);
        } catch (error) {
            console.error('Failed to load schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncLoading(true);
            const result = await schedulesApi.syncSipirang();
            alert(result.message);
            loadSchedules();
        } catch (error) {
            alert('Gagal sinkronisasi: ' + (error as Error).message);
        } finally {
            setSyncLoading(false);
        }
    };

    const formatTime = (time: string) => {
        return time?.substring(0, 5) || '';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Jadwal Ruangan</h1>
                    <p className="text-slate-500">Lihat dan kelola jadwal penggunaan ruangan</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all"
                >
                    {syncLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <RefreshCw size={18} />
                    )}
                    Sync SIPIRANG
                </button>
            </div>

            {/* Date Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-4">
                    <Calendar className="text-slate-400" size={20} />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-500">
                        {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Schedule List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-slate-200">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada jadwal</h3>
                        <p className="text-slate-500">Tidak ada jadwal untuk tanggal ini. Coba sinkronisasi dengan SIPIRANG.</p>
                    </div>
                ) : (
                    schedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Time */}
                                <div className="flex items-center gap-3 md:w-32">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Clock className="text-blue-600" size={18} />
                                    </div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 border-l-2 border-blue-500 pl-4">
                                    <h3 className="text-lg font-bold text-slate-900">{schedule.subject}</h3>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{schedule.department || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <BookOpen size={14} />
                                            <span>{schedule.room?.name || '-'}</span>
                                        </div>
                                        {schedule.lecturer && (
                                            <div className="flex items-center gap-1">
                                                <User size={14} />
                                                <span>{schedule.lecturer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Room Badge */}
                                <div className="text-right">
                                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                                        {schedule.room?.building?.name || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
