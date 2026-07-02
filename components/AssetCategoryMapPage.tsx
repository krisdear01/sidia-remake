import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { Building2, Layers, ArrowLeft, Search, Maximize2, RefreshCw, AlertCircle } from 'lucide-react';
import { siauApi, SiauApiError } from '../api/client';
import { MapDetailModal } from './MapDetailModal';
import { SiauRoomModal } from './SiauRoomModal';
import type { GedungPolygonProperties, PolygonFeatureProperties, SiauRoom } from '../types';

const JIMBARAN_CENTER: [number, number] = [-8.7965, 115.1725];
// Main Bukit Jimbaran campus bounding box — frames the default map view
// (buildings on other campuses are outliers that would otherwise zoom the map out).
const JIMBARAN_BBOX = { latMin: -8.81, latMax: -8.78, lngMin: 115.16, lngMax: 115.19 };

interface GedungFeature {
  type: 'Feature';
  geometry: any;
  properties: GedungPolygonProperties;
}

type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface Props {
  /** Page title in the header (e.g. "Laboratorium"). */
  title: string;
  /** Sub-line under the title. */
  subtitle: string;
  /** Header icon component (lucide-react). */
  icon?: IconType;
  /** Optional room-category filter applied to the Detail modal's room list.
   *  Omit for /gedung (shows all rooms). */
  roomFilter?: (room: SiauRoom) => boolean;
}

/**
 * Shared interactive building-map page. The map (SIISYANA gedung-polygons) is
 * identical across /gedung and the academic category pages; category pages pass
 * a `roomFilter` so the Detail modal only lists rooms of that category.
 */
export const AssetCategoryMapPage: React.FC<Props> = ({ title, subtitle, icon: Icon = Building2, roomFilter }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerByIdRef = useRef<Map<number, L.Path>>(new Map());
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  const [features, setFeatures] = useState<GedungFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SiauApiError | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Detail modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState<PolygonFeatureProperties | null>(null);
  const [modalCentroid, setModalCentroid] = useState<[number, number] | null>(null);

  // Category mode (/lab, /perpus, /ruang-rapat): the sidebar lists this category's
  // rooms instead of buildings. The map still shows gedung polygons.
  const categoryMode = !!roomFilter;
  const [rooms, setRooms] = useState<SiauRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(categoryMode);
  const [scheduleRoom, setScheduleRoom] = useState<SiauRoom | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await siauApi.gedungPolygons();
      setFeatures(res.data?.features ?? []);
    } catch (e) {
      setError(e instanceof SiauApiError ? e : new SiauApiError('UNKNOWN', 0, 'Gagal memuat peta gedung.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Category mode: bulk-load rooms (gateway-cached) once, then keep this
  // category's rooms for the sidebar list.
  useEffect(() => {
    if (!roomFilter) return;
    let cancelled = false;
    setRoomsLoading(true);
    (async () => {
      const acc: SiauRoom[] = [];
      let cursor: number | null = null;
      try {
        for (let i = 0; i < 100; i++) {
          const params: { limit: number; cursor?: number } = { limit: 200 };
          if (cursor !== null) params.cursor = cursor;
          const res = await siauApi.rooms.list(params);
          if (cancelled) return;
          acc.push(...(res.data ?? []));
          const next = res.meta?.pagination?.next_cursor ?? null;
          if (next === null) break;
          cursor = next;
        }
        if (!cancelled) setRooms(acc.filter(roomFilter));
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomFilter]);

  const openDetail = useCallback((props: GedungPolygonProperties) => {
    setSelectedId(props.siisyana_gedung_id);
    setModalCentroid(props.center ?? null);
    setModalFeature({
      asset_type: 'bangunan',
      siisyana_gedung_id: props.siisyana_gedung_id,
      siisyana_tanah_id: null,
      name: props.nama ?? props.kode ?? 'Gedung',
    } as PolygonFeatureProperties);
    setModalOpen(true);
  }, []);

  // ---- map init (once) ----
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: JIMBARAN_CENTER, zoom: 15, zoomControl: false });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
    const google = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google', maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });
    L.control.layers({ osm, google }, {}, { position: 'topleft', collapsed: false }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ---- render polygons when data ready ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || features.length === 0) return;

    if (geoLayerRef.current) map.removeLayer(geoLayerRef.current);
    layerByIdRef.current.clear();

    const jimbaranBounds = L.latLngBounds([]);
    const layer = L.geoJSON({ type: 'FeatureCollection', features } as any, {
      style: () => ({ color: '#1d4ed8', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.35 }),
      onEachFeature: (feature, lyr) => {
        const props = feature.properties as GedungPolygonProperties;
        const id = props.siisyana_gedung_id;
        layerByIdRef.current.set(id, lyr as L.Path);
        const c = props.center;
        if (c && c[0] > JIMBARAN_BBOX.latMin && c[0] < JIMBARAN_BBOX.latMax && c[1] > JIMBARAN_BBOX.lngMin && c[1] < JIMBARAN_BBOX.lngMax) {
          jimbaranBounds.extend((lyr as any).getBounds());
        }
        lyr.on({
          mouseover: () => setHoveredId(id),
          mouseout: () => { setHoveredId(null); (lyr as any).closeTooltip(); },
          click: () => {
            map.fitBounds((lyr as any).getBounds(), { padding: [40, 40], maxZoom: 18 });
            openDetail(props);
          },
        });
        lyr.bindTooltip(props.nama ?? props.kode ?? '', { direction: 'top', sticky: true, className: 'gedung-tooltip' });
      },
    }).addTo(map);

    geoLayerRef.current = layer;
    try {
      const target = jimbaranBounds.isValid() ? jimbaranBounds : layer.getBounds();
      map.fitBounds(target, { padding: [30, 30], maxZoom: 17 });
    } catch { /* empty */ }
  }, [features, openDetail]);

  // ---- restyle on hover / selection (no bringToFront — see MapDetailModal notes) ----
  useEffect(() => {
    layerByIdRef.current.forEach((lyr, id) => {
      const active = id === hoveredId || id === selectedId;
      lyr.setStyle({
        color: active ? '#1e3a8a' : '#1d4ed8',
        weight: active ? 3 : 1.5,
        fillColor: active ? '#2563eb' : '#3b82f6',
        fillOpacity: active ? 0.7 : 0.35,
      });
    });
  }, [hoveredId, selectedId]);

  const focusOnMap = useCallback((props: GedungPolygonProperties) => {
    const map = mapRef.current;
    const lyr = layerByIdRef.current.get(props.siisyana_gedung_id);
    if (map && lyr) map.fitBounds((lyr as any).getBounds(), { padding: [40, 40], maxZoom: 18 });
    else if (map && props.center) map.setView(props.center, 18);
  }, []);

  const handleLihat = useCallback(() => {
    if (modalFeature) {
      const lyr = layerByIdRef.current.get(modalFeature.siisyana_gedung_id as number);
      if (mapRef.current && lyr) mapRef.current.fitBounds((lyr as any).getBounds(), { padding: [40, 40], maxZoom: 18 });
    }
    setModalOpen(false);
  }, [modalFeature]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = features.map((f) => f.properties);
    if (!q) return list;
    return list.filter((p) => (p.nama ?? '').toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q));
  }, [features, searchTerm]);

  // Category-mode: sidebar list = this category's rooms, filtered by search.
  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      (r.nama ?? '').toLowerCase().includes(q) ||
      (r.kode_ruangan ?? '').toLowerCase().includes(q) ||
      (r.gedung?.nama ?? '').toLowerCase().includes(q)
    );
  }, [rooms, searchTerm]);

  // Focus (and highlight) a room's building on the map, then open its detail.
  const openRoom = useCallback((room: SiauRoom) => {
    const gid = room.gedung?.id != null ? Number(room.gedung.id) : null;
    if (gid != null) {
      setSelectedId(gid);
      const lyr = layerByIdRef.current.get(gid);
      if (mapRef.current && lyr) mapRef.current.fitBounds((lyr as any).getBounds(), { padding: [40, 40], maxZoom: 18 });
    }
    setScheduleRoom(room);
  }, []);

  const stats = useMemo(() => ({
    total: features.length,
    totalArea: features.reduce((acc, f) => acc + (f.properties.luas ?? 0), 0),
  }), [features]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-[1100] border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} /><span className="hidden sm:inline">Kembali</span>
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
                <Icon className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div><p className="text-blue-100 text-sm font-medium">{categoryMode ? `Total ${title}` : 'Total Gedung Terpetakan'}</p>
                <p className="text-3xl font-bold mt-1">{categoryMode ? (roomsLoading ? '…' : rooms.length) : stats.total}</p></div>
              <Icon size={36} className="text-blue-300" />
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div><p className="text-emerald-100 text-sm font-medium">Total Luas Bangunan</p>
                <p className="text-3xl font-bold mt-1">{stats.totalArea.toLocaleString('id-ID')} m²</p></div>
              <Layers size={36} className="text-emerald-300" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-4">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Tidak dapat memuat peta</p>
              <p className="text-sm text-rose-700 mt-1">Layanan direktori sedang tidak tersedia.</p>
            </div>
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700">
              <RefreshCw size={16} /> Coba lagi
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[78vh]">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={categoryMode ? `Cari ${title.toLowerCase()} atau gedung...` : 'Cari gedung atau kode...'}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {categoryMode ? `${filteredRooms.length} ruangan` : `${filtered.length} gedung`}
              </p>
            </div>

            {categoryMode ? (
              /* Room list (this category's jenis ruangan) */
              <div className="overflow-y-auto p-2 space-y-1">
                {roomsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  ))
                ) : filteredRooms.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">Tidak ada ruangan ditemukan.</p>
                ) : (
                  filteredRooms.map((r) => {
                    const gid = r.gedung?.id != null ? Number(r.gedung.id) : null;
                    const active = gid != null && (gid === hoveredId || gid === selectedId);
                    return (
                      <button
                        key={r.id}
                        onMouseEnter={() => { if (gid != null) setHoveredId(gid); }}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => openRoom(r)}
                        className={`w-full text-left rounded-xl p-3 transition-all border ${active ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-blue-600 font-mono text-[11px] font-semibold">{r.kode_ruangan}</span>
                          {r.kapasitas != null && <span className="text-[11px] text-slate-400">Kap. {r.kapasitas}</span>}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1 mt-0.5">{r.nama}</p>
                        {r.gedung?.nama && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{r.gedung.nama}</p>}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* Building list (/gedung) */
              <div className="overflow-y-auto p-2 space-y-1">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  ))
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">Tidak ada gedung ditemukan.</p>
                ) : (
                  filtered.map((p) => {
                    const active = p.siisyana_gedung_id === hoveredId || p.siisyana_gedung_id === selectedId;
                    return (
                      <button
                        key={p.siisyana_gedung_id}
                        onMouseEnter={() => setHoveredId(p.siisyana_gedung_id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => { focusOnMap(p); openDetail(p); }}
                        className={`w-full text-left rounded-xl p-3 transition-all border ${active ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-blue-600 font-mono text-[11px] font-semibold">{p.kode}</span>
                          {p.luas != null && <span className="text-[11px] text-slate-400">{p.luas.toLocaleString('id-ID')} m²</span>}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1 mt-0.5">{p.nama}</p>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="relative h-[60vh] lg:h-[78vh] rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100">
            <div ref={mapContainerRef} className="absolute inset-0 z-[1]" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-[2]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Memuat peta...</p>
                </div>
              </div>
            )}
            {!loading && !error && (
              <div className="absolute bottom-3 left-3 z-[2] rounded-lg bg-white/90 backdrop-blur px-3 py-1.5 text-xs text-slate-600 shadow-sm flex items-center gap-1.5">
                <Maximize2 size={13} /> Klik gedung untuk lihat detail
              </div>
            )}
          </div>
        </div>
      </main>

      <MapDetailModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedId(null); }}
        feature={modalFeature}
        centroid={modalCentroid}
        onLihat={handleLihat}
        roomFilter={roomFilter}
      />

      {/* Category-mode: room detail (live schedule + availability) from the sidebar */}
      {scheduleRoom && (
        <SiauRoomModal room={scheduleRoom} onClose={() => { setScheduleRoom(null); setSelectedId(null); }} />
      )}

      <style>{`
        .gedung-tooltip { background: rgba(15,23,42,0.9); color: #fff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 3px 8px; }
        .gedung-tooltip::before { border-top-color: rgba(15,23,42,0.9); }
      `}</style>
    </div>
  );
};
