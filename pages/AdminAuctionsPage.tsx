import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2,
    Gavel, Building2, Users, Clock, CheckCircle2, XCircle,
    AlertCircle, Loader2, ChevronDown, X, Upload, Image as ImageIcon
} from 'lucide-react';
import { adminAuctionsApi } from '../api/client';

interface AuctionItem {
    id: number;
    title: string;
    description: string;
    item_type: string;
    auction_type: string;
    limit_price: number;
    current_highest_bid: number | null;
    deposit_amount: number;
    deposit_percentage: number;
    start_date: string;
    end_date: string;
    status: string;
    location_name: string;
    images: string[];
    created_at: string;
    winner?: { id: number; name: string };
    creator?: { id: number; name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
    upcoming: { label: 'Akan Datang', color: 'text-blue-600', bg: 'bg-blue-100' },
    active: { label: 'Aktif', color: 'text-green-600', bg: 'bg-green-100' },
    ended: { label: 'Berakhir', color: 'text-gray-600', bg: 'bg-gray-100' },
    cancelled: { label: 'Dibatalkan', color: 'text-red-600', bg: 'bg-red-100' },
    rented: { label: 'Disewa', color: 'text-purple-600', bg: 'bg-purple-100' },
};

const TYPE_LABELS: Record<string, string> = {
    auction: 'Tender',
    rent: 'Sewa',
    facility_rent: 'Fasilitas',
};

const ITEM_TYPE_LABELS: Record<string, string> = {
    land: 'Tanah',
    building: 'Bangunan',
    room: 'Ruangan',
    facility: 'Fasilitas',
    other: 'Lainnya',
};

export const AdminAuctionsPage: React.FC = () => {
    const [auctions, setAuctions] = useState<AuctionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAuction, setEditingAuction] = useState<AuctionItem | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadAuctions();
    }, [filterType, filterStatus]);

    const loadAuctions = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterType) params.type = filterType;
            if (filterStatus) params.status = filterStatus;
            if (searchTerm) params.search = searchTerm;

            const response = await adminAuctionsApi.list(params);
            setAuctions(response.data || []);
        } catch (error) {
            console.error('Failed to load auctions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadAuctions();
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        setActionLoading(true);
        try {
            await adminAuctionsApi.updateStatus(id, newStatus);
            loadAuctions();
        } catch (error: any) {
            alert(error.message || 'Gagal mengubah status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        setActionLoading(true);
        try {
            await adminAuctionsApi.delete(id);
            setShowDeleteConfirm(null);
            loadAuctions();
        } catch (error: any) {
            alert(error.message || 'Gagal menghapus tender');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDetermineWinner = async (id: number) => {
        if (!confirm('Tentukan pemenang tender ini?')) return;

        setActionLoading(true);
        try {
            const result = await adminAuctionsApi.determineWinner(id);
            alert(`Pemenang: ${result.winner.bidder.name} dengan penawaran ${formatPrice(result.winner.winning_bid)}`);
            loadAuctions();
        } catch (error: any) {
            alert(error.message || 'Gagal menentukan pemenang');
        } finally {
            setActionLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">E-Tender & Sewa</h1>
                    <p className="text-slate-500">Kelola tender, sewa, dan fasilitas</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                    <Plus size={20} />
                    Buat Tender Baru
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Gavel className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Tender</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {auctions.filter(a => a.auction_type === 'auction').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Building2 className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Sewa Aktif</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {auctions.filter(a => a.auction_type === 'rent' && a.status === 'active').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Users className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Fasilitas</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {auctions.filter(a => a.auction_type === 'facility_rent').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Clock className="text-orange-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Sedang Berlangsung</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {auctions.filter(a => a.status === 'active').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari judul atau lokasi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </form>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Semua Tipe</option>
                        <option value="auction">Tender</option>
                        <option value="rent">Sewa</option>
                        <option value="facility_rent">Fasilitas</option>
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="upcoming">Akan Datang</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : auctions.length === 0 ? (
                    <div className="text-center py-20">
                        <Gavel className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">Belum ada tender atau sewa</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Judul
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Tipe
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Harga
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Periode
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {auctions.map((auction) => (
                                    <tr key={auction.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{auction.title}</p>
                                                <p className="text-sm text-slate-500">
                                                    {ITEM_TYPE_LABELS[auction.item_type]} • {auction.location_name || 'Unud'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                {TYPE_LABELS[auction.auction_type]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {formatPrice(auction.current_highest_bid || auction.limit_price)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Deposit: {formatPrice(auction.deposit_amount)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="text-slate-900">{formatDate(auction.start_date)}</p>
                                                <p className="text-slate-500">s/d {formatDate(auction.end_date)}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[auction.status]?.bg} ${STATUS_CONFIG[auction.status]?.color}`}>
                                                {STATUS_CONFIG[auction.status]?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Status Actions */}
                                                {auction.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleStatusChange(auction.id, 'upcoming')}
                                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                        disabled={actionLoading}
                                                    >
                                                        Publish
                                                    </button>
                                                )}
                                                {auction.status === 'upcoming' && (
                                                    <button
                                                        onClick={() => handleStatusChange(auction.id, 'active')}
                                                        className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                                                        disabled={actionLoading}
                                                    >
                                                        Aktifkan
                                                    </button>
                                                )}
                                                {auction.status === 'active' && auction.auction_type === 'auction' && (
                                                    <button
                                                        onClick={() => handleDetermineWinner(auction.id)}
                                                        className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                                                        disabled={actionLoading}
                                                    >
                                                        Akhiri
                                                    </button>
                                                )}

                                                {/* Edit */}
                                                <button
                                                    onClick={() => setEditingAuction(auction)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <Edit size={16} />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => setShowDeleteConfirm(auction.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

            {/* Create/Edit Modal */}
            {(showCreateModal || editingAuction) && (
                <AuctionFormModal
                    auction={editingAuction}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingAuction(null);
                    }}
                    onSave={() => {
                        setShowCreateModal(false);
                        setEditingAuction(null);
                        loadAuctions();
                    }}
                />
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                Hapus Tender?
                            </h3>
                            <p className="text-slate-500 mb-6">
                                Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => handleDelete(showDeleteConfirm)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Menghapus...' : 'Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Auction Form Modal Component
const AuctionFormModal: React.FC<{
    auction: AuctionItem | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ auction, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>(auction?.images || []);
    const [removedImages, setRemovedImages] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        title: auction?.title || '',
        description: auction?.description || '',
        item_type: auction?.item_type || 'building',
        auction_type: auction?.auction_type || 'auction',
        limit_price: auction?.limit_price?.toString() || '',
        deposit_percentage: auction?.deposit_percentage?.toString() || '20',
        start_date: auction?.start_date?.slice(0, 16) || '',
        end_date: auction?.end_date?.slice(0, 16) || '',
        bidding_type: 'open',
        location_name: auction?.location_name || '',
        terms_conditions: '',
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...filesArray]);
        }
    };

    const removeNewFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (imagePath: string) => {
        setExistingImages(prev => prev.filter(img => img !== imagePath));
        setRemovedImages(prev => [...prev, imagePath]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) data.append(key, value.toString());
            });

            // Append new images
            if (auction) {
                // Editing
                selectedFiles.forEach((file) => {
                    data.append('new_images[]', file);
                });
                removedImages.forEach((img) => {
                    data.append('remove_images[]', img);
                });
            } else {
                // Creating
                selectedFiles.forEach((file) => {
                    data.append('images[]', file);
                });
            }

            if (auction) {
                await adminAuctionsApi.update(auction.id, data);
            } else {
                await adminAuctionsApi.create(data);
            }
            onSave();
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">
                        {auction ? 'Edit Tender' : 'Buat Tender Baru'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Judul <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Gambar / Foto Aset
                        </label>
                        <div className="grid grid-cols-4 gap-4 mb-3">
                            {/* Existing Images */}
                            {existingImages.map((img, idx) => (
                                <div key={`existing-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                    <img
                                        src={`http://localhost:8000/storage/${img}`}
                                        alt={`Existing ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(img)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* New Selected Images */}
                            {selectedFiles.map((file, idx) => (
                                <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`New ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(idx)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* Upload Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                            >
                                <Upload size={24} className="mb-1" />
                                <span className="text-xs">Upload</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Format: JPG, PNG, WEBP. Maks 10MB per file.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Deskripsi
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tipe Tender <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.auction_type}
                                onChange={(e) => updateField('auction_type', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="auction">Tender</option>
                                <option value="rent">Sewa</option>
                                <option value="facility_rent">Sewa Fasilitas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Jenis Aset <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.item_type}
                                onChange={(e) => updateField('item_type', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="land">Tanah</option>
                                <option value="building">Bangunan</option>
                                <option value="room">Ruangan</option>
                                <option value="facility">Fasilitas</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Harga Limit (Rp) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.limit_price}
                                onChange={(e) => updateField('limit_price', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Deposit (%)
                            </label>
                            <input
                                type="number"
                                value={formData.deposit_percentage}
                                onChange={(e) => updateField('deposit_percentage', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="10"
                                max="100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tanggal Mulai <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.start_date}
                                onChange={(e) => updateField('start_date', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tanggal Berakhir <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.end_date}
                                onChange={(e) => updateField('end_date', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Lokasi
                        </label>
                        <input
                            type="text"
                            value={formData.location_name}
                            onChange={(e) => updateField('location_name', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Contoh: Kampus Bukit Jimbaran"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            'Simpan'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
