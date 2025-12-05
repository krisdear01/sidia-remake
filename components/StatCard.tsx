import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  label: string;
  colorClass: string; // e.g., 'text-emerald-500'
  bgClass: string; // e.g., 'bg-emerald-500/10'
  borderColorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, label, colorClass, bgClass, borderColorClass }) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border ${borderColorClass} bg-white p-6 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${bgClass} opacity-10 blur-xl`}></div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <h3 className={`text-5xl font-bold ${colorClass} mb-2`}>{value}</h3>
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{title}</p>
      </div>
    </div>
  );
};