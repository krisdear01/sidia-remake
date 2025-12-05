
import React, { useState } from 'react';
import { Layers, Maximize2, Info } from 'lucide-react';

export const AssetMap: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState('all');

  // Legend data configuration
  const legends = [
    { id: 'teknik', label: 'Fakultas Teknik', color: 'bg-purple-500', borderColor: 'border-purple-500' },
    { id: 'ekonomi', label: 'Fakultas Ekonomi', color: 'bg-blue-500', borderColor: 'border-blue-500' },
    { id: 'sastra', label: 'Fakultas Ilmu Budaya', color: 'bg-orange-500', borderColor: 'border-orange-500' },
    { id: 'kedokteran', label: 'Fakultas Kedokteran', color: 'bg-emerald-500', borderColor: 'border-emerald-500' },
    { id: 'rektorat', label: 'Gedung Rektorat', color: 'bg-slate-800', borderColor: 'border-slate-800' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lokasi Tanah Udayana</h2>
          <p className="text-sm text-slate-500">
            Luas Tanah Keseluruhan : <span className="font-mono font-medium text-slate-900">1.643.867 M²</span>
          </p>
        </div>
      </div>

      <div className="relative h-[500px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm group">
        {/* Map Placeholder / Iframe */}
        <div className="absolute inset-0 z-0 opacity-80 mix-blend-multiply">
             <iframe 
                width="100%" 
                height="100%" 
                src="https://www.openstreetmap.org/export/embed.html?bbox=115.1585%2C-8.8050%2C115.1885%2C-8.7850&amp;layer=mapnik" 
                style={{border: 0}}
                title="University Map"
             ></iframe>
        </div>
        
        {/* Overlay Controls */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
            <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button className="border-b border-slate-100 p-2 hover:bg-slate-50" title="Zoom In">+</button>
                <button className="p-2 hover:bg-slate-50" title="Zoom Out">-</button>
            </div>
             <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <Layers size={20} className="text-slate-600" />
            </div>
        </div>

        {/* Legend Box */}
        <div className="absolute bottom-4 right-4 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Legenda Wilayah</h4>
            <div className="space-y-2">
                {legends.map((legend) => (
                    <div key={legend.id} className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${legend.color}`}></div>
                        <span className="text-xs font-medium text-slate-700">{legend.label}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Dummy SVG Overlay for Visual Effect of Zoning */}
        <svg className="absolute inset-0 pointer-events-none z-0 opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
             {/* Simple polygons to represent zones on top of the map */}
             <path d="M40,30 L60,30 L60,50 L40,50 Z" fill="#a855f7" className="animate-pulse" /> {/* Purple Zone */}
             <path d="M65,35 L85,35 L85,55 L65,55 Z" fill="#3b82f6" /> {/* Blue Zone */}
             <path d="M20,40 L35,40 L35,60 L20,60 Z" fill="#f97316" /> {/* Orange Zone */}
        </svg>

        {/* Hover Info */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm">
                Interactive Map View
            </div>
        </div>
      </div>
    </div>
  );
};
