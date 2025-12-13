import React, { useState, useEffect } from 'react';
import { statsApi, schedulesApi } from '../api/client';
import {
    Building2,
    DoorOpen,
    Package,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    Loader2,
} from 'lucide-react';

interface Stats {
    total_buildings: number;
    total_rooms: number;
    total_assets: number;
    rooms_available: number;
    rooms_occupied: number;
    rooms_maintenance: number;
    assets_good: number;
    assets_damaged: number;
    assets_repair: number;
    today_schedules: number;
    total_land_area: number;
    total_building_area: number;
}

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncLoading, setSyncLoading] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await statsApi.get();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncSipirang = async () => {
        try {
            setSyncLoading(true);
            await schedulesApi.syncSipirang();
            await loadStats();
            alert('Berhasil sinkronisasi jadwal dari SIPIRANG!');
        } catch (error) {
            alert('Gagal sinkronisasi: ' + (error as Error).message);
        } finally {
            setSyncLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Ringkasan data aset Universitas Udayana</p>
                </div>
                <button
                    onClick={handleSyncSipirang}
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Gedung"
                    value={stats?.total_buildings || 0}
                    icon={Building2}
                    color="blue"
                    subtitle={`${stats?.total_building_area?.toLocaleString() || 0} m² luas bangunan`}
                />
                <StatCard
                    title="Total Ruangan"
                    value={stats?.total_rooms || 0}
                    icon={DoorOpen}
                    color="indigo"
                    subtitle={`${stats?.rooms_available || 0} tersedia`}
                />
                <StatCard
                    title="Total Aset"
                    value={stats?.total_assets || 0}
                    icon={Package}
                    color="violet"
                    subtitle={`${stats?.assets_good || 0} dalam kondisi baik`}
                />
                <StatCard
                    title="Jadwal Hari Ini"
                    value={stats?.today_schedules || 0}
                    icon={Clock}
                    color="amber"
                    subtitle="Aktivitas terjadwal"
                />
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Room Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Status Ruangan</h3>
                    <div className="space-y-4">
                        <StatusBar
                            label="Tersedia"
                            value={stats?.rooms_available || 0}
                            total={stats?.total_rooms || 1}
                            color="emerald"
                            icon={CheckCircle}
                        />
                        <StatusBar
                            label="Digunakan"
                            value={stats?.rooms_occupied || 0}
                            total={stats?.total_rooms || 1}
                            color="rose"
                            icon={Users}
                        />
                        <StatusBar
                            label="Perbaikan"
                            value={stats?.rooms_maintenance || 0}
                            total={stats?.total_rooms || 1}
                            color="amber"
                            icon={AlertTriangle}
                        />
                    </div>
                </div>

                {/* Asset Condition */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Kondisi Aset</h3>
                    <div className="space-y-4">
                        <StatusBar
                            label="Baik"
                            value={stats?.assets_good || 0}
                            total={stats?.total_assets || 1}
                            color="emerald"
                            icon={CheckCircle}
                        />
                        <StatusBar
                            label="Rusak"
                            value={stats?.assets_damaged || 0}
                            total={stats?.total_assets || 1}
                            color="rose"
                            icon={AlertTriangle}
                        />
                        <StatusBar
                            label="Perbaikan"
                            value={stats?.assets_repair || 0}
                            total={stats?.total_assets || 1}
                            color="amber"
                            icon={TrendingUp}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Luas Area Total</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-blue-200 text-sm">Luas Tanah</p>
                        <p className="text-3xl font-bold">{stats?.total_land_area?.toLocaleString() || 0} m²</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-sm">Luas Bangunan</p>
                        <p className="text-3xl font-bold">{stats?.total_building_area?.toLocaleString() || 0} m²</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: 'blue' | 'indigo' | 'violet' | 'amber';
    subtitle?: string;
}

const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', shadow: 'shadow-blue-500/10' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', shadow: 'shadow-indigo-500/10' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', shadow: 'shadow-violet-500/10' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', shadow: 'shadow-amber-500/10' },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtitle }) => {
    const colors = colorClasses[color];
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${colors.shadow}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon className={colors.text} size={24} />
                </div>
            </div>
        </div>
    );
};

// Status Bar Component
interface StatusBarProps {
    label: string;
    value: number;
    total: number;
    color: 'emerald' | 'rose' | 'amber';
    icon: React.ElementType;
}

const statusColorClasses = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
};

const StatusBar: React.FC<StatusBarProps> = ({ label, value, total, color, icon: Icon }) => {
    const percentage = Math.round((value / total) * 100);
    const colors = statusColorClasses[color];

    return (
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${colors.light}`}>
                <Icon className={colors.text} size={18} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${colors.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
