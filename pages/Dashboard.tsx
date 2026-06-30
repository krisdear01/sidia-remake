import React, { useState, useEffect, useCallback } from 'react';
import { statsApi } from '../api/client';
import {
    Building2,
    DoorOpen,
    Package,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    Map as MapIcon,
    Sparkles,
    Wifi,
} from 'lucide-react';

/**
 * Live shape from /api/v1/stats. The fields under `buildings`, `rooms`,
 * `assets`, `schedules` come from the SIAU gateway (SIISYANA + SIPIRANG +
 * hibah, cached 1h). `land` is SIDIA-local — sum of admin-entered polygon
 * land_area values.
 */
interface DashboardStats {
    ok: boolean;
    buildings?: { total: number; total_area_sqm: number };
    rooms?: {
        total: number;
        siap: number;
        renovasi: number;
        tervalidasi: number;
        pending_validasi: number;
    };
    assets?: {
        total: number;
        total_siisyana: number;
        total_hibah: number;
        by_kondisi: { baik: number; rusak_ringan: number; rusak_berat: number; unknown: number };
    };
    schedules?: { today: number };
    land: { total_land_area_sqm: number; polygons_count: number; source: string };
    sources_meta?: {
        gateway_computed_at: string | null;
        gateway_cache_hit: boolean | null;
        gateway_ttl_seconds: number | null;
    };
    error?: string;
}

const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
};

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await statsApi.get();
            setStats(data);
        } catch (e: any) {
            setError(e?.message ?? 'Gagal memuat statistik.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    const gwTime = formatTime(stats?.sources_meta?.gateway_computed_at);
    const liveLabel = `Data SIISYANA per ${gwTime}`;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">
                        Ringkasan data aset Universitas Udayana
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    <Wifi size={14} />
                    Live via SIAU Gateway
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-rose-900">Gagal memuat data dashboard</p>
                        <p className="text-sm text-rose-700">{error}</p>
                    </div>
                    <button onClick={load} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-700">
                        Coba lagi
                    </button>
                </div>
            )}

            {stats?.ok === false && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1 text-sm text-amber-900">
                        SIAU Gateway tidak dapat dihubungi. Angka SIISYANA/SIPIRANG tidak tersedia saat ini; data Peta &amp; Polygon (Luas Tanah) tetap ditampilkan.
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Gedung"
                    value={stats?.buildings?.total ?? 0}
                    icon={Building2}
                    color="blue"
                    subtitle={`${(stats?.buildings?.total_area_sqm ?? 0).toLocaleString('id-ID')} m² luas bangunan`}
                    freshness={liveLabel}
                />
                <StatCard
                    title="Total Ruangan"
                    value={stats?.rooms?.total ?? 0}
                    icon={DoorOpen}
                    color="indigo"
                    subtitle={`${(stats?.rooms?.tervalidasi ?? 0).toLocaleString('id-ID')} tervalidasi`}
                    freshness={liveLabel}
                />
                <StatCard
                    title="Total Aset"
                    value={stats?.assets?.total ?? 0}
                    icon={Package}
                    color="violet"
                    subtitle={
                        <>
                            {(stats?.assets?.by_kondisi.baik ?? 0).toLocaleString('id-ID')} dalam kondisi baik
                            {(stats?.assets?.total_hibah ?? 0) > 0 && (
                                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                                    <Sparkles size={9} /> +{stats?.assets?.total_hibah} hibah
                                </span>
                            )}
                        </>
                    }
                    freshness={liveLabel}
                />
                <StatCard
                    title="Jadwal Hari Ini"
                    value={stats?.schedules?.today ?? 0}
                    icon={Clock}
                    color="amber"
                    subtitle="Pemesanan aktif (SIPIRANG)"
                    freshness={liveLabel}
                />
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Room status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Status Ruangan</h3>
                        <span className="text-xs text-slate-400">{liveLabel}</span>
                    </div>
                    <div className="space-y-4">
                        <StatusBar
                            label="Siap dipakai"
                            value={stats?.rooms?.siap ?? 0}
                            total={stats?.rooms?.total || 1}
                            color="emerald"
                            icon={CheckCircle}
                        />
                        <StatusBar
                            label="Sedang renovasi"
                            value={stats?.rooms?.renovasi ?? 0}
                            total={stats?.rooms?.total || 1}
                            color="amber"
                            icon={AlertTriangle}
                        />
                        <StatusBar
                            label="Pending validasi"
                            value={stats?.rooms?.pending_validasi ?? 0}
                            total={stats?.rooms?.total || 1}
                            color="rose"
                            icon={Users}
                        />
                    </div>
                </div>

                {/* Asset condition */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Kondisi Aset</h3>
                        <span className="text-xs text-slate-400">{liveLabel}</span>
                    </div>
                    <div className="space-y-4">
                        <StatusBar
                            label="Baik"
                            value={stats?.assets?.by_kondisi.baik ?? 0}
                            total={stats?.assets?.total || 1}
                            color="emerald"
                            icon={CheckCircle}
                        />
                        <StatusBar
                            label="Rusak Ringan"
                            value={stats?.assets?.by_kondisi.rusak_ringan ?? 0}
                            total={stats?.assets?.total || 1}
                            color="amber"
                            icon={AlertTriangle}
                        />
                        <StatusBar
                            label="Rusak Berat"
                            value={stats?.assets?.by_kondisi.rusak_berat ?? 0}
                            total={stats?.assets?.total || 1}
                            color="rose"
                            icon={TrendingUp}
                        />
                    </div>
                </div>
            </div>

            {/* Land + building area */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold">Luas Area Total</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-200 text-sm">
                            <MapIcon size={14} />
                            <span>Luas Tanah</span>
                        </div>
                        <p className="text-3xl font-bold mt-1">
                            {(stats?.land.total_land_area_sqm ?? 0).toLocaleString('id-ID')} m²
                        </p>
                        <p className="text-xs text-blue-300 mt-1">
                            Dari {stats?.land.polygons_count ?? 0} polygon di Peta &amp; Polygon
                        </p>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-blue-200 text-sm">
                            <Building2 size={14} />
                            <span>Luas Bangunan</span>
                        </div>
                        <p className="text-3xl font-bold mt-1">
                            {(stats?.buildings?.total_area_sqm ?? 0).toLocaleString('id-ID')} m²
                        </p>
                        <p className="text-xs text-blue-300 mt-1">{liveLabel}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Stat card
// ============================================================================

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: 'blue' | 'indigo' | 'violet' | 'amber';
    subtitle?: React.ReactNode;
    freshness?: string;
}

const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', shadow: 'shadow-blue-500/10' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', shadow: 'shadow-indigo-500/10' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', shadow: 'shadow-violet-500/10' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', shadow: 'shadow-amber-500/10' },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtitle, freshness }) => {
    const colors = colorClasses[color];
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${colors.shadow}`}>
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString('id-ID')}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colors.bg} shrink-0`}>
                    <Icon className={colors.text} size={24} />
                </div>
            </div>
            {freshness && (
                <p className="text-[10px] text-slate-300 mt-3 truncate" title={freshness}>{freshness}</p>
            )}
        </div>
    );
};

// ============================================================================
// Status bar
// ============================================================================

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
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colors = statusColorClasses[color];

    return (
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${colors.light}`}>
                <Icon className={colors.text} size={18} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-sm font-bold text-slate-900">
                        {value.toLocaleString('id-ID')}
                        <span className="text-xs text-slate-400 font-normal ml-1">({percentage}%)</span>
                    </span>
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
