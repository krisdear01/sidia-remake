import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Mail, Lock, CreditCard, FileText, Upload, Eye, EyeOff,
    CheckCircle2, AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { bidderAuthApi } from '../api/client';

export const BidderRegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        nik: '',
        npwp: '',
        address: '',
        ktp_file: null as File | null,
        npwp_file: null as File | null,
        agree_terms: false,
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleFileChange = (field: 'ktp_file' | 'npwp_file', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Ukuran file maksimal 5MB');
                return;
            }
            // Validate file type
            if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                setError('Format file harus PDF, JPG, atau PNG');
                return;
            }
            updateField(field, file);
        }
    };

    const validateStep1 = () => {
        if (!formData.name.trim()) return 'Nama lengkap wajib diisi';
        if (!formData.email.trim()) return 'Email wajib diisi';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Format email tidak valid';
        if (!formData.password) return 'Password wajib diisi';
        if (formData.password.length < 8) return 'Password minimal 8 karakter';
        if (formData.password !== formData.password_confirmation) return 'Konfirmasi password tidak cocok';
        return null;
    };

    const validateStep2 = () => {
        if (!formData.nik.trim()) return 'NIK wajib diisi';
        if (formData.nik.length !== 16) return 'NIK harus 16 digit';
        if (!/^\d+$/.test(formData.nik)) return 'NIK hanya boleh berisi angka';
        if (!formData.ktp_file) return 'File KTP wajib diunggah';
        return null;
    };

    const handleNext = () => {
        const error = step === 1 ? validateStep1() : validateStep2();
        if (error) {
            setError(error);
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.agree_terms) {
            setError('Anda harus menyetujui syarat dan ketentuan');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('password_confirmation', formData.password_confirmation);
            data.append('nik', formData.nik);
            if (formData.npwp) data.append('npwp', formData.npwp);
            if (formData.address) data.append('address', formData.address);
            if (formData.ktp_file) data.append('ktp_file', formData.ktp_file);
            if (formData.npwp_file) data.append('npwp_file', formData.npwp_file);

            await bidderAuthApi.register(data);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Registrasi gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Registrasi Berhasil!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Silakan cek email Anda untuk verifikasi. Setelah email diverifikasi,
                        admin akan memvalidasi dokumen Anda dalam 1-3 hari kerja.
                    </p>
                    <div className="space-y-3">
                        <Link
                            to="/lelang/login"
                            className="block w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
                        >
                            Login ke Akun
                        </Link>
                        <Link
                            to="/lelang"
                            className="block w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Kembali ke Daftar Lelang
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Back Link */}
                <Link
                    to="/lelang"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft size={20} />
                    Kembali ke Daftar Lelang
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8">
                        <h1 className="text-2xl font-bold mb-2">Daftar Peserta Lelang</h1>
                        <p className="text-blue-200">
                            Lengkapi data berikut untuk mendaftar sebagai peserta lelang dan sewa aset
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex border-b border-gray-200">
                        {[
                            { num: 1, label: 'Data Akun' },
                            { num: 2, label: 'Identitas' },
                            { num: 3, label: 'Konfirmasi' },
                        ].map((s) => (
                            <div
                                key={s.num}
                                className={`flex-1 py-4 text-center border-b-2 transition-colors ${step === s.num
                                    ? 'border-yellow-500 text-blue-900 font-semibold'
                                    : step > s.num
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-400'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${step === s.num
                                        ? 'bg-yellow-500 text-blue-900'
                                        : step > s.num
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step > s.num ? '✓' : s.num}
                                    </span>
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Step 1: Account Data */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Lengkap <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            placeholder="Sesuai KTP"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            placeholder="contoh@email.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => updateField('password', e.target.value)}
                                            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Minimal 8 karakter"
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Konfirmasi Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password_confirmation}
                                            onChange={(e) => updateField('password_confirmation', e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            placeholder="Ulangi password"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Identity */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        NIK (Nomor Induk Kependudukan) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            value={formData.nik}
                                            onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            placeholder="16 digit NIK"
                                            maxLength={16}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{formData.nik.length}/16 digit</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        NPWP (Opsional)
                                    </label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            value={formData.npwp}
                                            onChange={(e) => updateField('npwp', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            placeholder="15-16 digit NPWP"
                                            maxLength={16}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Alamat
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => updateField('address', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        placeholder="Alamat sesuai KTP"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload KTP <span className="text-red-500">*</span>
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileChange('ktp_file', e)}
                                            className="hidden"
                                            id="ktp-upload"
                                        />
                                        <label htmlFor="ktp-upload" className="cursor-pointer">
                                            {formData.ktp_file ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <CheckCircle2 className="text-green-500" size={24} />
                                                    <span className="text-green-700 font-medium">{formData.ktp_file.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                                    <p className="text-gray-600 font-medium">Klik untuk upload KTP</p>
                                                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload NPWP (Opsional)
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileChange('npwp_file', e)}
                                            className="hidden"
                                            id="npwp-upload"
                                        />
                                        <label htmlFor="npwp-upload" className="cursor-pointer">
                                            {formData.npwp_file ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <CheckCircle2 className="text-green-500" size={24} />
                                                    <span className="text-green-700 font-medium">{formData.npwp_file.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                                    <p className="text-gray-600 font-medium">Klik untuk upload NPWP</p>
                                                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirmation */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Ringkasan Data</h3>
                                    <dl className="space-y-3">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Nama</dt>
                                            <dd className="font-medium text-gray-900">{formData.name}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Email</dt>
                                            <dd className="font-medium text-gray-900">{formData.email}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">NIK</dt>
                                            <dd className="font-medium text-gray-900 font-mono">{formData.nik}</dd>
                                        </div>
                                        {formData.npwp && (
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">NPWP</dt>
                                                <dd className="font-medium text-gray-900 font-mono">{formData.npwp}</dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">File KTP</dt>
                                            <dd className="font-medium text-green-600">{formData.ktp_file?.name}</dd>
                                        </div>
                                        {formData.npwp_file && (
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">File NPWP</dt>
                                                <dd className="font-medium text-green-600">{formData.npwp_file.name}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-900">
                                    <h3 className="font-semibold text-blue-900 mb-2">Informasi Penting</h3>
                                    <ul className="text-sm text-blue-800 space-y-2">
                                        <li>• Setelah mendaftar, Anda akan menerima email verifikasi</li>
                                        <li>• Dokumen KTP/NPWP akan diverifikasi oleh admin dalam 1-3 hari kerja</li>
                                        <li>• Setelah verifikasi selesai, Anda dapat mengikuti lelang dan sewa aset</li>
                                    </ul>
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="agree-terms"
                                        checked={formData.agree_terms}
                                        onChange={(e) => updateField('agree_terms', e.target.checked)}
                                        className="mt-1 h-5 w-5 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500"
                                    />
                                    <label htmlFor="agree-terms" className="text-sm text-gray-600">
                                        Saya menyetujui{' '}
                                        <a href="#" className="text-blue-900 hover:underline">syarat dan ketentuan</a>
                                        {' '}serta{' '}
                                        <a href="#" className="text-blue-900 hover:underline">kebijakan privasi</a>
                                        {' '}yang berlaku.
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep(step - 1)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Kembali
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
                                >
                                    Lanjut
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-semibold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Mendaftar...
                                        </>
                                    ) : (
                                        'Daftar Sekarang'
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Login Link */}
                <p className="text-center text-gray-600 mt-6">
                    Sudah punya akun?{' '}
                    <Link to="/lelang/login" className="text-blue-900 hover:underline font-medium">
                        Login di sini
                    </Link>
                </p>
            </div>
        </div>
    );
};
