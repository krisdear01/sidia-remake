import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Gavel, Building2, MapPin, Clock, Filter, Search, ChevronRight,
    Calendar, TrendingUp, Users, ArrowRight, X
} from 'lucide-react';
import { auctionsApi } from '../api/client';

interface AuctionItem {
    id: number;
    title: string;
    description: string;
    item_type: string;
    auction_type: string;
    limit_price: number;
    current_highest_bid: number | null;
    deposit_amount: number;
    start_date: string;
    end_date: string;
    status: string;
    location_name: string;
    images: string[];
    bid_count?: number;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
    land: 'Tanah',
    building: 'Bangunan',
    room: 'Ruangan',
    facility: 'Fasilitas',
    other: 'Lainnya',
};

const AUCTION_TYPE_LABELS: Record<string, string> = {
    auction: 'Tender',
    rent: 'Sewa',
    facility_rent: 'Sewa Fasilitas',
};

const STATUS_COLORS: Record<string, string> = {
    upcoming: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    ended: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
};

export const AuctionListPage: React.FC = () => {
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState<AuctionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterItemType, setFilterItemType] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadAuctions();
    }, [filterType, filterItemType]);

    const loadAuctions = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterType) params.type = filterType;
            if (filterItemType) params.item_type = filterItemType;
            if (searchTerm) params.search = searchTerm;

            const response = await auctionsApi.list(params);
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
        });
    };

    const getTimeRemaining = (endDate: string) => {
        const end = new Date(endDate).getTime();
        const now = Date.now();
        const diff = end - now;

        if (diff <= 0) return 'Berakhir';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} hari ${hours} jam`;
        return `${hours} jam`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-yellow-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            E-Tender & Sewa Aset
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                            Platform tender dan sewa aset Universitas Udayana. Ikuti tender tanah, gedung,
                            dan fasilitas secara transparan dan mudah.
                        </p>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Cari tender atau aset..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-semibold rounded-xl transition-colors shadow-lg"
                                >
                                    Cari
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4 border-l-4 border-yellow-500">
                        <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Gavel className="text-yellow-600" size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tender Aktif</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {auctions.filter(a => a.status === 'active' && a.auction_type === 'auction').length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4 border-l-4 border-blue-800">
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Building2 className="text-blue-800" size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Aset Tersedia</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {auctions.filter(a => a.auction_type === 'rent').length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4 border-l-4 border-blue-600">
                        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Users className="text-blue-700" size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Fasilitas Publik</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {auctions.filter(a => a.auction_type === 'facility_rent').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                            <Filter size={18} />
                            Filter
                        </button>

                        {/* Quick Filter Chips */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterType('')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === ''
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setFilterType('auction')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'auction'
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Tender
                            </button>
                            <button
                                onClick={() => setFilterType('rent')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'rent'
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Sewa
                            </button>
                            <button
                                onClick={() => setFilterType('facility')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'facility'
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Fasilitas
                            </button>
                        </div>
                    </div>

                    <Link
                        to="/lelang/register"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-blue-900 font-semibold rounded-xl shadow-lg transition-all"
                    >
                        Daftar Sebagai Peserta
                        <ArrowRight size={18} />
                    </Link>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Filter Lanjutan</h3>
                            <button onClick={() => setShowFilters(false)}>
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Jenis Aset
                                </label>
                                <select
                                    value={filterItemType}
                                    onChange={(e) => setFilterItemType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="">Semua Jenis</option>
                                    <option value="land">Tanah</option>
                                    <option value="building">Bangunan</option>
                                    <option value="room">Ruangan</option>
                                    <option value="facility">Fasilitas</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auction Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
                    </div>
                ) : auctions.length === 0 ? (
                    <div className="text-center py-20">
                        <Gavel className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            Belum ada tender atau sewa tersedia
                        </h3>
                        <p className="text-gray-400">
                            Silakan cek kembali nanti untuk informasi terbaru.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {auctions.map((auction) => (
                            <Link
                                key={auction.id}
                                to={`/lelang/${auction.id}`}
                                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="aspect-video bg-gradient-to-br from-blue-100 to-yellow-50 relative overflow-hidden">
                                    {auction.images && auction.images.length > 0 ? (
                                        <img
                                            src={`http://localhost:8000/storage/${auction.images[0]}`}
                                            alt={auction.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {auction.item_type === 'land' && <MapPin size={48} className="text-blue-300" />}
                                            {auction.item_type === 'building' && <Building2 size={48} className="text-blue-300" />}
                                            {auction.item_type === 'room' && <Building2 size={48} className="text-blue-300" />}
                                            {auction.item_type === 'facility' && <Users size={48} className="text-blue-300" />}
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[auction.status]}`}>
                                            {auction.status === 'active' ? 'Aktif' :
                                                auction.status === 'upcoming' ? 'Akan Datang' :
                                                    auction.status === 'ended' ? 'Berakhir' : auction.status}
                                        </span>
                                    </div>

                                    {/* Type Badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700">
                                            {AUCTION_TYPE_LABELS[auction.auction_type]}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-900 transition-colors">
                                            {auction.title}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                        <MapPin size={14} />
                                        <span className="truncate">{auction.location_name || 'Universitas Udayana'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                            {ITEM_TYPE_LABELS[auction.item_type]}
                                        </span>
                                    </div>

                                    {/* Price */}
                                    <div className="border-t border-gray-100 pt-4">
                                        {auction.auction_type === 'auction' ? (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    {auction.current_highest_bid ? 'Penawaran Tertinggi' : 'Harga Limit'}
                                                </p>
                                                <p className="text-xl font-bold text-blue-900">
                                                    {formatPrice(auction.current_highest_bid || auction.limit_price)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Harga Sewa</p>
                                                <p className="text-xl font-bold text-yellow-600">
                                                    {formatPrice(auction.limit_price)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Time Remaining */}
                                    {auction.status === 'active' && (
                                        <div className="flex items-center gap-2 mt-3 text-sm">
                                            <Clock size={14} className="text-orange-500" />
                                            <span className="text-orange-600 font-medium">
                                                Sisa: {getTimeRemaining(auction.end_date)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Ingin Ikut Tender atau Sewa Aset?
                    </h2>
                    <p className="text-lg text-blue-200 mb-8">
                        Daftar sekarang dengan KTP dan NPWP untuk mengikuti tender dan sewa aset Universitas Udayana
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/lelang/register"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-yellow-500 text-blue-900 font-semibold rounded-xl hover:bg-yellow-400 transition-colors shadow-lg"
                        >
                            Daftar Sekarang
                            <ChevronRight size={20} />
                        </Link>
                        <Link
                            to="/lelang/login"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
                        >
                            Sudah Punya Akun? Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
