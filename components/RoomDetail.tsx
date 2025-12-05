import React, { useState } from 'react';
import { Room, RoomStatus } from '../types';
import { Package, Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';

interface RoomDetailProps {
  room: Room;
}

export const RoomDetail: React.FC<RoomDetailProps> = ({ room }) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'schedule'>('assets');

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE:
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">Tersedia</span>;
      case RoomStatus.OCCUPIED:
        return <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-800">Digunakan</span>;
      case RoomStatus.MAINTENANCE:
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">Perbaikan</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={18} />
          Daftar Aset
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={18} />
          Jadwal Ruangan
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'assets' ? (
          <div className="space-y-4">
             {room.assets.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white text-gray-400">
                  <Package size={32} className="mb-2 opacity-50" />
                  <p>Tidak ada data aset tercatat.</p>
                </div>
             ) : (
               <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Nama Barang</th>
                      <th className="px-6 py-3 font-semibold">Merk/Tipe</th>
                      <th className="px-6 py-3 font-semibold text-center">Jumlah</th>
                      <th className="px-6 py-3 font-semibold text-right">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {room.assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-medium text-gray-900">{asset.name}</td>
                        <td className="px-6 py-4">{asset.brand}</td>
                        <td className="px-6 py-4 text-center">{asset.quantity}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            asset.condition === 'Baik' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {asset.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                      room.status === RoomStatus.AVAILABLE ? 'bg-emerald-500' : 
                      room.status === RoomStatus.OCCUPIED ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  <span className="font-semibold text-gray-900">Status Saat Ini:</span>
               </div>
               {getStatusBadge(room.status)}
            </div>

            {/* Schedule List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Agenda Hari Ini</h3>
              {room.schedule.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400">
                  <CheckCircle size={24} className="mb-2 text-emerald-500" />
                  <p>Tidak ada jadwal kuliah hari ini.</p>
                </div>
              ) : (
                room.schedule.map((item) => (
                  <div key={item.id} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-500"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Clock size={16} />
                          <span className="font-bold text-sm">{item.startTime} - {item.endTime}</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">{item.subject}</h4>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          <User size={14} />
                          <span>{item.department}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                         <span className="text-xs font-mono text-gray-400 border border-gray-200 rounded px-2 py-1">ID: {item.id}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
