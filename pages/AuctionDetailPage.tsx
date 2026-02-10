import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    MapPin, Clock, Calendar, Shield, AlertCircle, CheckCircle,
    Building2, Gavel, Users, FileText, ChevronLeft, ChevronRight,
    Share2, Heart, Eye, Download, Info
} from 'lucide-react';
import { auctionsApi, isAuthenticated, isBidderAuthenticated } from '../api/client';

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
    organizer?: string;
    seller?: string;
}

const STATUS_COLORS: Record<string, string> = {
    upcoming: 'bg-blue-100 text-blue-800',
    active: 'bg-emerald-100 text-emerald-800',
    ended: 'bg-slate-100 text-slate-800',
    cancelled: 'bg-rose-100 text-rose-800',
};

const AUCTION_TYPE_LABELS: Record<string, string> = {
    auction: 'Lelang',
    rent: 'Sewa',
    facility_rent: 'Sewa Fasilitas',
};

export const AuctionDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [auction, setAuction] = useState<AuctionItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('description');
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (id) {
            loadAuctionDetail(parseInt(id));
        }
    }, [id]);

    const loadAuctionDetail = async (auctionId: number) => {
        try {
            const response = await auctionsApi.get(auctionId);
            // API returns { auction: ..., stats: ... }
            setAuction(response.auction || response.data || response);
            // Also fetch bids if needed, but keeping it simple for now
        } catch (error) {
            console.error('Failed to load auction details:', error);
        } finally {
            setLoading(false);
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
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeRemaining = (endDate: string) => {
        const end = new Date(endDate).getTime();
        const now = Date.now();
        const diff = end - now;

        if (diff <= 0) return { text: 'Berakhir', urgent: false };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return { text: `${days} hari ${hours} jam lagi`, urgent: days < 3 };
        return { text: `${hours} jam ${minutes} menit lagi`, urgent: true };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
                    <p className="text-slate-500 font-medium">Memuat detail lelang...</p>
                </div>
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Lelang Tidak Ditemukan</h2>
                    <p className="text-slate-600 mb-6">Maaf, lelang yang Anda cari tidak dapat ditemukan atau telah dihapus.</p>
                    <Link
                        to="/lelang"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-xl font-medium hover:bg-blue-800 transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Kembali ke Daftar Lelang
                    </Link>
                </div>
            </div>
        );
    }

    const timeRemaining = getTimeRemaining(auction.end_date);
    const hasImages = auction.images && auction.images.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Sticky Header */}
            <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <Link to="/lelang" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 transition-colors font-medium">
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Kembali</span>
                    </Link>
                    <div className={`text-lg font-bold text-slate-900 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
                        {auction.title}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                            <Share2 size={20} />
                        </button>
                        <button className="p-2 rounded-full hover:bg-rose-50 text-slate-600 hover:text-rose-500 transition-colors">
                            <Heart size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 overflow-x-auto whitespace-nowrap pb-2">
                    <Link to="/" className="hover:text-blue-900">Beranda</Link>
                    <span>/</span>
                    <Link to="/lelang" className="hover:text-blue-900">Lelang</Link>
                    <span>/</span>
                    <span className="text-slate-900 font-medium truncate max-w-[200px]">{auction.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Gallery */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Main Image */}
                        <div className="relative aspect-video bg-slate-200 rounded-3xl overflow-hidden shadow-lg group">
                            {hasImages ? (
                                <img
                                    src={`http://localhost:8000/storage/${auction.images[activeImageIndex]}`}
                                    alt={auction.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                    {auction.item_type === 'land' ? <MapPin size={64} /> :
                                        auction.item_type === 'facility' ? <Users size={64} /> :
                                            <Building2 size={64} />}
                                    <span className="mt-2 font-medium">No Image Available</span>
                                </div>
                            )}

                            {/* Overlay Badges */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${STATUS_COLORS[auction.status]}`}>
                                    {auction.status === 'active' ? 'Sedang Berlangsung' :
                                        auction.status === 'upcoming' ? 'Akan Datang' :
                                            auction.status === 'ended' ? 'Berakhir' : auction.status}
                                </span>
                                <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                                    {AUCTION_TYPE_LABELS[auction.auction_type]}
                                </span>
                            </div>

                            {/* Image Navigation */}
                            {hasImages && auction.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setActiveImageIndex(prev => (prev === 0 ? auction.images.length - 1 : prev - 1))}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={() => setActiveImageIndex(prev => (prev === auction.images.length - 1 ? 0 : prev + 1))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {hasImages && auction.images.length > 1 && (
                            <div className="grid grid-cols-5 gap-3">
                                {auction.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`aspect-video rounded-xl overflow-hidden border-2 transition-all ${idx === activeImageIndex ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-transparent opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <img
                                            src={`http://localhost:8000/storage/${img}`}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Description Tabs */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                            <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
                                {[
                                    { id: 'description', label: 'Uraian' },
                                    { id: 'attachments', label: 'Lampiran' },
                                    { id: 'seller', label: 'Info Penjual' },
                                    { id: 'organizer', label: 'Penyelenggara' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                            ? 'border-blue-600 text-blue-900 bg-blue-50/50'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="p-6">
                                {activeTab === 'description' && (
                                    <div className="prose prose-slate max-w-none">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Deskripsi Barang</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6">
                                            <div>
                                                <p className="text-slate-500 mb-1">Jenis Barang</p>
                                                <p className="font-semibold text-slate-900 capitalize">{auction.item_type}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 mb-1">Lokasi</p>
                                                <p className="font-semibold text-slate-900">{auction.location_name}</p>
                                            </div>
                                        </div>
                                        <hr className="my-6 border-slate-100" />
                                        <h4 className="font-bold text-slate-900 mb-2">Uraian Lengkap</h4>
                                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                                            {auction.description || 'Tidak ada deskripsi lengkap.'}
                                        </p>
                                    </div>
                                )}
                                {activeTab === 'attachments' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-red-500">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Dokumen Syarat & Ketentuan</p>
                                                    <p className="text-xs text-slate-500">PDF • 2.4 MB</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'seller' && (
                                    <div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                                                UD
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">Universitas Udayana</h3>
                                                <p className="text-slate-500">Penjual Terverifikasi</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="p-4 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 mb-1">Alamat</p>
                                                <p className="font-medium text-slate-900">Jl. Raya Kampus Unud, Jimbaran</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl">
                                                <p className="text-slate-500 mb-1">Kontak</p>
                                                <p className="font-medium text-slate-900">(0361) 701954</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'organizer' && (
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-4">KPKNL Denpasar</h3>
                                        <p className="text-slate-600 text-sm mb-4">
                                            Kantor Pelayanan Kekayaan Negara dan Lelang (KPKNL) adalah instansi vertikal Direktorat Jenderal Kekayaan Negara (DJKN) yang berada di bawah dan bertanggung jawab langsung kepada Kepala Kantor Wilayah DJKN.
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium cursor-pointer hover:underline">
                                            <span>Lihat Profil Penyelenggara</span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Info & Action */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-6">
                            {/* Main Info Card */}
                            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                                <span className="text-sm font-semibold text-slate-500 tracking-wider uppercase">
                                    {auction.auction_type === 'rent' ? 'Harga Sewa' : 'Nilai Limit'}
                                </span>
                                <div className="flex items-baseline gap-1 mt-1 mb-4">
                                    <span className="text-sm font-bold text-slate-900 self-start mt-1">Rp</span>
                                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                        {new Intl.NumberFormat('id-ID').format(auction.auction_type === 'rent' ? auction.limit_price : (auction.current_highest_bid || auction.limit_price))}
                                    </h1>
                                </div>

                                {auction.status === 'active' && (
                                    <div className={`flex items-center gap-3 p-3 rounded-xl mb-6 ${timeRemaining.urgent ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'}`}>
                                        <Clock size={20} className={timeRemaining.urgent ? 'animate-pulse' : ''} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase opacity-80">Sisa Waktu</span>
                                            <span className="font-bold">{timeRemaining.text}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-500">Uang Jaminan</span>
                                        <span className="font-bold text-slate-900">{formatPrice(auction.deposit_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-500">Cara Penawaran</span>
                                        <span className="font-bold text-slate-900">Open Bidding</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-500">Batas Akhir Jaminan</span>
                                        <span className="font-bold text-slate-900 text-right">{formatDate(auction.end_date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <span className="text-slate-500">Batas Akhir Penawaran</span>
                                        <span className="font-bold text-slate-900 text-right">{formatDate(auction.end_date)}</span>
                                    </div>
                                </div>

                                {auction.status === 'active' ? (
                                    <div className="space-y-3">
                                        {isBidderAuthenticated() ? (
                                            <button
                                                onClick={() => {
                                                    // Handle bid or deposit logic here
                                                    // For now, maybe just show a modal or alert
                                                    alert("Fitur penawaran akan segera hadir!");
                                                }}
                                                className="w-full py-4 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95"
                                            >
                                                Ajukan Penawaran
                                            </button>
                                        ) : (
                                            <Link
                                                to="/lelang/login"
                                                className="w-full py-4 flex items-center justify-center bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg transition-all"
                                            >
                                                Login untuk Menawar
                                            </Link>
                                        )}
                                        <p className="text-xs text-center text-slate-500 px-4">
                                            Dengan menawar, Anda menyetujui <a href="#" className="text-blue-600 hover:underline">Syarat & Ketentuan</a> yang berlaku.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-xl text-center cursor-not-allowed">
                                        Lelang Berakhir
                                    </div>
                                )}
                            </div>

                            {/* Trust Badges */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                                    <Shield className="text-emerald-500" size={24} />
                                    <p className="text-xs font-medium text-slate-700">Jaminan Aman</p>
                                    <p className="text-[10px] text-slate-400">Pembayaran melalui VA resmi</p>
                                </div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                                    <CheckCircle className="text-blue-500" size={24} />
                                    <p className="text-xs font-medium text-slate-700">Verifikasi Aset</p>
                                    <p className="text-[10px] text-slate-400">Aset telah disurvei tim</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
