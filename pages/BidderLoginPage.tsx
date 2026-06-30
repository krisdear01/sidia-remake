import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { bidderAuthApi } from '../api/client';

export const BidderLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email dan password wajib diisi');
            return;
        }

        setLoading(true);
        try {
            await bidderAuthApi.login(email, password);
            navigate('/lelang/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login gagal. Periksa email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Back Link */}
                <Link
                    to="/lelang"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft size={20} />
                    Kembali ke Daftar Tender
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 text-center">
                        <h1 className="text-2xl font-bold mb-2">Login Peserta</h1>
                        <p className="text-blue-200">
                            Masuk untuk mengikuti tender dan sewa aset
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="h-4 w-4 text-yellow-500 rounded border-gray-300" />
                                <span className="text-sm text-gray-600">Ingat saya</span>
                            </label>
                            <a href="#" className="text-sm text-blue-900 hover:underline">
                                Lupa password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Masuk...
                                </>
                            ) : (
                                'Masuk'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 pb-8 text-center">
                        <p className="text-gray-600">
                            Belum punya akun?{' '}
                            <Link to="/lelang/register" className="text-blue-900 hover:underline font-medium">
                                Daftar sekarang
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-white/50 rounded-xl">
                    <p className="text-sm text-gray-500 text-center">
                        Login ini khusus untuk peserta tender. Admin silahkan login melalui{' '}
                        <Link to="/admin/login" className="text-blue-900 hover:underline">
                            halaman admin
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
