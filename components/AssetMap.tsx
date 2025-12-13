import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';

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

export const AssetMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const initialBoundsSet = useRef(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<UnitName>>(new Set());
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  // Load GeoJSON data - try API first, fallback to static file
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // First, try to load from API (imported polygons)
        const apiResponse = await fetch('http://localhost:8000/api/v1/polygons/geojson');
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          // If API has features, use them; otherwise fallback to static
          if (apiData.features && apiData.features.length > 0) {
            setGeoJsonData(apiData);
            return;
          }
        }
      } catch (err) {
        console.log('API not available, falling back to static file');
      }

      // Fallback to static GeoJSON file
      try {
        const res = await fetch('/DataPolygon_SHP_Unud.geojson');
        const data = await res.json();
        setGeoJsonData(data);
      } catch (err) {
        console.error('Failed to load GeoJSON:', err);
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

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control at bottom left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON layer when data or selection changes
  useEffect(() => {
    if (!mapRef.current || !geoJsonData) return;

    // Remove existing layer
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }

    // Filter features if units are selected
    const filteredData = selectedUnits.size > 0
      ? {
        ...geoJsonData,
        features: geoJsonData.features.filter((f: any) => {
          const shp = f.properties?.['NO.SHP'];
          const unit = SHP_TO_UNIT[shp];
          return unit && selectedUnits.has(unit);
        }),
      }
      : geoJsonData;

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
            fillOpacity: isHighlighted ? 0.8 : (props.fill_opacity || 0.4),
          };
        } else {
          // Static file format (NO.SHP based)
          const shp = feature.properties['NO.SHP'];
          const unit = SHP_TO_UNIT[shp];
          const config = unit ? UNIT_CONFIG[unit] : null;
          const isSelected = selectedUnits.size === 0 || (unit && selectedUnits.has(unit));
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
            click: () => {
              L.popup()
                .setLatLng((layer as any).getBounds().getCenter())
                .setContent(`
                  <div style="min-width: 150px;">
                    <strong style="font-size: 14px;">${name}</strong>
                    ${props.faculty ? `<br/><span style="color: #666; font-size: 12px;">${props.faculty}</span>` : ''}
                    ${props.land_area ? `<br/><span style="color: #666; font-size: 11px;">Area: ${Number(props.land_area).toLocaleString('id-ID')} m²</span>` : ''}
                  </div>
                `)
                .openOn(mapRef.current!);
            },
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
            click: () => {
              if (unit) {
                L.popup()
                  .setLatLng((layer as any).getBounds().getCenter())
                  .setContent(`
                    <div style="min-width: 150px;">
                      <strong style="font-size: 14px;">${unit}</strong>
                      <br/>
                      <span style="color: #666; font-size: 12px;">ID: ${shp}</span>
                    </div>
                  `)
                  .openOn(mapRef.current!);
              }
            },
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

    geoJsonLayer.addTo(mapRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

    // Fit bounds only on initial load (not on selection changes)
    if (!initialBoundsSet.current && geoJsonLayer.getBounds().isValid()) {
      mapRef.current.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
      initialBoundsSet.current = true;
    }
  }, [geoJsonData, selectedUnits, hoveredFeature]);

  // Handle legend item click
  const handleLegendClick = (unit: UnitName) => {
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedUnits(new Set());
  };

  // Legend items sorted by display order
  const legendItems = useMemo(() =>
    Object.entries(UNIT_CONFIG).map(([name, config]) => ({
      name: name as UnitName,
      color: config.color,
      count: config.shp.length,
    })),
    []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lokasi Tanah Udayana</h2>
          <p className="text-sm text-slate-500">
            Luas Tanah Keseluruhan : <span className="font-mono font-medium text-slate-900">1.643.867 M²</span>
          </p>
        </div>
        {selectedUnits.size > 0 && (
          <button
            onClick={handleClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Tampilkan Semua ({selectedUnits.size} unit dipilih)
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
            {legendItems.map((item) => {
              const isSelected = selectedUnits.has(item.name);
              const isActive = selectedUnits.size === 0 || isSelected;

              return (
                <button
                  key={item.name}
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
                  <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-700'
                    }`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative h-[500px] rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

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
    </div>
  );
};
