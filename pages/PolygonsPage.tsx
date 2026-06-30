import React, { useState, useEffect, useRef } from 'react';
import { Map, RefreshCw, Upload, Trash2, FileJson, CheckCircle2, AlertCircle, X, Eye, Download, Loader2, Pencil, Save } from 'lucide-react';
import { polygonsApi, locationsApi, facultiesApi } from '../api/client';

interface Polygon {
    id: number;
    name: string;
    fill_color: string;
    stroke_color: string;
    fill_opacity: number;
    land_area: number | null;
    is_active: boolean;
    asset_type?: 'bangunan' | 'tanah' | null;
    siisyana_gedung_id?: number | null;
    siisyana_tanah_id?: number | null;
    faculty?: { id: number; name: string; color: string } | null;
    location?: { id: number; name: string } | null;
    geojson: any;
}

interface ImportResult {
    message: string;
    imported_count: number;
    error_count: number;
    errors: string[];
    polygons: { id: number; name: string }[];
}

export const PolygonsPage: React.FC = () => {
    const [polygons, setPolygons] = useState<Polygon[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [faculties, setFaculties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPolygon, setEditingPolygon] = useState<Polygon | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        land_area: '',
        fill_color: '',
        stroke_color: '',
        fill_opacity: 0.4,
        faculty_id: '',
        location_id: '',
        asset_type: '',
        siisyana_gedung_id: '',
        siisyana_tanah_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [geojsonPreview, setGeojsonPreview] = useState<any>(null);
    const [importSettings, setImportSettings] = useState({
        location_id: '',
        faculty_id: '',
        default_fill_color: '#3b82f6',
        default_stroke_color: '#1d4ed8',
        default_fill_opacity: 0.4,
        clear_existing: false,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [polygonsData, locationsData, facultiesData] = await Promise.all([
                polygonsApi.list(),
                locationsApi.list(),
                facultiesApi.list(),
            ]);
            setPolygons(polygonsData || []);
            setLocations(locationsData || []);
            setFaculties(facultiesData || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
            alert('Please select a valid GeoJSON file (.geojson or .json)');
            return;
        }

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.type !== 'FeatureCollection') {
                    alert('Invalid GeoJSON: Must be a FeatureCollection');
                    setSelectedFile(null);
                    return;
                }
                setGeojsonPreview(json);
                setShowImportModal(true);
            } catch (err) {
                alert('Failed to parse GeoJSON file');
                setSelectedFile(null);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!geojsonPreview) return;

        setImporting(true);
        setImportResult(null);

        try {
            const result = await polygonsApi.import({
                geojson: geojsonPreview,
                location_id: importSettings.location_id ? parseInt(importSettings.location_id) : undefined,
                faculty_id: importSettings.faculty_id ? parseInt(importSettings.faculty_id) : undefined,
                default_fill_color: importSettings.default_fill_color,
                default_stroke_color: importSettings.default_stroke_color,
                default_fill_opacity: importSettings.default_fill_opacity,
                clear_existing: importSettings.clear_existing,
            });

            setImportResult(result);
            loadData(); // Refresh the list
        } catch (error: any) {
            setImportResult({
                message: 'Import failed',
                imported_count: 0,
                error_count: 1,
                errors: [error.message || 'Unknown error occurred'],
                polygons: [],
            });
        } finally {
            setImporting(false);
        }
    };

    const handleDeleteAll = async () => {
        try {
            await polygonsApi.deleteAll();
            setShowDeleteModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to delete polygons:', error);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setSelectedFile(null);
        setGeojsonPreview(null);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeleteSingle = async (id: number) => {
        if (!confirm('Are you sure you want to delete this polygon?')) return;
        try {
            await polygonsApi.delete(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete polygon:', error);
        }
    };

    const handleEditClick = (polygon: Polygon) => {
        setEditingPolygon(polygon);
        setEditForm({
            name: polygon.name || '',
            land_area: polygon.land_area?.toString() || '',
            fill_color: polygon.fill_color || '#3b82f6',
            stroke_color: polygon.stroke_color || '#1d4ed8',
            fill_opacity: polygon.fill_opacity || 0.4,
            faculty_id: polygon.faculty?.id?.toString() || '',
            location_id: polygon.location?.id?.toString() || '',
            asset_type: polygon.asset_type || '',
            siisyana_gedung_id: polygon.siisyana_gedung_id?.toString() || '',
            siisyana_tanah_id: polygon.siisyana_tanah_id?.toString() || '',
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editingPolygon) return;

        setSaving(true);
        try {
            await polygonsApi.update(editingPolygon.id, {
                name: editForm.name,
                land_area: editForm.land_area ? parseFloat(editForm.land_area) : null,
                fill_color: editForm.fill_color,
                stroke_color: editForm.stroke_color,
                fill_opacity: editForm.fill_opacity,
                faculty_id: editForm.faculty_id ? parseInt(editForm.faculty_id) : null,
                location_id: editForm.location_id ? parseInt(editForm.location_id) : null,
                asset_type: editForm.asset_type || null,
                siisyana_gedung_id: editForm.asset_type === 'bangunan' && editForm.siisyana_gedung_id
                    ? parseInt(editForm.siisyana_gedung_id) : null,
                siisyana_tanah_id: editForm.asset_type === 'tanah' && editForm.siisyana_tanah_id
                    ? parseInt(editForm.siisyana_tanah_id) : null,
            });
            setShowEditModal(false);
            setEditingPolygon(null);
            loadData();
        } catch (error) {
            console.error('Failed to update polygon:', error);
            alert('Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingPolygon(null);
    };

    const formatArea = (area: number | null) => {
        if (!area) return '-';
        return `${area.toLocaleString('id-ID')} m²`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Peta & Polygon</h1>
                    <p className="text-slate-500">Kelola data polygon wilayah universitas</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    {polygons.length > 0 && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
                        >
                            <Trash2 size={18} />
                            Hapus Semua
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".geojson,.json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all"
                    >
                        <Upload size={18} />
                        Import GeoJSON
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Map className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{polygons.length}</p>
                            <p className="text-sm text-slate-500">Total Polygon</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{polygons.filter(p => p.is_active).length}</p>
                            <p className="text-sm text-slate-500">Aktif</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <FileJson className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{polygons.filter(p => p.faculty).length}</p>
                            <p className="text-sm text-slate-500">Linked to Faculty</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                            <FileJson className="text-amber-600" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {polygons.reduce((acc, p) => acc + (p.land_area || 0), 0).toLocaleString('id-ID')}
                            </p>
                            <p className="text-sm text-slate-500">Total Area (m²)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Polygon list */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Daftar Polygon</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Memuat data...</span>
                        </div>
                    </div>
                ) : polygons.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
                            <Map className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Belum Ada Data Polygon</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            Import file GeoJSON untuk menambahkan data polygon ke sistem. Polygon akan ditampilkan di peta interaktif.
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                        >
                            <Upload size={18} />
                            Import GeoJSON
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                    <th className="px-6 py-4 font-semibold">Nama</th>
                                    <th className="px-6 py-4 font-semibold">Fakultas</th>
                                    <th className="px-6 py-4 font-semibold">Lokasi</th>
                                    <th className="px-6 py-4 font-semibold">Warna</th>
                                    <th className="px-6 py-4 font-semibold">Luas Area</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {polygons.map((polygon) => (
                                    <tr key={polygon.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full ring-2 ring-offset-2"
                                                    style={{
                                                        backgroundColor: polygon.fill_color,
                                                        ringColor: polygon.stroke_color
                                                    }}
                                                />
                                                <span className="font-medium text-slate-900">{polygon.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {polygon.faculty?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {polygon.location?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border border-slate-200"
                                                    style={{ backgroundColor: polygon.fill_color }}
                                                    title={`Fill: ${polygon.fill_color}`}
                                                />
                                                <div
                                                    className="w-6 h-6 rounded border border-slate-200"
                                                    style={{ backgroundColor: polygon.stroke_color }}
                                                    title={`Stroke: ${polygon.stroke_color}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                            {formatArea(polygon.land_area)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {polygon.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    Nonaktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEditClick(polygon)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Edit polygon"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSingle(polygon.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Delete polygon"
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
                )}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Import GeoJSON</h3>
                                <p className="text-sm text-slate-500">{selectedFile?.name}</p>
                            </div>
                            <button
                                onClick={closeImportModal}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                            {!importResult ? (
                                <>
                                    {/* Preview */}
                                    {geojsonPreview && (
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Eye size={16} className="text-slate-500" />
                                                <span className="font-medium text-slate-700">Preview</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Type:</span>{' '}
                                                    <span className="font-medium text-slate-900">{geojsonPreview.type}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Features:</span>{' '}
                                                    <span className="font-medium text-slate-900">{geojsonPreview.features?.length || 0}</span>
                                                </div>
                                                {geojsonPreview.name && (
                                                    <div className="col-span-2">
                                                        <span className="text-slate-500">Name:</span>{' '}
                                                        <span className="font-medium text-slate-900">{geojsonPreview.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Import settings */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-slate-900">Import Settings</h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Lokasi
                                                </label>
                                                <select
                                                    value={importSettings.location_id}
                                                    onChange={(e) => setImportSettings(s => ({ ...s, location_id: e.target.value }))}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">-- Tidak diset --</option>
                                                    {locations.map((loc) => (
                                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Fakultas
                                                </label>
                                                <select
                                                    value={importSettings.faculty_id}
                                                    onChange={(e) => setImportSettings(s => ({ ...s, faculty_id: e.target.value }))}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">-- Tidak diset --</option>
                                                    {faculties.map((fac) => (
                                                        <option key={fac.id} value={fac.id}>{fac.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Fill Color
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={importSettings.default_fill_color}
                                                        onChange={(e) => setImportSettings(s => ({ ...s, default_fill_color: e.target.value }))}
                                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={importSettings.default_fill_color}
                                                        onChange={(e) => setImportSettings(s => ({ ...s, default_fill_color: e.target.value }))}
                                                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Stroke Color
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={importSettings.default_stroke_color}
                                                        onChange={(e) => setImportSettings(s => ({ ...s, default_stroke_color: e.target.value }))}
                                                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={importSettings.default_stroke_color}
                                                        onChange={(e) => setImportSettings(s => ({ ...s, default_stroke_color: e.target.value }))}
                                                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Fill Opacity
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={importSettings.default_fill_opacity}
                                                    onChange={(e) => setImportSettings(s => ({ ...s, default_fill_opacity: parseFloat(e.target.value) }))}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="clear_existing"
                                                checked={importSettings.clear_existing}
                                                onChange={(e) => setImportSettings(s => ({ ...s, clear_existing: e.target.checked }))}
                                                className="rounded border-slate-300"
                                            />
                                            <label htmlFor="clear_existing" className="text-sm text-slate-700">
                                                Hapus semua polygon yang ada sebelum import
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // Import result
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl ${importResult.imported_count > 0 ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
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
                                                {importResult.imported_count} imported, {importResult.error_count} errors
                                            </p>
                                        </div>
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className="bg-red-50 rounded-xl p-4">
                                            <p className="font-medium text-red-800 mb-2">Errors:</p>
                                            <ul className="text-sm text-red-700 space-y-1">
                                                {importResult.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i}>• {err}</li>
                                                ))}
                                                {importResult.errors.length > 5 && (
                                                    <li className="text-red-500">...and {importResult.errors.length - 5} more</li>
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
                                    <button
                                        onClick={closeImportModal}
                                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={importing}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        {importing ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                Import {geojsonPreview?.features?.length || 0} Features
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeImportModal}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium"
                                >
                                    Tutup
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                                <Trash2 className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Semua Polygon?</h3>
                            <p className="text-slate-500 mb-6">
                                Tindakan ini akan menghapus {polygons.length} polygon dari database. Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                                >
                                    Ya, Hapus Semua
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Polygon Modal */}
            {showEditModal && editingPolygon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Edit Polygon</h3>
                                <p className="text-sm text-slate-500">{editingPolygon.name}</p>
                            </div>
                            <button
                                onClick={closeEditModal}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nama Polygon
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Land Area */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Luas Area (m²)
                                </label>
                                <input
                                    type="number"
                                    value={editForm.land_area}
                                    onChange={(e) => setEditForm(f => ({ ...f, land_area: e.target.value }))}
                                    placeholder="Contoh: 50000"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                />
                                <p className="text-xs text-slate-400 mt-1">Masukkan luas area dalam meter persegi</p>
                            </div>

                            {/* Faculty & Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Fakultas
                                    </label>
                                    <select
                                        value={editForm.faculty_id}
                                        onChange={(e) => setEditForm(f => ({ ...f, faculty_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">-- Tidak diset --</option>
                                        {faculties.map((fac) => (
                                            <option key={fac.id} value={fac.id}>{fac.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Lokasi
                                    </label>
                                    <select
                                        value={editForm.location_id}
                                        onChange={(e) => setEditForm(f => ({ ...f, location_id: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">-- Tidak diset --</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* SIISYANA linkage */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                <p className="text-sm font-semibold text-slate-700">Tautan Data SIISYANA</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Tipe Aset
                                        </label>
                                        <select
                                            value={editForm.asset_type}
                                            onChange={(e) => setEditForm(f => ({ ...f, asset_type: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">-- Tidak ditautkan --</option>
                                            <option value="bangunan">Bangunan (Gedung)</option>
                                            <option value="tanah">Tanah</option>
                                        </select>
                                    </div>
                                    {editForm.asset_type === 'bangunan' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                ID Gedung SIISYANA
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.siisyana_gedung_id}
                                                onChange={(e) => setEditForm(f => ({ ...f, siisyana_gedung_id: e.target.value }))}
                                                placeholder="mis. 88"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                            />
                                        </div>
                                    )}
                                    {editForm.asset_type === 'tanah' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                ID Tanah SIISYANA
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.siisyana_tanah_id}
                                                onChange={(e) => setEditForm(f => ({ ...f, siisyana_tanah_id: e.target.value }))}
                                                placeholder="mis. 6"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">
                                    Tautkan polygon ke record SIISYANA agar popup &amp; detail menampilkan KIB, ruangan, dan galeri.
                                </p>
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Fill Color
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="color"
                                            value={editForm.fill_color}
                                            onChange={(e) => setEditForm(f => ({ ...f, fill_color: e.target.value }))}
                                            className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer p-1"
                                        />
                                        <input
                                            type="text"
                                            value={editForm.fill_color}
                                            onChange={(e) => setEditForm(f => ({ ...f, fill_color: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-center"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Stroke Color
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="color"
                                            value={editForm.stroke_color}
                                            onChange={(e) => setEditForm(f => ({ ...f, stroke_color: e.target.value }))}
                                            className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer p-1"
                                        />
                                        <input
                                            type="text"
                                            value={editForm.stroke_color}
                                            onChange={(e) => setEditForm(f => ({ ...f, stroke_color: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-center"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Opacity
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={editForm.fill_opacity}
                                            onChange={(e) => setEditForm(f => ({ ...f, fill_opacity: parseFloat(e.target.value) }))}
                                            className="w-full h-10 cursor-pointer"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={editForm.fill_opacity}
                                            onChange={(e) => setEditForm(f => ({ ...f, fill_opacity: parseFloat(e.target.value) }))}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Simpan Perubahan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
