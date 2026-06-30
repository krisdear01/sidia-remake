import React from 'react';
import {
    TrendingDown, Rocket, Calendar, Wallet, Layers, AlertTriangle,
    LineChart, FileSpreadsheet, Bell, Sparkles, Info,
} from 'lucide-react';

/**
 * Penyusutan Aset — Coming Soon
 *
 * Pure preview/mockup page. No API calls. Mock numbers are wrapped in a
 * tinted overlay and watermarked "PREVIEW" so operators don't mistake them
 * for live data.
 */

const formatRp = (n: number): string => 'Rp ' + n.toLocaleString('id-ID');

export const PenyusutanAsetPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingDown className="text-teal-600" /> Penyusutan Aset
                    </h1>
                    <p className="text-slate-500">
                        Pelacakan nilai aset, depresiasi, dan masa pakai ekonomis.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-800 px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                    <Rocket size={12} /> Segera Hadir
                </span>
            </div>

            {/* Coming-soon banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 p-8 text-white shadow-xl">
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-bold tracking-wider uppercase">
                            <Sparkles size={12} /> Coming Soon
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-cyan-100">
                            <Calendar size={12} /> Target Q3 2026
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Penyusutan Aset</h2>
                    <p className="text-cyan-50 max-w-2xl mb-6">
                        Hitung nilai buku, akumulasi penyusutan, dan masa pakai ekonomis seluruh aset
                        Universitas Udayana secara otomatis. Mendukung metode garis lurus dan saldo
                        menurun sesuai PSAP/PP 71/2010.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            disabled
                            className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold opacity-70 cursor-not-allowed"
                        >
                            <Bell size={16} /> Notify saya saat siap
                        </button>
                        <button
                            disabled
                            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium opacity-70 cursor-not-allowed"
                        >
                            <FileSpreadsheet size={16} /> Lihat dokumen perencanaan
                        </button>
                    </div>
                </div>
            </div>

            {/* Sneak peek */}
            <div className="relative">
                {/* Preview watermark */}
                <div className="absolute inset-0 z-10 flex items-start justify-end pointer-events-none p-6">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                        <Info size={11} /> Sneak peek · data simulasi
                    </span>
                </div>

                <div className="relative space-y-6 select-none opacity-90 pointer-events-none">
                    {/* Stat cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <PreviewStatCard
                            title="Total Nilai Perolehan"
                            value={formatRp(124_800_000_000)}
                            icon={Wallet}
                            color="emerald"
                            subtitle="29,433 aset terdaftar"
                        />
                        <PreviewStatCard
                            title="Nilai Buku Saat Ini"
                            value={formatRp(76_410_000_000)}
                            icon={Layers}
                            color="blue"
                            subtitle="61% dari nilai perolehan"
                        />
                        <PreviewStatCard
                            title="Akumulasi Penyusutan"
                            value={formatRp(48_390_000_000)}
                            icon={TrendingDown}
                            color="rose"
                            subtitle="Sejak tahun perolehan awal"
                        />
                        <PreviewStatCard
                            title="Habis Masa Pakai"
                            value="1,247 aset"
                            icon={AlertTriangle}
                            color="amber"
                            subtitle="Perlu penghapusan / tender"
                        />
                    </div>

                    {/* Two-column section: methods + chart placeholder */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileSpreadsheet size={20} className="text-teal-600" />
                                Metode Penyusutan
                            </h3>
                            <div className="space-y-3">
                                <MethodRow
                                    name="Garis Lurus (Straight-line)"
                                    desc="Nilai penyusutan tahunan tetap sepanjang masa pakai. Cocok untuk gedung, peralatan kantor."
                                    accent="emerald"
                                    active
                                />
                                <MethodRow
                                    name="Saldo Menurun (Declining Balance)"
                                    desc="Penyusutan lebih besar di awal, menurun seiring waktu. Untuk kendaraan, elektronik."
                                    accent="blue"
                                    active
                                />
                                <MethodRow
                                    name="Jumlah Angka Tahun"
                                    desc="Bobot turun setiap tahun. Opsional, jarang dipakai di sektor publik."
                                    accent="slate"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <LineChart size={20} className="text-teal-600" />
                                Proyeksi Nilai Buku 5 Tahun
                            </h3>
                            <div className="flex-1 min-h-[180px] flex items-end gap-2">
                                {[100, 87, 75, 64, 53, 42].map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-cyan-400"
                                            style={{ height: `${h}%` }}
                                        />
                                        <span className="text-[10px] text-slate-500">{2026 + i}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-3">
                                Berdasarkan data perolehan dan metode penyusutan yang dipilih.
                            </p>
                        </div>
                    </div>

                    {/* Sample depreciation schedule */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Contoh Jadwal Penyusutan</h3>
                            <span className="text-xs text-slate-400">Per 31 Desember 2026 (simulasi)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                        <th className="px-4 py-3 font-semibold">Kode Aset</th>
                                        <th className="px-4 py-3 font-semibold">Nama</th>
                                        <th className="px-4 py-3 font-semibold">Tgl Perolehan</th>
                                        <th className="px-4 py-3 font-semibold text-right">Nilai Perolehan</th>
                                        <th className="px-4 py-3 font-semibold text-center">Umur (thn)</th>
                                        <th className="px-4 py-3 font-semibold">Metode</th>
                                        <th className="px-4 py-3 font-semibold text-right">Penyusutan / Thn</th>
                                        <th className="px-4 py-3 font-semibold text-right">Nilai Buku</th>
                                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <SampleRow
                                        kode="305-02-01-003" nama="Proyektor Epson EB-X05"
                                        tgl="2022-08-15" perolehan={8_500_000} umur={5}
                                        metode="Garis Lurus" perTahun={1_700_000} buku={2_125_000}
                                        status="aktif" />
                                    <SampleRow
                                        kode="305-02-01-004" nama="AC Daikin 2PK"
                                        tgl="2020-03-10" perolehan={6_200_000} umur={8}
                                        metode="Saldo Menurun" perTahun={930_000} buku={3_410_000}
                                        status="aktif" />
                                    <SampleRow
                                        kode="305-03-01-012" nama="Server Dell PowerEdge R250"
                                        tgl="2024-01-20" perolehan={45_000_000} umur={5}
                                        metode="Garis Lurus" perTahun={9_000_000} buku={36_750_000}
                                        status="aktif" />
                                    <SampleRow
                                        kode="305-02-04-001" nama="Mobil Operasional Avanza"
                                        tgl="2017-11-05" perolehan={210_000_000} umur={8}
                                        metode="Saldo Menurun" perTahun={31_500_000} buku={4_200_000}
                                        status="hampir-habis" />
                                    <SampleRow
                                        kode="305-01-05-007" nama="Kursi Kuliah Chitose DTC-04"
                                        tgl="2016-06-30" perolehan={780_000} umur={5}
                                        metode="Garis Lurus" perTahun={156_000} buku={0}
                                        status="habis" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 flex items-start gap-3">
                <Info size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold mb-1">Apa yang akan dihitung otomatis?</p>
                    <ul className="text-teal-800 text-xs space-y-1 list-disc list-inside">
                        <li>Penyusutan tahunan + akumulasi sejak tanggal perolehan untuk seluruh ~29,000 aset SIISYANA + Aset Hibah.</li>
                        <li>Sisa masa pakai per aset, dengan peringatan saat mendekati 0.</li>
                        <li>Nilai buku per gedung / unit kerja / kategori aset, terintegrasi dengan Dashboard.</li>
                        <li>Ekspor laporan ke Excel (XLSX) untuk pelaporan SIMAK BMN / BAST.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Preview helpers (no real data, just presentation)
// ============================================================================

const previewColors = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

interface PreviewStatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    color: keyof typeof previewColors;
}

const PreviewStatCard: React.FC<PreviewStatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const c = previewColors[color];
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${c.bg} shrink-0`}>
                    <Icon className={c.text} size={24} />
                </div>
            </div>
        </div>
    );
};

interface MethodRowProps {
    name: string;
    desc: string;
    accent: 'emerald' | 'blue' | 'slate';
    active?: boolean;
}

const MethodRow: React.FC<MethodRowProps> = ({ name, desc, accent, active = false }) => {
    const ring = accent === 'emerald' ? 'border-emerald-200 bg-emerald-50/40'
        : accent === 'blue' ? 'border-blue-200 bg-blue-50/40'
        : 'border-slate-200 bg-slate-50';
    return (
        <div className={`rounded-xl border ${ring} p-3 flex items-start gap-3`}>
            <div className={`mt-1 h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            {active && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    didukung
                </span>
            )}
        </div>
    );
};

interface SampleRowProps {
    kode: string; nama: string; tgl: string;
    perolehan: number; umur: number; metode: string;
    perTahun: number; buku: number;
    status: 'aktif' | 'hampir-habis' | 'habis';
}

const SampleRow: React.FC<SampleRowProps> = ({ kode, nama, tgl, perolehan, umur, metode, perTahun, buku, status }) => {
    const statusStyles =
        status === 'aktif' ? 'bg-emerald-100 text-emerald-700'
        : status === 'hampir-habis' ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';
    const statusLabel =
        status === 'aktif' ? 'Aktif'
        : status === 'hampir-habis' ? 'Hampir habis'
        : 'Habis pakai';
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3 font-mono text-xs text-slate-700">{kode}</td>
            <td className="px-4 py-3 font-medium text-slate-900">{nama}</td>
            <td className="px-4 py-3 text-xs text-slate-500">
                {new Date(tgl).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
            </td>
            <td className="px-4 py-3 text-right text-slate-700">{formatRp(perolehan)}</td>
            <td className="px-4 py-3 text-center text-slate-700">{umur}</td>
            <td className="px-4 py-3 text-slate-600 text-xs">{metode}</td>
            <td className="px-4 py-3 text-right text-rose-700 font-medium">{formatRp(perTahun)}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRp(buku)}</td>
            <td className="px-4 py-3 text-center">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles}`}>
                    {statusLabel}
                </span>
            </td>
        </tr>
    );
};
