import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    BarChart3, Upload, Plus, Pencil, Trash2, X, Loader2, Search,
    CheckCircle2, AlertCircle, RefreshCw, DoorOpen, Building2,
} from 'lucide-react';
import { roomUtilizationApi, facultiesApi, locationsApi } from '../api/client';
import { RoomUtilization, UtilizationSession } from '../types';
import { Paginator, PAGE_SIZE_OPTIONS } from '../components/Paginator';

const SHEET_NAMES: Record<UtilizationSession, string> = {
    pagi: 'Persentase Utilitas Pagi',
    malam: 'Persentase Utilitas Malam',
};

interface ParsedRow {
    faculty_name: string;
    campus_name: string;
    gedung_name: string;
    room_count: number;
    utilization_percent: number;
    notes?: string;
}

// Source sheets mix casing for campus names ("Jimbaran" vs "JIMBARAN"), which
// would otherwise fragment grouping/filtering into duplicate campus buckets.
function normalizeCampusName(raw: string): string {
    const trimmed = raw.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// The summary sheets use merged cells: faculty (col B) and campus (col C) are
// only populated on the first row of each group and blank afterward. Forward-fill
// them, and skip header/title rows and the trailing totals row.
function parseSummarySheet(sheet: XLSX.WorkSheet): ParsedRow[] {
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const rows: ParsedRow[] = [];
    let lastFaculty = '';
    let lastCampus = '';

    for (const cells of raw) {
        const facultyCell = String(cells[1] ?? '').trim();
        const campusCell = String(cells[2] ?? '').trim();
        const gedungCell = String(cells[3] ?? '').trim();
        const roomCountRaw = cells[4];
        const utilizationRaw = cells[5];

        if (facultyCell) lastFaculty = facultyCell;
        if (campusCell) lastCampus = normalizeCampusName(campusCell);

        if (!gedungCell || /jumlah ruangan/i.test(gedungCell)) continue;

        const roomCount = Number(roomCountRaw);
        const utilizationFraction = Number(utilizationRaw);
        if (!Number.isFinite(roomCount) || roomCount <= 0) continue;
        if (!Number.isFinite(utilizationFraction)) continue;
        if (!lastFaculty || !lastCampus) continue;

        rows.push({
            faculty_name: lastFaculty,
            campus_name: lastCampus,
            gedung_name: gedungCell,
            room_count: roomCount,
            utilization_percent: Math.round(utilizationFraction * 1000) / 10, // fraction -> % (1 decimal)
            notes: String(cells[7] ?? '').trim() || undefined,
        });
    }

    return rows;
}

interface ImportResult {
    message: string;
    imported_count: number;
    error_count: number;
    errors: string[];
    rows: { id: number; gedung_name: string }[];
}

const emptyForm = {
    semester: '',
    session: 'pagi' as UtilizationSession,
    faculty_name: '',
    faculty_id: '',
    campus_name: '',
    location_id: '',
    gedung_name: '',
    room_count: '',
    utilization_percent: '',
    notes: '',
};

export const RoomUtilizationPage: React.FC = () => {
    const [rows, setRows] = useState<RoomUtilization[]>([]);
    const [semesters, setSemesters] = useState<string[]>([]);
    const [faculties, setFaculties] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [semester, setSemester] = useState('');
    const [session, setSession] = useState<UtilizationSession>('pagi');
    const [search, setSearch] = useState('');
    const [campusFilter, setCampusFilter] = useState('');

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importSemester, setImportSemester] = useState('');
    const [importSession, setImportSession] = useState<UtilizationSession>('pagi');
    const [importClearExisting, setImportClearExisting] = useState(true);
    const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Add/edit modal state
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingRow, setEditingRow] = useState<RoomUtilization | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState<RoomUtilization | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadSemesters = useCallback(async () => {
        const list = await roomUtilizationApi.semesters();
        setSemesters(list || []);
        if (!semester && list && list.length > 0) {
            setSemester(list[0]);
        } else if (!list || list.length === 0) {
            setLoading(false);
        }
    }, [semester]);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {};
            if (semester) params.semester = semester;
            if (session) params.session = session;
            const data = await roomUtilizationApi.list(params);
            setRows((data as any) || []);
        } catch (e: any) {
            setError(e?.message ?? 'Gagal memuat data utilitas ruangan.');
        } finally {
            setLoading(false);
        }
    }, [semester, session]);

    useEffect(() => {
        (async () => {
            try {
                const [facultiesData, locationsData] = await Promise.all([
                    facultiesApi.list(),
                    locationsApi.list(),
                ]);
                setFaculties(facultiesData || []);
                setLocations(locationsData || []);
            } catch {
                // non-fatal — faculty/location selects just stay empty
            }
        })();
        loadSemesters();
    }, []);

    useEffect(() => {
        if (semester) loadRows();
    }, [semester, session, loadRows]);

    useEffect(() => { setPageIndex(0); }, [search, campusFilter, semester, session]);

    // ---------------------------------------------------------------------
    // Derived data
    // ---------------------------------------------------------------------

    const campusOptions = useMemo(
        () => Array.from(new Set(rows.map(r => r.campus_name))).sort(),
        [rows]
    );

    const filteredRows = useMemo(() => {
        let list = rows;
        if (campusFilter) list = list.filter(r => r.campus_name === campusFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(r =>
                r.gedung_name.toLowerCase().includes(q) ||
                r.faculty_name.toLowerCase().includes(q)
            );
        }
        return list;
    }, [rows, campusFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const pagedRows = filteredRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    const totalRooms = rows.reduce((acc, r) => acc + r.room_count, 0);
    const avgUtilization = rows.length > 0
        ? rows.reduce((acc, r) => acc + parseFloat(r.utilization_percent), 0) / rows.length
        : 0;

    // Faculty x campus rollup (docx Table 4/6 shape)
    const rollup = useMemo(() => {
        const byFaculty = new Map<string, Map<string, number[]>>();
        for (const r of rows) {
            if (!byFaculty.has(r.faculty_name)) byFaculty.set(r.faculty_name, new Map());
            const byCampus = byFaculty.get(r.faculty_name)!;
            if (!byCampus.has(r.campus_name)) byCampus.set(r.campus_name, []);
            byCampus.get(r.campus_name)!.push(parseFloat(r.utilization_percent));
        }
        const campuses = campusOptions;
        return Array.from(byFaculty.entries()).map(([facultyName, byCampus]) => {
            const perCampus: Record<string, number | null> = {};
            for (const c of campuses) {
                const values = byCampus.get(c);
                perCampus[c] = values && values.length > 0
                    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
                    : null;
            }
            return { facultyName, perCampus };
        }).sort((a, b) => a.facultyName.localeCompare(b.facultyName));
    }, [rows, campusOptions]);

    // ---------------------------------------------------------------------
    // Import flow
    // ---------------------------------------------------------------------

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = SHEET_NAMES[importSession];
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) {
                    alert(`Sheet "${sheetName}" tidak ditemukan di file ini.`);
                    setSelectedFile(null);
                    return;
                }
                const parsed = parseSummarySheet(sheet);
                if (parsed.length === 0) {
                    alert('Tidak ada baris data yang berhasil dibaca dari sheet ini.');
                    setSelectedFile(null);
                    return;
                }
                setParsedRows(parsed);
                setShowImportModal(true);
            } catch (err) {
                alert('Gagal membaca file xlsx.');
                setSelectedFile(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (!parsedRows || !importSemester.trim()) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await roomUtilizationApi.import({
                semester: importSemester.trim(),
                session: importSession,
                clear_existing: importClearExisting,
                rows: parsedRows,
            });
            setImportResult(result);
            if (importSemester.trim() !== semester) {
                await loadSemesters();
            }
            setSemester(importSemester.trim());
            setSession(importSession);
            loadRows();
        } catch (e: any) {
            setImportResult({
                message: 'Import gagal',
                imported_count: 0,
                error_count: 1,
                errors: [e?.message ?? 'Unknown error'],
                rows: [],
            });
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setSelectedFile(null);
        setParsedRows(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ---------------------------------------------------------------------
    // Add / edit flow
    // ---------------------------------------------------------------------

    const openAddModal = () => {
        setEditingRow(null);
        setForm({ ...emptyForm, semester, session });
        setShowFormModal(true);
    };

    const openEditModal = (row: RoomUtilization) => {
        setEditingRow(row);
        setForm({
            semester: row.semester,
            session: row.session,
            faculty_name: row.faculty_name,
            faculty_id: row.faculty_id?.toString() || '',
            campus_name: row.campus_name,
            location_id: row.location_id?.toString() || '',
            gedung_name: row.gedung_name,
            room_count: String(row.room_count),
            utilization_percent: String(row.utilization_percent),
            notes: row.notes || '',
        });
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingRow(null);
        setForm(emptyForm);
    };

    const handleFormSave = async () => {
        setSaving(true);
        try {
            const payload = {
                semester: form.semester,
                session: form.session,
                faculty_name: form.faculty_name,
                faculty_id: form.faculty_id ? parseInt(form.faculty_id) : null,
                campus_name: form.campus_name,
                location_id: form.location_id ? parseInt(form.location_id) : null,
                gedung_name: form.gedung_name,
                room_count: parseInt(form.room_count),
                utilization_percent: parseFloat(form.utilization_percent),
                notes: form.notes || null,
            };
            if (editingRow) {
                await roomUtilizationApi.update(editingRow.id, payload);
            } else {
                await roomUtilizationApi.create(payload);
            }
            closeFormModal();
            loadSemesters();
            loadRows();
        } catch (e: any) {
            alert(e?.message ?? 'Gagal menyimpan data.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await roomUtilizationApi.delete(deleteTarget.id);
            setDeleteTarget(null);
            loadRows();
        } catch (e: any) {
            alert(e?.message ?? 'Gagal menghapus data.');
        } finally {
            setDeleting(false);
        }
    };

    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Utilitas Ruangan</h1>
                    <p className="text-slate-500">Laporan persentase pemanfaatan ruang kelas per gedung &amp; fakultas</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadRows}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Tambah Manual
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => {
                            setImportSemester(semester || '');
                            setImportSession(session);
                            fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all"
                    >
                        <Upload size={18} />
                        Import xlsx
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {/* Semester / session selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Semester</label>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                    >
                        {semesters.length === 0 && <option value="">Belum ada data</option>}
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sesi</label>
                    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                        {(['pagi', 'malam'] as UtilizationSession[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setSession(s)}
                                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                                    session === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cari Gedung / Fakultas</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="mis. GEDUNG AG, Fakultas Hukum..."
                            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kampus</label>
                    <select
                        value={campusFilter}
                        onChange={(e) => setCampusFilter(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Semua kampus</option>
                        {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Building2 className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
                            <p className="text-sm text-slate-500">Gedung tercatat</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <DoorOpen className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{totalRooms}</p>
                            <p className="text-sm text-slate-500">Total ruang kuliah</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <BarChart3 className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{avgUtilization.toFixed(1)}%</p>
                            <p className="text-sm text-slate-500">Rata-rata utilitas ({session})</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Faculty x campus rollup */}
            {rollup.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">Rata-Rata Utilitas per Fakultas &amp; Kampus</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                    <th className="px-6 py-3 font-semibold">Fakultas</th>
                                    {campusOptions.map(c => (
                                        <th key={c} className="px-6 py-3 font-semibold">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rollup.map(r => (
                                    <tr key={r.facultyName} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">{r.facultyName}</td>
                                        {campusOptions.map(c => (
                                            <td key={c} className="px-6 py-3">
                                                {r.perCampus[c] !== null ? (
                                                    <PercentBar value={r.perCampus[c] as number} />
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Per-building table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Detail per Gedung</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Memuat data...</span>
                        </div>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
                            <BarChart3 className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Belum Ada Data</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            Import file xlsx laporan utilitas ruangan, atau tambahkan baris secara manual.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                        <th className="px-6 py-4 font-semibold">Fakultas</th>
                                        <th className="px-6 py-4 font-semibold">Kampus</th>
                                        <th className="px-6 py-4 font-semibold">Gedung</th>
                                        <th className="px-6 py-4 font-semibold text-right">Jml Ruang</th>
                                        <th className="px-6 py-4 font-semibold">Utilitas</th>
                                        <th className="px-6 py-4 font-semibold">Catatan</th>
                                        <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagedRows.map(row => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">{row.faculty_name}</td>
                                            <td className="px-6 py-4 text-slate-600">{row.campus_name}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{row.gedung_name}</td>
                                            <td className="px-6 py-4 text-right text-slate-600 font-mono">{row.room_count}</td>
                                            <td className="px-6 py-4 w-48">
                                                <PercentBar value={parseFloat(row.utilization_percent)} />
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs max-w-xs truncate" title={row.notes || ''}>
                                                {row.notes || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(row)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Paginator
                            pageIndex={pageIndex}
                            totalPages={totalPages}
                            totalItems={filteredRows.length}
                            pageSize={pageSize}
                            onJump={setPageIndex}
                            label="gedung"
                        />
                    </>
                )}
            </div>

            {/* Import modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Import Utilitas Ruangan</h3>
                                <p className="text-sm text-slate-500">{selectedFile?.name}</p>
                            </div>
                            <button onClick={closeImportModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                            {!importResult ? (
                                <>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-sm text-slate-600">
                                            Sheet: <span className="font-medium text-slate-900">{SHEET_NAMES[importSession]}</span>
                                            {' — '}
                                            <span className="font-medium text-slate-900">{parsedRows?.length ?? 0}</span> baris terbaca
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                                            <input
                                                type="text"
                                                value={importSemester}
                                                onChange={(e) => setImportSemester(e.target.value)}
                                                placeholder='mis. "Genap 2025/2026"'
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Sesi</label>
                                            <select
                                                value={importSession}
                                                onChange={(e) => setImportSession(e.target.value as UtilizationSession)}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                            >
                                                <option value="pagi">Pagi</option>
                                                <option value="malam">Malam</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="clear_existing"
                                            checked={importClearExisting}
                                            onChange={(e) => setImportClearExisting(e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <label htmlFor="clear_existing" className="text-sm text-slate-700">
                                            Ganti data lama untuk semester &amp; sesi ini
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl ${importResult.imported_count > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {importResult.imported_count > 0 ? (
                                            <CheckCircle2 className="text-green-600" size={24} />
                                        ) : (
                                            <AlertCircle className="text-red-600" size={24} />
                                        )}
                                        <div>
                                            <p className={`font-medium ${importResult.imported_count > 0 ? 'text-green-800' : 'text-red-800'}`}>
                                                {importResult.message}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {importResult.imported_count} baris diimpor, {importResult.error_count} error
                                            </p>
                                        </div>
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <div className="bg-red-50 rounded-xl p-4">
                                            <p className="font-medium text-red-800 mb-2">Error:</p>
                                            <ul className="text-sm text-red-700 space-y-1">
                                                {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>• {err}</li>)}
                                                {importResult.errors.length > 5 && (
                                                    <li className="text-red-500">...dan {importResult.errors.length - 5} lainnya</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            {!importResult ? (
                                <>
                                    <button onClick={closeImportModal} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={importing || !importSemester.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        {importing ? (
                                            <><Loader2 size={18} className="animate-spin" /> Mengimpor...</>
                                        ) : (
                                            <><Upload size={18} /> Import {parsedRows?.length ?? 0} Baris</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button onClick={closeImportModal} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium">
                                    Tutup
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / edit modal */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingRow ? 'Edit Data Utilitas' : 'Tambah Data Utilitas'}
                            </h3>
                            <button onClick={closeFormModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                                    <input
                                        type="text"
                                        value={form.semester}
                                        onChange={(e) => setForm(f => ({ ...f, semester: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sesi</label>
                                    <select
                                        value={form.session}
                                        onChange={(e) => setForm(f => ({ ...f, session: e.target.value as UtilizationSession }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="pagi">Pagi</option>
                                        <option value="malam">Malam</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Fakultas</label>
                                    <input
                                        type="text"
                                        value={form.faculty_name}
                                        onChange={(e) => setForm(f => ({ ...f, faculty_name: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fakultas (link)</label>
                                    <select
                                        value={form.faculty_id}
                                        onChange={(e) => setForm(f => ({ ...f, faculty_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">-- Tidak diset --</option>
                                        {faculties.map((fac) => (
                                            <option key={fac.id} value={fac.id}>{fac.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kampus</label>
                                    <input
                                        type="text"
                                        value={form.campus_name}
                                        onChange={(e) => setForm(f => ({ ...f, campus_name: e.target.value }))}
                                        placeholder="Denpasar / Jimbaran"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi (link)</label>
                                    <select
                                        value={form.location_id}
                                        onChange={(e) => setForm(f => ({ ...f, location_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">-- Tidak diset --</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Gedung</label>
                                <input
                                    type="text"
                                    value={form.gedung_name}
                                    onChange={(e) => setForm(f => ({ ...f, gedung_name: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Ruang</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.room_count}
                                        onChange={(e) => setForm(f => ({ ...f, room_count: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Utilitas (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={form.utilization_percent}
                                        onChange={(e) => setForm(f => ({ ...f, utilization_percent: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={closeFormModal} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
                                Batal
                            </button>
                            <button
                                onClick={handleFormSave}
                                disabled={saving || !form.semester || !form.faculty_name || !form.campus_name || !form.gedung_name}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                                <Trash2 className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Data Ini?</h3>
                            <p className="text-slate-500 mb-6">
                                Data utilitas untuk <span className="font-medium">{deleteTarget.gedung_name}</span> ({deleteTarget.faculty_name}) akan dihapus. Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 size={18} className="animate-spin" /> : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PercentBar: React.FC<{ value: number }> = ({ value }) => {
    const clamped = Math.max(0, Math.min(100, value));
    const color = clamped >= 80 ? 'bg-emerald-500' : clamped >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${clamped}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-10 text-right">{value.toFixed(1)}%</span>
        </div>
    );
};
