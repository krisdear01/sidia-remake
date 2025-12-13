import React, { useState, useEffect } from 'react';
import { buildingsApi, facultiesApi, locationsApi } from '../api/client';
import { Plus, Pencil, Trash2, Loader2, Search, Building2 } from 'lucide-react';

interface Building {
    id: number;
    name: string;
    code: string;
    faculty?: { name: string };
    location?: { name: string };
    floors: number;
    building_area: number;
    condition: string;
    is_active: boolean;
}

export const BuildingsPage: React.FC = () => {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [faculties, setFaculties] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [buildingsRes, facultiesRes, locationsRes] = await Promise.all([
                buildingsApi.list({ per_page: 100 }),
                facultiesApi.list(),
                locationsApi.list(),
            ]);
            setBuildings(buildingsRes.data || []);
            setFaculties(facultiesRes);
            setLocations(locationsRes);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const res = await buildingsApi.list({ search, per_page: 100 });
            setBuildings(res.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus gedung ini?')) return;
        try {
            await buildingsApi.delete(id);
            loadData();
        } catch (error) {
            alert('Gagal menghapus: ' + (error as Error).message);
        }
    };

    const handleEdit = (building: Building) => {
        setEditingBuilding(building);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingBuilding(null);
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Gedung</h1>
                    <p className="text-slate-500">Kelola data gedung universitas</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus size={18} />
                    Tambah Gedung
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari nama atau kode gedung..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                    >
                        Cari
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Gedung</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Fakultas</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Lokasi</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Lantai</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Kondisi</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {buildings.map((building) => (
                                    <tr key={building.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Building2 className="text-blue-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{building.name}</p>
                                                    <p className="text-xs text-slate-500">{building.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{building.faculty?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600">{building.location?.name || '-'}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{building.floors}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${building.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' :
                                                    building.condition === 'Rusak Ringan' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {building.condition}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(building)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(building.id)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {buildings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            Tidak ada data gedung
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <BuildingModal
                    building={editingBuilding}
                    faculties={faculties}
                    locations={locations}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

// Building Modal Component
interface BuildingModalProps {
    building: Building | null;
    faculties: any[];
    locations: any[];
    onClose: () => void;
    onSave: () => void;
}

const BuildingModal: React.FC<BuildingModalProps> = ({
    building,
    faculties,
    locations,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState({
        name: building?.name || '',
        code: building?.code || '',
        faculty_id: '',
        location_id: '',
        floors: building?.floors || 1,
        building_area: building?.building_area || 0,
        land_area: 0,
        condition: building?.condition || 'Baik',
        year_built: '',
        description: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (building) {
                await buildingsApi.update(building.id, formData);
            } else {
                await buildingsApi.create(formData);
            }
            onSave();
        } catch (error) {
            alert('Gagal menyimpan: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">
                        {building ? 'Edit Gedung' : 'Tambah Gedung'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Gedung</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Lantai</label>
                            <input
                                type="number"
                                value={formData.floors}
                                onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fakultas</label>
                            <select
                                value={formData.faculty_id}
                                onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Pilih Fakultas --</option>
                                {faculties.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                            <select
                                value={formData.location_id}
                                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Pilih Lokasi --</option>
                                {locations.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi</label>
                            <select
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Baik">Baik</option>
                                <option value="Rusak Ringan">Rusak Ringan</option>
                                <option value="Rusak Berat">Rusak Berat</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Luas Bangunan (m²)</label>
                            <input
                                type="number"
                                value={formData.building_area}
                                onChange={(e) => setFormData({ ...formData, building_area: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && <Loader2 className="animate-spin" size={16} />}
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
