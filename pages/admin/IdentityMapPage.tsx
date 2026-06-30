import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, X, CheckCircle2, Pencil, Loader2 } from 'lucide-react';
import { adminSiauApi } from '../../api/client';
import type { UnmatchedRow } from '../../types';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string; }

const friendlyError = (status: number | undefined, code: string | undefined): string => {
    if (status === 401) return 'Sesi Anda telah berakhir. Silakan login kembali.';
    if (status === 403) return 'Anda tidak memiliki izin untuk tindakan ini.';
    if (status === 429) return 'Terlalu banyak permintaan. Mohon tunggu sebentar lalu coba lagi.';
    if (status === 503 || code === 'SIAU_GATEWAY_UNREACHABLE') return 'Layanan validasi sedang tidak tersedia.';
    if (code === 'SIAU_ADMIN_TOKEN_MISSING') return 'Konfigurasi admin gateway belum lengkap. Hubungi tim teknis.';
    return 'Terjadi kesalahan saat menghubungi layanan validasi.';
};

export const IdentityMapPage: React.FC = () => {
    const [rows, setRows] = useState<UnmatchedRow[]>([]);
    const [meta, setMeta] = useState<{ total_unmatched: number; truncated: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [resyncing, setResyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editing, setEditing] = useState<UnmatchedRow | null>(null);

    const pushToast = useCallback((kind: ToastKind, message: string) => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, kind, message }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminSiauApi.identityMap.unmatched(200);
            // Gateway envelope: { data: UnmatchedRow[], meta: {...}, links: {...} }
            setRows(Array.isArray(res.data) ? res.data : []);
            setMeta({
                total_unmatched: res.meta?.total_unmatched ?? 0,
                truncated: !!res.meta?.truncated,
            });
        } catch (e: any) {
            // apiFetch throws Error with .message from server JSON; map common statuses.
            const msg = e?.message ?? '';
            const status = /HTTP error! status: (\d+)/.exec(msg)?.[1];
            setError(friendlyError(status ? Number(status) : undefined, undefined));
            setRows([]); // never leave rows as undefined for the render path
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleResync = async () => {
        setResyncing(true);
        try {
            await adminSiauApi.identityMap.resync();
            pushToast('success', 'Resync selesai. Memuat ulang daftar...');
            await load();
        } catch (e: any) {
            const msg = e?.message ?? '';
            const status = /HTTP error! status: (\d+)/.exec(msg)?.[1];
            pushToast('error', friendlyError(status ? Number(status) : undefined, undefined));
        } finally {
            setResyncing(false);
        }
    };

    const handleSaveOverride = async (siisyanaId: number, sipirangRoomId: number | null, note: string) => {
        try {
            await adminSiauApi.identityMap.update(siisyanaId, {
                sipirang_room_id: sipirangRoomId,
                note: note || undefined,
            });
            pushToast('success', `Mapping untuk SIISYANA #${siisyanaId} disimpan.`);
            setEditing(null);
            await load();
        } catch (e: any) {
            const msg = e?.message ?? '';
            const status = /HTTP error! status: (\d+)/.exec(msg)?.[1];
            pushToast('error', friendlyError(status ? Number(status) : undefined, undefined));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" /> Validasi Ruangan
                    </h1>
                    <p className="text-slate-500">
                        Reconcile ruangan SIISYANA &harr; SIPIRANG. Data hanya bisa diubah dari panel ini, tidak menyentuh database upstream.
                    </p>
                </div>
                <button
                    onClick={handleResync}
                    disabled={resyncing || loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium shadow"
                >
                    {resyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    Resync sekarang
                </button>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-rose-900">Tidak dapat memuat data</p>
                        <p className="text-sm text-rose-700">{error}</p>
                    </div>
                    <button onClick={load} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-rose-700">
                        Coba lagi
                    </button>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">Ruangan belum tercocokkan</h2>
                        {meta && (
                            <p className="text-xs text-slate-500">
                                {meta.total_unmatched} total
                                {meta.truncated && rows.length < meta.total_unmatched && (
                                    <> · menampilkan {rows.length} pertama</>
                                )}
                            </p>
                        )}
                    </div>
                    {!loading && rows.length === 0 && !error && (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                            <CheckCircle2 size={16} /> Semua tercocokkan
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                <th className="px-4 py-3 font-semibold">SIISYANA ID</th>
                                <th className="px-4 py-3 font-semibold">Kode Ruangan</th>
                                <th className="px-4 py-3 font-semibold">Confidence</th>
                                <th className="px-4 py-3 font-semibold">Catatan</th>
                                <th className="px-4 py-3 font-semibold">Last reconciled</th>
                                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                                    <Loader2 className="inline animate-spin text-blue-600 mr-2" size={18} /> Memuat...
                                </td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                                    {error ? '—' : 'Tidak ada ruangan yang menunggu validasi.'}
                                </td></tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.siisyana_room_id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-slate-700">{r.siisyana_room_id}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{r.kode_ruangan}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                r.confidence === 'manual' ? 'bg-emerald-100 text-emerald-700'
                                                : r.confidence === 'exact' ? 'bg-blue-100 text-blue-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>{r.confidence}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={r.note || ''}>
                                            {r.note || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {r.last_reconciled_at
                                                ? new Date(r.last_reconciled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setEditing(r)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700"
                                            >
                                                <Pencil size={14} /> Override
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editing && (
                <OverrideModal
                    row={editing}
                    onClose={() => setEditing(null)}
                    onSave={handleSaveOverride}
                />
            )}

            <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`rounded-xl p-4 shadow-lg flex items-start gap-3 ${
                            t.kind === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                            : t.kind === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-900'
                            : 'bg-blue-50 border border-blue-200 text-blue-900'
                        }`}
                    >
                        {t.kind === 'success' && <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />}
                        {t.kind === 'error' && <AlertCircle size={20} className="text-rose-600 shrink-0" />}
                        <p className="text-sm flex-1">{t.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface OverrideModalProps {
    row: UnmatchedRow;
    onClose: () => void;
    onSave: (siisyanaId: number, sipirangRoomId: number | null, note: string) => void | Promise<void>;
}

const OverrideModal: React.FC<OverrideModalProps> = ({ row, onClose, onSave }) => {
    const [sipirangIdStr, setSipirangIdStr] = useState('');
    const [note, setNote] = useState(row.note ?? '');
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        let parsed: number | null = null;
        if (sipirangIdStr.trim() !== '') {
            const n = Number(sipirangIdStr.trim());
            if (!Number.isInteger(n) || n <= 0) {
                setValidationError('SIPIRANG ID harus bilangan bulat positif, atau kosongkan untuk meng-unmap.');
                return;
            }
            parsed = n;
        }
        setSaving(true);
        try {
            await onSave(row.siisyana_room_id, parsed, note.trim());
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Override mapping</h3>
                        <p className="text-sm text-slate-500">
                            SIISYANA <span className="font-mono">#{row.siisyana_room_id}</span> · {row.kode_ruangan}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Tutup">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">SIPIRANG room ID</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={sipirangIdStr}
                            onChange={(e) => setSipirangIdStr(e.target.value)}
                            placeholder="kosongkan untuk meng-unmap"
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan (opsional)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">{note.length}/500</p>
                    </div>
                    {validationError && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                            {validationError}
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                            disabled={saving}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
