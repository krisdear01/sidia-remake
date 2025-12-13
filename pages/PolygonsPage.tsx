import React from 'react';
import { Map, RefreshCw } from 'lucide-react';

export const PolygonsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Peta & Polygon</h1>
                <p className="text-slate-500">Kelola data polygon wilayah universitas</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                    <Map className="text-blue-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Manajemen Polygon Map</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                    Fitur ini memungkinkan Anda mengelola data polygon GeoJSON untuk ditampilkan di peta interaktif.
                    Polygon dapat dihubungkan dengan gedung, fakultas, atau lokasi tertentu.
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
                    <RefreshCw size={18} />
                    Muat Data Polygon
                </button>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
                    <h4 className="font-bold mb-1">Fakultas Teknik</h4>
                    <p className="text-purple-100 text-sm">50.000 m² luas area</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white">
                    <h4 className="font-bold mb-1">FEB</h4>
                    <p className="text-blue-100 text-sm">35.000 m² luas area</p>
                </div>
                <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
                    <h4 className="font-bold mb-1">Rektorat</h4>
                    <p className="text-slate-300 text-sm">25.000 m² luas area</p>
                </div>
            </div>
        </div>
    );
};
