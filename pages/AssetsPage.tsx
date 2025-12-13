import React, { useState, useEffect } from 'react';
import { assetsApi, roomsApi } from '../api/client';
import { Plus, Pencil, Trash2, Loader2, Search, Package } from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    code: string;
    brand?: string;
    room?: { name: string; building?: { name: string } };
    quantity: number;
    condition: 'Baik' | 'Rusak' | 'Perbaikan';
}

export const AssetsPage: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [assetsRes, roomsRes] = await Promise.all([
                assetsApi.list({ per_page: 100 }),
                roomsApi.list({ per_page: 100 }),
            ]);
            setAssets(assetsRes.data || []);
            setRooms(roomsRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const res = await assetsApi.list({ search, per_page: 100 });
            setAssets(res.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus aset ini?')) return;
        try {
            await assetsApi.delete(id);
            loadData();
        } catch (error) {
            alert('Gagal menghapus: ' + (error as Error).message);
        }
    };

    const getConditionBadge = (condition: string) => {
        switch (condition) {
            case 'Baik':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Baik</span>;
            case 'Rusak':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">Rusak</span>;
            case 'Perbaikan':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Perbaikan</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Aset</h1>
                    <p className="text-slate-500">Kelola inventaris aset ruangan</p>
                </div>
                <button
                    onClick={() => { setEditingAsset(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus size={18} />
                    Tambah Aset
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari aset..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button onClick={handleSearch} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">
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
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Aset</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Ruangan</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Jumlah</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Kondisi</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-violet-100 rounded-lg">
                                                    <Package className="text-violet-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{asset.name}</p>
                                                    <p className="text-xs text-slate-500">{asset.code} {asset.brand && `• ${asset.brand}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-600">{asset.room?.name || '-'}</p>
                                            <p className="text-xs text-slate-400">{asset.room?.building?.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-900">{asset.quantity}</td>
                                        <td className="px-6 py-4 text-center">{getConditionBadge(asset.condition)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingAsset(asset); setShowModal(true); }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {assets.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Tidak ada data aset
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
                <AssetModal
                    asset={editingAsset}
                    rooms={rooms}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadData(); }}
                />
            )}
        </div>
    );
};

// Asset Modal Component
interface AssetModalProps {
    asset: Asset | null;
    rooms: any[];
    onClose: () => void;
    onSave: () => void;
}

const AssetModal: React.FC<AssetModalProps> = ({ asset, rooms, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: asset?.name || '',
        code: asset?.code || '',
        brand: asset?.brand || '',
        room_id: '',
        quantity: asset?.quantity || 1,
        condition: asset?.condition || 'Baik',
        description: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (asset) {
                await assetsApi.update(asset.id, formData);
            } else {
                await assetsApi.create(formData);
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">
                        {asset ? 'Edit Aset' : 'Tambah Aset'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Aset</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Merk/Tipe</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ruangan</label>
                            <select
                                value={formData.room_id}
                                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Pilih Ruangan --</option>
                                {rooms.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi</label>
                            <select
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Baik">Baik</option>
                                <option value="Rusak">Rusak</option>
                                <option value="Perbaikan">Perbaikan</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
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
