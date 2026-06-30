
import React from 'react';
import { Link } from 'react-router-dom';
import { Map, Building2, Microscope, Users, BookOpen, Gavel, MoreHorizontal } from 'lucide-react';

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  href?: string;
}

export const CategoryMenu: React.FC = () => {
  const categories: CategoryItem[] = [
    { id: 'tanah', label: 'Tanah', icon: <Map size={32} />, isActive: true },
    { id: 'gedung', label: 'Gedung', icon: <Building2 size={32} />, href: '/gedung' },
    { id: 'lab', label: 'Laboratorium', icon: <Microscope size={32} />, href: '/laboratorium' },
    { id: 'rapat', label: 'Ruang Rapat', icon: <Users size={32} />, href: '/ruang-rapat' },
    { id: 'perpus', label: 'Perpustakaan', icon: <BookOpen size={32} />, href: '/perpustakaan' },
    { id: 'lelang', label: 'E-Tender/Sewa', icon: <Gavel size={32} />, href: '/lelang' },
    { id: 'lainnya', label: 'Lainnya', icon: <MoreHorizontal size={32} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-8">
      {categories.map((item) => {
        const className = `flex flex-col items-center justify-center gap-3 rounded-xl p-6 transition-all duration-300 ${item.isActive
          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
          : item.href
            ? 'bg-gradient-to-br from-blue-900 to-blue-800 text-white shadow-lg shadow-blue-900/30 hover:shadow-xl hover:-translate-y-1 border-b-4 border-yellow-500'
            : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:shadow-md hover:-translate-y-1'
          }`;

        if (item.href) {
          return (
            <Link
              key={item.id}
              to={item.href}
              className={className}
            >
              <div className="text-white">
                {item.icon}
              </div>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            className={className}
          >
            <div className={item.isActive ? 'text-white' : 'text-slate-800'}>
              {item.icon}
            </div>
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
