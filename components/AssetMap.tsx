import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { MapDetailModal } from './MapDetailModal';
import { siauApi } from '../api/client';
import type { PolygonFeatureProperties } from '../types';

const fmtM2 = (n: any) => (n == null ? '-' : `${Number(n).toLocaleString('id-ID')} M²`);
const esc = (s: any) =>
  String(s ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// Unit/Faculty configuration with colors matching the reference image
const UNIT_CONFIG = {
  'FAKULTAS ILMU BUDAYA': { color: '#FFD700', shp: ['SHP 79'] },
  'FAKULTAS KEDOKTERAN DAN RS UNUD': { color: '#90EE90', shp: ['SHP 19', 'SHP 943'] },
  'FAKULTAS HUKUM': { color: '#32CD32', shp: ['SHP 18'] },
  'FAKULTAS TEKNIK': { color: '#1E90FF', shp: ['SHP 20', 'SHP 142', 'SHP 35', 'SHP 88', 'SHP 77', 'SHP 86', 'SHP 33'] },
  'FAKULTAS EKONOMI': { color: '#40E0D0', shp: ['SHP 21', 'SHP 85', 'SHP 132'] },
  'FAKULTAS PERTANIAN': { color: '#98FB98', shp: ['SHP 78', 'SHP 17'] },
  'FAKULTAS PETERNAKAN': { color: '#FFA500', shp: ['SHP 84', 'SHP 34'] },
  'FAKULTAS MIPA': { color: '#9932CC', shp: ['920', '92', '93'] },
  'FAKULTAS KEDOKTERAN HEWAN': { color: '#FF8C00', shp: ['SHP 919', '16', '131'] },
  'FAKULTAS TEKNOLOGI PERTANIAN': { color: '#7CFC00', shp: ['SHP 87', '127'] },
  'FAKULTAS PARIWISATA': { color: '#FFFF00', shp: ['941', '143', '129', '128'] },
  'FAKULTAS ILMU SOSIAL DAN POLITIK': { color: '#4169E1', shp: ['141', '147'] },
  'FAKULTAS KELAUTAN DAN PERIKANAN': { color: '#00CED1', shp: ['918', '940'] },
  'PURA MAHA WIDYA SARASWATI': { color: '#DAA520', shp: ['126'] },
  'REKTORAT, LPPM, PERPUSTAKAAN': { color: '#CD853F', shp: ['9700'] },
  'KANTOR URUSAN INTERNASIONAL': { color: '#F0E68C', shp: ['88'] },
  'SPBU UNUD DAN UNIT BISNIS': { color: '#FFFACD', shp: ['27', '38'] },
  'PERUMAHAN UNUD': { color: '#2F4F4F', shp: ['57', '59', '122', '48', '58', '47', '49', '50', '60'] },
  'SPORT CENTRE DAN STUDENT CENTRE': { color: '#228B22', shp: ['63', '17'] },
  'LECTURE BUILDING': { color: '#DC143C', shp: ['-'] },
  'UDAYANA INTERNATIONAL CONVENTION CENTRE': { color: '#00FFFF', shp: [] },
} as const;

type UnitName = keyof typeof UNIT_CONFIG;

// Create SHP to unit mapping
const createShpToUnitMap = () => {
  const map: Record<string, UnitName> = {};
  Object.entries(UNIT_CONFIG).forEach(([unit, config]) => {
    config.shp.forEach(shp => {
      map[shp] = unit as UnitName;
    });
  });
  return map;
};

const SHP_TO_UNIT = createShpToUnitMap();

interface AssetMapProps {
  /** Homepage map: show only land/tanah parcels, hide building-linked polygons. */
  landOnly?: boolean;
}

export const AssetMap: React.FC<AssetMapProps> = ({ landOnly = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const drawGroupRef = useRef<L.LayerGroup | null>(null);
  const selectedLayerRef = useRef<L.Layer | null>(null);
  const initialBoundsSet = useRef(false);
  const [selectedFaculties, setSelectedFaculties] = useState<Set<string>>(new Set());
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  // Detail modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState<PolygonFeatureProperties | null>(null);
  const [modalCentroid, setModalCentroid] = useState<[number, number] | null>(null);

  // Open the detail modal for a clicked polygon, remembering its layer so the
  // modal's "Lihat" action can fit the map to its bounds.
  const openDetail = (props: any, layer: L.Layer) => {
    selectedLayerRef.current = layer;
    const c = (layer as any).getBounds?.().getCenter?.();
    setModalCentroid(c ? [c.lat, c.lng] : null);
    setModalFeature(props as PolygonFeatureProperties);
    setModalOpen(true);
    mapRef.current?.closePopup();
  };

  const handleLihat = () => {
    const layer: any = selectedLayerRef.current;
    if (layer?.getBounds && mapRef.current) {
      mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40] });
      setModalOpen(false);
    }
  };

  // Build the click popup: shows legacy-style metadata (fetched live from
  // SIISYANA when the polygon is linked) plus a "Lihat Detail" button.
  const openPopup = (props: any, layer: L.Layer) => {
    const map = mapRef.current;
    if (!map) return;
    const center = (layer as any).getBounds().getCenter();
    const el = document.createElement('div');
    el.style.minWidth = '220px';
    el.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${esc(props.name)}</div>
      <div style="color:#64748b;font-size:12px">Memuat data...</div>`;

    const popup = L.popup({ maxWidth: 280 }).setLatLng(center).setContent(el).openOn(map);

    const renderRows = (rows: [string, any][]) =>
      rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid #f1f5f9">
        <span style="color:#64748b;font-size:12px">${k}</span>
        <span style="font-weight:600;font-size:12px;text-align:right">${esc(v)}</span></div>`).join('');

    const mount = (titleHtml: string, rowsHtml: string) => {
      el.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${titleHtml}</div>${rowsHtml}`;
      const btn = document.createElement('button');
      btn.textContent = 'Lihat Detail';
      btn.style.cssText = 'margin-top:10px;width:100%;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer';
      btn.onclick = () => openDetail(props, layer);
      el.appendChild(btn);
      popup.update();
    };

    const type = props.asset_type;
    const sid = type === 'bangunan' ? props.siisyana_gedung_id : type === 'tanah' ? props.siisyana_tanah_id : null;

    if (!type || !sid) {
      mount(esc(props.name), renderRows([['Luas', fmtM2(props.land_area)]]));
      return;
    }

    if (type === 'tanah') {
      siauApi.land.get(sid).then((r: any) => {
        const d = r.data;
        mount(esc(props.name), renderRows([
          ['Bukti Kepemilikan', d.bukti_kepemilikan],
          ['Nomor KIB', d.nomor_kib],
          ['Luas Total', fmtM2(d.luas_total)],
          ['Luas Tidak Terpakai', fmtM2(d.luas_tidak_terpakai)],
        ]));
      }).catch(() => mount(esc(props.name), renderRows([['Luas', fmtM2(props.land_area)]])));
    } else {
      siauApi.buildings.get(sid).then((r: any) => {
        const d = r.data;
        mount(esc(d.nama || props.name), renderRows([
          ['Kode Aset', d.kode],
          ['Nomor KIB', d.nomor_kib],
          ['Nama Gedung', d.nama],
          ['Luas Gedung', fmtM2(d.luas_gedung)],
        ]));
      }).catch(() => mount(esc(props.name), renderRows([['Luas', fmtM2(props.land_area)]])));
    }
  };

  // Load GeoJSON data - try API first, fallback to static file
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // First, try to load from API (imported polygons)
        console.log('[AssetMap] Fetching GeoJSON from API...');
        const apiResponse = await fetch('http://localhost:8000/api/v1/polygons/geojson');
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('[AssetMap] API Response:', {
            type: apiData.type,
            featureCount: apiData.features?.length || 0
          });
          // If API has features, use them; otherwise fallback to static
          if (apiData.features && apiData.features.length > 0) {
            console.log('[AssetMap] Using API data with', apiData.features.length, 'features');
            setGeoJsonData(apiData);
            return;
          }
        }
      } catch (err) {
        console.log('[AssetMap] API not available, falling back to static file:', err);
      }

      // Fallback to static GeoJSON file
      try {
        console.log('[AssetMap] Fetching static GeoJSON file...');
        const res = await fetch('/DataPolygon_SHP_Unud.geojson');
        const data = await res.json();
        console.log('[AssetMap] Static file loaded:', data.features?.length, 'features');
        setGeoJsonData(data);
      } catch (err) {
        console.error('[AssetMap] Failed to load GeoJSON:', err);
      }
    };

    loadGeoJSON();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on Jimbaran campus
    const map = L.map(mapContainerRef.current, {
      center: [-8.7970, 115.1720],
      zoom: 15,
      zoomControl: false,
    });

    // Base layers (legacy parity: OSM + Google satellite)
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const google = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google',
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });

    // Persistent overlay group ("drawlayer") that holds the polygon GeoJSON.
    const drawGroup = L.layerGroup().addTo(map);
    drawGroupRef.current = drawGroup;

    L.control.layers(
      { osm, google },
      { drawlayer: drawGroup },
      { position: 'topleft', collapsed: false }
    ).addTo(map);

    // Add zoom control at top left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapRef.current = map;

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON layer when data or selection changes
  useEffect(() => {
    if (!mapRef.current || !geoJsonData) return;

    // Remove existing layer from the drawlayer overlay group
    if (geoJsonLayerRef.current) {
      drawGroupRef.current?.removeLayer(geoJsonLayerRef.current);
    }

    // Homepage shows land/tanah only: drop polygons linked to a building.
    const baseData = landOnly
      ? { ...geoJsonData, features: geoJsonData.features.filter((f: any) => f.properties?.asset_type !== 'bangunan') }
      : geoJsonData;

    // Filter features if faculties are selected
    const filteredData = selectedFaculties.size > 0
      ? {
        ...baseData,
        features: baseData.features.filter((f: any) => {
          const props = f.properties;
          // Check if this is API data (has fill_color/faculty) or static data (has NO.SHP)
          const isApiData = 'fill_color' in props;

          if (isApiData) {
            // API data: filter by polygon name (each zone / each faculty is its own legend row)
            return selectedFaculties.has(props.name);
          } else {
            // Static data: filter by SHP to unit mapping
            const shp = props?.['NO.SHP'];
            const unit = SHP_TO_UNIT[shp];
            return unit && selectedFaculties.has(unit);
          }
        }),
      }
      : baseData;

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(filteredData, {
      style: (feature) => {
        if (!feature?.properties) return {};

        // Check if this is API data (has fill_color) or static data (has NO.SHP)
        const isApiData = 'fill_color' in feature.properties;

        if (isApiData) {
          // API polygon format
          const props = feature.properties;
          const featureId = props.id || props.name;
          const isHighlighted = hoveredFeature === featureId;

          return {
            fillColor: props.fill_color || '#3b82f6',
            weight: isHighlighted ? 3 : 2,
            opacity: 1,
            color: props.stroke_color || '#1d4ed8',
            fillOpacity: isHighlighted ? 0.8 : (Number(props.fill_opacity) || 0.4),
          };
        } else {
          // Static file format (NO.SHP based)
          const shp = feature.properties['NO.SHP'];
          const unit = SHP_TO_UNIT[shp];
          const config = unit ? UNIT_CONFIG[unit] : null;
          const isSelected = selectedFaculties.size === 0 || (unit && selectedFaculties.has(unit));
          const isHighlighted = hoveredFeature === shp;

          return {
            fillColor: config?.color || '#808080',
            weight: isHighlighted ? 3 : 1,
            opacity: 1,
            color: isHighlighted ? '#000' : '#333',
            fillOpacity: isSelected ? (isHighlighted ? 0.9 : 0.6) : 0.2,
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const isApiData = 'fill_color' in props;

        if (isApiData) {
          // API polygon format
          const featureId = props.id || props.name;
          const name = props.name || `Polygon ${props.id}`;

          layer.on({
            mouseover: () => setHoveredFeature(featureId),
            mouseout: () => setHoveredFeature(null),
            click: () => openPopup(props, layer),
          });

          layer.bindTooltip(name, {
            permanent: false,
            direction: 'center',
            className: 'unit-tooltip',
          });
        } else {
          // Static file format
          const shp = props?.['NO.SHP'];
          const unit = SHP_TO_UNIT[shp];

          layer.on({
            mouseover: () => setHoveredFeature(shp),
            mouseout: () => setHoveredFeature(null),
            click: () => openPopup({ ...props, name: unit || props?.['NO.SHP'] || 'Aset' }, layer),
          });

          // Add tooltip
          if (unit) {
            layer.bindTooltip(unit, {
              permanent: false,
              direction: 'center',
              className: 'unit-tooltip',
            });
          }
        }
      },
    });

    drawGroupRef.current?.addLayer(geoJsonLayer);
    geoJsonLayerRef.current = geoJsonLayer;

    // Log layer count for debugging
    let layerCount = 0;
    geoJsonLayer.eachLayer(() => layerCount++);
    console.log('[AssetMap] Layer added. Total features rendered:', layerCount);
    console.log('[AssetMap] Layer bounds:', geoJsonLayer.getBounds());

    // Set initial view to Jimbaran campus (main campus with most polygons)
    // Only on initial load, not on selection changes
    if (!initialBoundsSet.current) {
      setTimeout(() => {
        if (!mapRef.current || initialBoundsSet.current) return;

        // Center on Jimbaran campus at a zoom level that shows polygon details
        const jimbaranCenter: [number, number] = [-8.7970, 115.1720];
        const defaultZoom = 16;

        console.log('[AssetMap] Setting view to Jimbaran campus:', jimbaranCenter, 'zoom:', defaultZoom);
        mapRef.current.invalidateSize();
        mapRef.current.setView(jimbaranCenter, defaultZoom);
        initialBoundsSet.current = true;
      }, 200);
    }
  }, [geoJsonData, selectedFaculties, hoveredFeature, landOnly]);

  // Handle legend item click
  const handleLegendClick = (faculty: string) => {
    setSelectedFaculties(prev => {
      const next = new Set(prev);
      if (next.has(faculty)) {
        next.delete(faculty);
      } else {
        next.add(faculty);
      }
      return next;
    });
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedFaculties(new Set());
  };

  // Build legend items from actual data (unique faculties with colors)
  const legendItems = useMemo(() => {
    if (!geoJsonData?.features) {
      // Fallback to UNIT_CONFIG if no data loaded yet
      return Object.entries(UNIT_CONFIG).map(([name, config]) => ({
        name,
        color: config.color,
        count: config.shp.length,
      }));
    }

    // Check if this is API data
    const isApiData = geoJsonData.features.some((f: any) => 'fill_color' in f.properties);

    if (isApiData) {
      // Build one legend row per polygon NAME, keeping layer info for sectioning.
      // Multiple polygons sharing a name (e.g. two "FEB" geometries) collapse
      // into one row.
      const itemMap = new Map<string, { color: string; count: number; layer: string }>();

      geoJsonData.features.forEach((f: any) => {
        const name = f.properties.name || 'Unnamed';
        const layer = f.properties.layer || 'other';
        const color = f.properties.fill_color || '#3b82f6';

        if (itemMap.has(name)) {
          itemMap.get(name)!.count++;
        } else {
          itemMap.set(name, { color, count: 1, layer });
        }
      });

      // Sort: zona first, then sebaran_fakultas, then anything else; alphabetical within each.
      const layerOrder: Record<string, number> = {
        zona: 0,
        sebaran_fakultas: 1,
      };

      return Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, color: data.color, count: data.count, layer: data.layer }))
        .sort((a, b) => {
          const la = layerOrder[a.layer] ?? 99;
          const lb = layerOrder[b.layer] ?? 99;
          if (la !== lb) return la - lb;
          return a.name.localeCompare(b.name);
        });
    } else {
      // Use UNIT_CONFIG for static data
      return Object.entries(UNIT_CONFIG).map(([name, config]) => ({
        name,
        color: config.color,
        count: config.shp.length,
      }));
    }
  }, [geoJsonData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lokasi Tanah Udayana</h2>
          <p className="text-sm text-slate-500">
            Luas Tanah Keseluruhan : <span className="font-mono font-medium text-slate-900">1.643.867 M²</span>
          </p>
        </div>
        {selectedFaculties.size > 0 && (
          <button
            onClick={handleClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Tampilkan Semua ({selectedFaculties.size} unit dipilih)
          </button>
        )}
      </div>

      <div className="flex gap-4">
        {/* Legend Panel */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Legenda Wilayah
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Klik untuk menyorot</p>
          </div>
          <div className="max-h-[460px] overflow-y-auto p-2 space-y-0.5">
            {(() => {
              const LAYER_LABELS: Record<string, string> = {
                zona: 'Zona Kawasan',
                sebaran_fakultas: 'Sebaran Fakultas',
              };
              let lastLayer: string | undefined;
              return legendItems.map((item: any) => {
                const isSelected = selectedFaculties.has(item.name);
                const isActive = selectedFaculties.size === 0 || isSelected;
                const showHeader = item.layer && item.layer !== lastLayer;
                lastLayer = item.layer;

                return (
                  <React.Fragment key={item.name}>
                    {showHeader && (
                      <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {LAYER_LABELS[item.layer] ?? item.layer}
                      </div>
                    )}
                    <button
                      onClick={() => handleLegendClick(item.name)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${isSelected
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : isActive
                          ? 'hover:bg-slate-50'
                          : 'opacity-40 hover:opacity-60'
                        }`}
                    >
                      <div
                        className="w-4 h-4 rounded flex-shrink-0 border border-slate-300"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={`text-xs font-medium leading-tight flex-1 ${isSelected ? 'text-blue-900' : 'text-slate-700'
                        }`}>
                        {item.name}
                      </span>
                      {item.count > 1 && (
                        <span className="text-[10px] text-slate-400 font-mono">{item.count}</span>
                      )}
                    </button>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative h-[500px] rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 z-[1]" />

          {/* Loading state */}
          {!geoJsonData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Memuat peta...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-400 text-center">
        Klik pada polygon di peta atau legend untuk melihat detail. Pilih beberapa unit untuk membandingkan.
      </p>

      <style>{`
        .unit-tooltip {
          background: rgba(0,0,0,0.8);
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>

      <MapDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        feature={modalFeature}
        centroid={modalCentroid}
        onLihat={handleLihat}
      />
    </div>
  );
};
