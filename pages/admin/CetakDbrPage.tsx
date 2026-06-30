import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Printer, ArrowLeft } from 'lucide-react';
import { adminSiauApi } from '../../api/client';
import type { DbrPayload } from '../../types';

/**
 * Admin → Cetak DBR (Daftar Barang Ruangan).
 *
 * BMN-style printable layout. Open in a new tab from AssetsPage; user
 * triggers Ctrl/Cmd+P to save as PDF. All non-print chrome (toolbar)
 * is hidden via the `print:hidden` Tailwind utility.
 *
 * Admin-only: route is protected by <ProtectedRoute> upstream in App.tsx.
 * The underlying API endpoint is also sanctum-gated, so direct hits
 * without a session fail with 401.
 */
export const CetakDbrPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [dbr, setDbr] = useState<DbrPayload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) return;
        let cancelled = false;
        adminSiauApi.rooms.getDbr(roomId)
            .then((res) => { if (!cancelled) setDbr(res.data); })
            .catch((e: any) => {
                if (cancelled) return;
                const msg = e?.message ?? '';
                if (/401/.test(msg)) setError('Sesi berakhir. Silakan login kembali.');
                else if (/404/.test(msg)) setError('Ruangan tidak ditemukan.');
                else setError('Gagal memuat data DBR.');
            });
        return () => { cancelled = true; };
    }, [roomId]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} />
                    <h1 className="font-bold text-slate-900 mb-1">Tidak dapat memuat DBR</h1>
                    <p className="text-sm text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!dbr) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin" size={20} />
                    Memuat data DBR...
                </div>
            </div>
        );
    }

    const fmtRp = (n: number | null): string => {
        if (n === null || n === undefined) return '—';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
            .format(n);
    };
    const fmtTanggalCetak = (): string =>
        new Date(dbr.meta.generated_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
        });

    const kondisiSingkat = (k: string | null): string => {
        if (k === 'Baik') return 'B';
        if (k === 'Rusak Ringan') return 'RR';
        if (k === 'Rusak Berat') return 'RB';
        return '—';
    };

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Toolbar — hidden when printing */}
            <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <div className="text-xs text-slate-500">
                        Pratinjau DBR · {dbr.room.kode_ruangan}
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow"
                    >
                        <Printer size={16} /> Cetak / Simpan PDF
                    </button>
                </div>
            </div>

            {/* Printable A4 sheet */}
            <div className="max-w-5xl mx-auto bg-white shadow-lg my-6 print:shadow-none print:my-0 print:max-w-none">
                <div className="p-10 print:p-8 text-slate-900 font-serif text-[12px] leading-snug">
                    {/* KOP — official Unud letterhead: logo left, headings + address centered, thick rule below */}
                    <div className="flex items-center gap-4 border-b-[3px] border-black pb-3 mb-4">
                        <img
                            src="/unud-logo.png"
                            alt="Logo Universitas Udayana"
                            className="w-20 h-20 object-contain shrink-0"
                        />
                        <div className="flex-1 text-center uppercase">
                            <div className="font-bold text-[13px] leading-tight">{dbr.document.kementerian}</div>
                            <div className="font-bold text-[15px] leading-tight">{dbr.document.satker}</div>
                            <div className="text-[10.5px] normal-case leading-snug mt-1">{dbr.document.alamat}</div>
                            <div className="text-[10.5px] normal-case leading-snug">{dbr.document.telepon}</div>
                            <div className="text-[10.5px] normal-case leading-snug">{dbr.document.laman}</div>
                        </div>
                        {/* Spacer mirrors logo width so the headings stay visually centered */}
                        <div className="w-20 shrink-0" aria-hidden="true" />
                    </div>
                    {dbr.room.unit.panjang && (
                        <div className="text-center font-bold text-[12px] uppercase mb-2">
                            {dbr.room.unit.panjang}
                        </div>
                    )}

                    <h1 className="text-center font-bold text-base uppercase mb-1">
                        {dbr.document.judul}
                    </h1>
                    <div className="text-center text-[11px] mb-4">
                        per {fmtTanggalCetak()}
                    </div>

                    {/* Header info */}
                    <table className="text-[11px] mb-3 w-full">
                        <tbody>
                            <tr>
                                <td className="w-40 align-top">UPB</td>
                                <td className="w-3 align-top">:</td>
                                <td className="align-top font-semibold">
                                    {dbr.room.unit.panjang ?? '—'}
                                    {dbr.room.unit.singkat ? ` (${dbr.room.unit.singkat})` : ''}
                                </td>
                            </tr>
                            <tr>
                                <td className="align-top">Gedung</td>
                                <td className="align-top">:</td>
                                <td className="align-top">
                                    {dbr.room.gedung.nama ?? '—'}
                                    {dbr.room.gedung.kode ? ` (${dbr.room.gedung.kode})` : ''}
                                </td>
                            </tr>
                            <tr>
                                <td className="align-top">Nama Ruangan</td>
                                <td className="align-top">:</td>
                                <td className="align-top font-semibold">{dbr.room.nama}</td>
                            </tr>
                            <tr>
                                <td className="align-top">Kode Ruangan</td>
                                <td className="align-top">:</td>
                                <td className="align-top font-mono">{dbr.room.kode_ruangan}</td>
                            </tr>
                            <tr>
                                <td className="align-top">Jenis Ruangan</td>
                                <td className="align-top">:</td>
                                <td className="align-top">{dbr.room.jenis_ruangan ?? '—'}</td>
                            </tr>
                            {dbr.room.kapasitas != null && (
                                <tr>
                                    <td className="align-top">Kapasitas</td>
                                    <td className="align-top">:</td>
                                    <td className="align-top">{dbr.room.kapasitas} orang</td>
                                </tr>
                            )}
                            <tr>
                                <td className="align-top">Penanggung Jawab</td>
                                <td className="align-top">:</td>
                                <td className="align-top">
                                    {dbr.room.penanggung_jawab
                                        ? <>
                                            <span className="font-semibold">{dbr.room.penanggung_jawab.nama}</span>
                                            {dbr.room.penanggung_jawab.nip && (
                                                <span className="text-slate-600"> · NIP {dbr.room.penanggung_jawab.nip}</span>
                                            )}
                                        </>
                                        : <span className="italic text-slate-500">Belum ditetapkan</span>}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* DBR table */}
                    <table className="w-full border-collapse text-[10.5px] mt-2">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-black px-1 py-1 w-8">No.</th>
                                <th className="border border-black px-1 py-1">Kode Barang</th>
                                <th className="border border-black px-1 py-1 w-14">NUP</th>
                                <th className="border border-black px-1 py-1 text-left">Nama Barang / Spesifikasi</th>
                                <th className="border border-black px-1 py-1 w-16">Tahun<br/>Perolehan</th>
                                <th className="border border-black px-1 py-1 w-12">Jumlah</th>
                                <th className="border border-black px-1 py-1 w-12">Keadaan</th>
                                <th className="border border-black px-1 py-1 w-28 text-right">Nilai Perolehan (Rp)</th>
                                <th className="border border-black px-1 py-1 text-left">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dbr.assets.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="border border-black px-2 py-6 text-center italic text-slate-500">
                                        Tidak ada barang terdaftar di ruangan ini.
                                    </td>
                                </tr>
                            ) : (
                                dbr.assets.map((a, i) => (
                                    <tr key={`${a.kode_barang}-${a.no_aset ?? i}`}>
                                        <td className="border border-black px-1 py-0.5 text-center">{i + 1}</td>
                                        <td className="border border-black px-1 py-0.5 font-mono">
                                            {a.kode_barang}
                                            {a.source === 'hibah' && (
                                                <span className="ml-1 text-[8px] uppercase font-semibold text-purple-700">(hibah)</span>
                                            )}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 text-center font-mono">
                                            {a.no_aset ?? '—'}
                                        </td>
                                        <td className="border border-black px-1 py-0.5">
                                            <div className="font-medium">{a.nama_barang}</div>
                                            {a.merk_type && <div className="text-slate-600 text-[9.5px]">{a.merk_type}</div>}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 text-center">
                                            {a.tahun_perolehan ?? '—'}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 text-center">
                                            {a.kuantitas != null
                                                ? (Number.isInteger(a.kuantitas) ? a.kuantitas : a.kuantitas.toFixed(2))
                                                : '—'}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 text-center font-semibold">
                                            {kondisiSingkat(a.kondisi)}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                                            {a.nilai_perolehan != null
                                                ? new Intl.NumberFormat('id-ID').format(a.nilai_perolehan)
                                                : '—'}
                                        </td>
                                        <td className="border border-black px-1 py-0.5">{a.keterangan ?? ''}</td>
                                    </tr>
                                ))
                            )}
                            {dbr.assets.length > 0 && (
                                <tr className="bg-slate-100 font-semibold">
                                    <td className="border border-black px-1 py-1 text-center" colSpan={5}>
                                        TOTAL ({dbr.totals.count} barang)
                                    </td>
                                    <td className="border border-black px-1 py-1 text-center">
                                        {dbr.assets.reduce((s, a) => s + (a.kuantitas ?? 0), 0).toFixed(0)}
                                    </td>
                                    <td className="border border-black px-1 py-1"></td>
                                    <td className="border border-black px-1 py-1 text-right tabular-nums">
                                        {fmtRp(dbr.totals.nilai_perolehan)}
                                    </td>
                                    <td className="border border-black px-1 py-1"></td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="text-[10px] text-slate-600 mt-1">
                        Keterangan keadaan: B = Baik, RR = Rusak Ringan, RB = Rusak Berat.
                    </div>

                    {/* Signature footer */}
                    <div className="grid grid-cols-2 gap-12 mt-10">
                        <div className="text-center">
                            <div className="mb-1">Penanggung Jawab Ruangan,</div>
                            <div className="h-20"></div>
                            <div className="font-semibold border-t border-black inline-block px-6 pt-0.5">
                                {dbr.room.penanggung_jawab?.nama ?? '(.....................................)'}
                            </div>
                            {dbr.room.penanggung_jawab?.nip && (
                                <div className="text-[10px]">NIP. {dbr.room.penanggung_jawab.nip}</div>
                            )}
                        </div>
                        <div className="text-center">
                            <div>Denpasar, {fmtTanggalCetak()}</div>
                            <div className="mb-1">Penanggung Jawab UPB,</div>
                            <div className="h-20"></div>
                            <div className="font-semibold border-t border-black inline-block px-6 pt-0.5">
                                (.....................................)
                            </div>
                            <div className="text-[10px]">NIP. ............................</div>
                        </div>
                    </div>

                    <div className="text-[9px] text-slate-500 mt-6 text-right print:fixed print:bottom-2 print:right-8">
                        Dicetak oleh {dbr.meta.generated_by} · {new Date(dbr.meta.generated_at).toLocaleString('id-ID')}
                    </div>
                </div>
            </div>
        </div>
    );
};
