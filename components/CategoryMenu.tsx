
import React from 'react';
import { Map, Building2, Microscope, Users, BookOpen, Gavel, MoreHorizontal } from 'lucide-react';

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

export const CategoryMenu: React.FC = () => {
  const categories: CategoryItem[] = [
    { id: 'tanah', label: 'Tanah', icon: <Map size={32} />, isActive: true },
    { id: 'gedung', label: 'Gedung', icon: <Building2 size={32} /> },
    { id: 'lab', label: 'Laboratorium', icon: <Microscope size={32} /> },
    { id: 'rapat', label: 'Ruang Rapat', icon: <Users size={32} /> },
    { id: 'perpus', label: 'Perpustakaan', icon: <BookOpen size={32} /> },
    { id: 'lelang', label: 'E-Lelang/Sewa', icon: <Gavel size={32} /> },
    { id: 'lainnya', label: 'Lainnya', icon: <MoreHorizontal size={32} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-8">
      {categories.map((item) => (
        <button
          key={item.id}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl p-6 transition-all duration-300 ${
            item.isActive
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
              : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:shadow-md hover:-translate-y-1'
          }`}
        >
          <div className={item.isActive ? 'text-white' : 'text-slate-800'}>
            {item.icon}
          </div>
          <span className="text-sm font-semibold">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
