import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginatorProps {
    pageIndex: number;        // 0-based current page
    totalPages: number;
    totalItems: number;
    pageSize: number;
    isLoading?: boolean;
    onJump: (newPageIndex: number) => void;
    label?: string;           // e.g. "ruangan", "gedung" — defaults to "item"
}

/**
 * Numeric paginator: ‹ 1 2 … 14 [15] 16 … 268 ›
 * with first/last always visible and ellipsed neighbours.
 * Used by AssetsPage, BuildingsPage, RoomsPage.
 */
export const Paginator: React.FC<PaginatorProps> = ({
    pageIndex, totalPages, totalItems, pageSize, isLoading = false, onJump, label = 'item',
}) => {
    const from = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
    const to = Math.min(totalItems, (pageIndex + 1) * pageSize);
    const pages = useMemo(() => buildPageList(pageIndex + 1, totalPages), [pageIndex, totalPages]);

    return (
        <div className="border-t border-slate-100 p-4 flex items-center justify-between gap-3 flex-wrap text-sm">
            <div className="text-slate-500 text-xs">
                Menampilkan <span className="font-semibold text-slate-900">{from}</span>–
                <span className="font-semibold text-slate-900">{to}</span> dari{' '}
                <span className="font-semibold text-slate-900">{totalItems}</span> {label}
                {isLoading && <span className="ml-2 text-slate-400">(masih memuat...)</span>}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onJump(pageIndex - 1)}
                    disabled={pageIndex === 0}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white w-8 h-8 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Halaman sebelumnya"
                >
                    <ChevronLeft size={16} />
                </button>

                {pages.map((p, i) => (
                    p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onJump(p - 1)}
                            className={`inline-flex items-center justify-center rounded-md w-8 h-8 text-xs font-semibold transition-colors ${
                                p === pageIndex + 1
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                            aria-current={p === pageIndex + 1 ? 'page' : undefined}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onJump(pageIndex + 1)}
                    disabled={pageIndex >= totalPages - 1}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white w-8 h-8 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Halaman berikutnya"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

/**
 * [1, 2, 3, 4, 5]    when small
 * [1, '…', 14, 15, 16, '…', 268]   when large
 */
function buildPageList(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: (number | '…')[] = [];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    out.push(1);
    if (left > 2) out.push('…');
    for (let i = left; i <= right; i++) out.push(i);
    if (right < total - 1) out.push('…');
    out.push(total);
    return out;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
