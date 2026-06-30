import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, FileText, Loader2, Search, Building2, Landmark, Maximize2, ImageOff } from 'lucide-react';
import { Modal } from './Modal';
import { RoomCard } from './RoomCard';
import { siauApi, SiauApiError } from '../api/client';
import type { PolygonFeatureProperties, SiauBuildingDetail, SiauLand, SiauRoom } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Polygon feature properties (carries asset_type + siisyana ids). */
  feature: PolygonFeatureProperties | null;
  /** Polygon centroid [lat, lng] — used for the "Menuju" directions link. */
  centroid: [number, number] | null;
  /** Fit the map to this polygon's bounds (the "Lihat" action). */
  onLihat?: () => void;
}

const fmtArea = (n: number | null | undefined) =>
  n == null ? '-' : `${Number(n).toLocaleString('id-ID')} M²`;

export const MapDetailModal: React.FC<Props> = ({ isOpen, onClose, feature, centroid, onLihat }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState<SiauBuildingDetail | null>(null);
  const [land, setLand] = useState<SiauLand | null>(null);
  const [rooms, setRooms] = useState<SiauRoom[]>([]);
  const [roomQuery, setRoomQuery] = useState('');

  const assetType = feature?.asset_type ?? null;
  const siisyanaId =
    assetType === 'bangunan' ? feature?.siisyana_gedung_id
    : assetType === 'tanah' ? feature?.siisyana_tanah_id
    : null;

  useEffect(() => {
    if (!isOpen || !feature) return;
    setBuilding(null);
    setLand(null);
    setRooms([]);
    setRoomQuery('');
    setError(null);

    if (!assetType || !siisyanaId) {
      setError('unlinked');
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (assetType === 'bangunan') {
          const [b, r] = await Promise.all([
            siauApi.buildings.get(siisyanaId),
            siauApi.rooms.list({ id_gedung: siisyanaId, limit: 200 }).catch(() => ({ data: [] })),
          ]);
          if (cancelled) return;
          setBuilding(b.data);
          setRooms(r.data ?? []);
        } else {
          const l = await siauApi.land.get(siisyanaId);
          if (cancelled) return;
          setLand(l.data);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof SiauApiError ? e.detail || e.code : 'Gagal memuat detail.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, feature, assetType, siisyanaId]);

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) ||
        r.kode_ruangan?.toLowerCase().includes(q) ||
        r.jenis_ruangan?.nama?.toLowerCase().includes(q)
    );
  }, [rooms, roomQuery]);

  const thumbnail = building?.gallery?.find((g) => g.url)?.url ?? null;
  const menujuHref = centroid
    ? `https://www.google.com/maps/dir/?api=1&destination=${centroid[0]},${centroid[1]}`
    : null;

  const title = building?.nama ?? feature?.name ?? 'Detail Aset';
  const kib = building?.nomor_kib ?? land?.nomor_kib ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Informasi">
      <div className="p-6 space-y-6">
        {/* Header card */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex gap-4 min-w-0">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-200 flex items-center justify-center">
              {thumbnail ? (
                <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
              ) : assetType === 'tanah' ? (
                <Landmark className="text-slate-400" size={32} />
              ) : (
                <Building2 className="text-slate-400" size={32} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {kib && (
                  <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white font-mono">
                    {kib}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 truncate">{title}</h3>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  {assetType === 'tanah' ? <Landmark size={15} /> : <Building2 size={15} />}
                  {assetType === 'tanah' ? 'Tanah' : 'Bangunan'}
                </span>
                {(land?.lokasi) && (
                  <span className="inline-flex items-center gap-1"><MapPin size={15} />{land.lokasi}</span>
                )}
                {assetType === 'tanah' && (
                  <>
                    <span>Luas: {fmtArea(land?.luas_total)}</span>
                    <span>Tidak terpakai: {fmtArea(land?.luas_tidak_terpakai)}</span>
                  </>
                )}
                {assetType === 'bangunan' && building?.luas_gedung != null && (
                  <span>Luas: {fmtArea(building.luas_gedung)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {onLihat && (
              <button
                onClick={onLihat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <Maximize2 size={16} /> Lihat
              </button>
            )}
            {menujuHref && (
              <a
                href={menujuHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Navigation size={16} /> Menuju
              </a>
            )}
            {building?.file_rincian_gedung && (
              <a
                href={building.file_rincian_gedung}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <FileText size={16} /> Detail
              </a>
            )}
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Memuat detail...
          </div>
        )}

        {error === 'unlinked' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Detail belum tersedia untuk aset ini (belum ditautkan ke data SIISYANA).
          </div>
        )}
        {error && error !== 'unlinked' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Land ownership summary */}
        {!loading && !error && assetType === 'tanah' && land && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Bukti Kepemilikan" value={land.bukti_kepemilikan ?? '-'} />
            <Stat label="Nomor KIB" value={land.nomor_kib ?? '-'} />
            <Stat label="Luas Total" value={fmtArea(land.luas_total)} />
            <Stat label="Luas Tidak Terpakai" value={fmtArea(land.luas_tidak_terpakai)} />
          </div>
        )}

        {/* Building: rooms + gallery */}
        {!loading && !error && assetType === 'bangunan' && building && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daftar Ruangan */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900">Daftar Ruangan</h4>
                <span className="text-xs text-slate-400">{filteredRooms.length} ruangan</span>
              </div>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={roomQuery}
                  onChange={(e) => setRoomQuery(e.target.value)}
                  placeholder="Cari ruangan..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredRooms.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Tidak ada ruangan.</p>
                ) : (
                  filteredRooms.map((r) => <RoomCard key={r.id} room={r} />)
                )}
              </div>
            </div>

            {/* Galeri */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Galeri</h4>
              {building.gallery && building.gallery.some((g) => g.url) ? (
                <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {building.gallery.filter((g) => g.url).map((g, i) => (
                    <a key={i} href={g.url!} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                      <img src={g.url!} alt={g.caption ?? `Foto ${i + 1}`} loading="lazy" className="h-32 w-full object-cover hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm">
                  <ImageOff size={28} className="mb-2" /> Belum ada foto.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-3">
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-0.5 font-semibold text-slate-900 break-words">{value}</p>
  </div>
);
