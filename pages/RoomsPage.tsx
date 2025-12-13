import React, { useState, useEffect } from 'react';
import { roomsApi, buildingsApi } from '../api/client';
import { Plus, Pencil, Trash2, Loader2, Search, DoorOpen } from 'lucide-react';

interface Room {
    id: number;
    name: string;
    code: string;
    building?: { name: string; faculty?: { name: string } };
    floor: number;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    current_activity?: string;
}

export const RoomsPage: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [buildings, setBuildings] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [roomsRes, buildingsRes] = await Promise.all([
                roomsApi.list({ per_page: 100 }),
                buildingsApi.list({ per_page: 100 }),
            ]);
            setRooms(roomsRes.data || []);
            setBuildings(buildingsRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const res = await roomsApi.list({ search, per_page: 100 });
            setRooms(res.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus ruangan ini?')) return;
        try {
            await roomsApi.delete(id);
            loadData();
        } catch (error) {
            alert('Gagal menghapus: ' + (error as Error).message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Tersedia</span>;
            case 'OCCUPIED':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">Digunakan</span>;
            case 'MAINTENANCE':
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
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Ruangan</h1>
                    <p className="text-slate-500">Kelola data ruangan universitas</p>
                </div>
                <button
                    onClick={() => { setEditingRoom(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus size={18} />
                    Tambah Ruangan
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari ruangan..."
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
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Ruangan</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Gedung</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Kapasitas</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Aktivitas</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rooms.map((room) => (
                                    <tr key={room.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg">
                                                    <DoorOpen className="text-indigo-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{room.name}</p>
                                                    <p className="text-xs text-slate-500">{room.code} • Lantai {room.floor}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-600">{room.building?.name || '-'}</p>
                                            <p className="text-xs text-slate-400">{room.building?.faculty?.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600">{room.capacity}</td>
                                        <td className="px-6 py-4 text-center">{getStatusBadge(room.status)}</td>
                                        <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">
                                            {room.current_activity || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingRoom(room); setShowModal(true); }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(room.id)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {rooms.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            Tidak ada data ruangan
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
                <RoomModal
                    room={editingRoom}
                    buildings={buildings}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadData(); }}
                />
            )}
        </div>
    );
};

// Room Modal Component
interface RoomModalProps {
    room: Room | null;
    buildings: any[];
    onClose: () => void;
    onSave: () => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ room, buildings, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: room?.name || '',
        code: room?.code || '',
        building_id: '',
        floor: room?.floor || 1,
        capacity: room?.capacity || 0,
        status: room?.status || 'AVAILABLE',
        current_activity: room?.current_activity || '',
        description: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (room) {
                await roomsApi.update(room.id, formData);
            } else {
                await roomsApi.create(formData);
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
                        {room ? 'Edit Ruangan' : 'Tambah Ruangan'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ruangan</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Gedung</label>
                            <select
                                value={formData.building_id}
                                onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">-- Pilih Gedung --</option>
                                {buildings.map((b: any) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Lantai</label>
                            <input
                                type="number"
                                value={formData.floor}
                                onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="AVAILABLE">Tersedia</option>
                                <option value="OCCUPIED">Digunakan</option>
                                <option value="MAINTENANCE">Perbaikan</option>
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
