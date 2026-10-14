import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, LngLatBoundsLike, MapLayerMouseEvent, GeoJSONSource } from 'maplibre-gl';
import { Layers, RotateCcw, Moon, Sun } from 'lucide-react';
import type { RegionSummary, BasemapMode } from '../types/forest';

interface ForestMapProps {
  municipalitiesGeoJSON: GeoJSON.FeatureCollection | null;
  stateGeoJSON: GeoJSON.FeatureCollection | null;
  selectedMunicipalityCode: string | null;
  selectedMunicipality: RegionSummary | null;
  onSelectMunicipality: (code: string) => void;
  activeIndicator: 'land_cover' | 'tree_cover_loss';
  selectedYear: number;
  isCompareMode: boolean;
  compareYearA: number;
  compareYearB: number;
}

// Bounding box for entire Estado de México
const EDOMEX_BBOX: [number, number, number, number] = [-100.6131, 18.3669, -98.5969, 20.2859];

const BASEMAP_STYLES: Record<BasemapMode, string> = {
  carto_dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  carto_positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satellite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // fallback style with satellite raster overlay
};

export const ForestMap: React.FC<ForestMapProps> = ({
  municipalitiesGeoJSON,
  stateGeoJSON,
  selectedMunicipalityCode,
  selectedMunicipality,
  onSelectMunicipality,
  activeIndicator,
  selectedYear,
  isCompareMode,
  compareYearA,
  compareYearB,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredFeatureIdRef = useRef<string | number | null>(null);

  const [basemap, setBasemap] = useState<BasemapMode>('carto_dark');
  const [hoveredMuniName, setHoveredMuniName] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASEMAP_STYLES.carto_dark,
      bounds: EDOMEX_BBOX as LngLatBoundsLike,
      fitBoundsOptions: { padding: 30 },
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'INEGI MG 2023 | MapBiomas México | Hansen/UMD',
      }),
      'bottom-left'
    );

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle basemap style switch
  const handleBasemapChange = (mode: BasemapMode) => {
    if (!mapRef.current || mode === basemap) return;
    setBasemap(mode);
    mapRef.current.setStyle(BASEMAP_STYLES[mode]);
    // Note: 'styledata' event will re-add layers automatically via useEffect below
  };

  // Add vector sources and layers when map is ready and GeoJSON is available
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !municipalitiesGeoJSON) return;

    const updateLayers = () => {
      // 1. Add Municipalities Source
      if (!map.getSource('municipalities')) {
        map.addSource('municipalities', {
          type: 'geojson',
          data: municipalitiesGeoJSON,
          generateId: true,
        });
      } else {
        (map.getSource('municipalities') as GeoJSONSource).setData(municipalitiesGeoJSON);
      }

      // 2. Add State Source
      if (stateGeoJSON) {
        if (!map.getSource('state-boundary')) {
          map.addSource('state-boundary', {
            type: 'geojson',
            data: stateGeoJSON,
          });
        } else {
          (map.getSource('state-boundary') as GeoJSONSource).setData(stateGeoJSON);
        }
      }

      // 3. Municipal Fill Layer (interactive hover & selection)
      if (!map.getLayer('municipalities-fill')) {
        map.addLayer({
          id: 'municipalities-fill',
          type: 'fill',
          source: 'municipalities',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
              '#10b981', // emerald-500 when selected
              ['boolean', ['feature-state', 'hover'], false],
              '#059669', // emerald-600 on hover
              '#1e293b', // slate-800 default
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
              0.45,
              ['boolean', ['feature-state', 'hover'], false],
              0.35,
              0.12,
            ],
          },
        });
      }

      // 4. Municipal Borders Line Layer
      if (!map.getLayer('municipalities-borders')) {
        map.addLayer({
          id: 'municipalities-borders',
          type: 'line',
          source: 'municipalities',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
              '#34d399', // bright emerald
              '#475569', // slate-600
            ],
            'line-width': [
              'case',
              ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
              2.5,
              1,
            ],
            'line-opacity': 0.8,
          },
        });
      }

      // 5. State Perimeter Outline
      if (stateGeoJSON && !map.getLayer('state-outline')) {
        map.addLayer({
          id: 'state-outline',
          type: 'line',
          source: 'state-boundary',
          paint: {
            'line-color': '#10b981',
            'line-width': 2.5,
            'line-dasharray': [2, 1],
            'line-opacity': 0.9,
          },
        });
      }
    };

    updateLayers();
    map.on('styledata', updateLayers);

    // Mouse interactions
    const onMouseMove = (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      map.getCanvas().style.cursor = 'pointer';

      const feat = e.features[0];
      const code = feat.properties?.inegi_code;
      const name = feat.properties?.name;

      if (code && feat.id !== undefined) {
        if (hoveredFeatureIdRef.current !== null) {
          map.setFeatureState({ source: 'municipalities', id: hoveredFeatureIdRef.current }, { hover: false });
        }
        hoveredFeatureIdRef.current = feat.id;
        map.setFeatureState({ source: 'municipalities', id: feat.id }, { hover: true });
        setHoveredMuniName(`${name} (${code})`);
      }
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (hoveredFeatureIdRef.current !== null) {
        map.setFeatureState({ source: 'municipalities', id: hoveredFeatureIdRef.current }, { hover: false });
      }
      hoveredFeatureIdRef.current = null;
      setHoveredMuniName(null);
    };

    const onClick = (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const code = e.features[0].properties?.inegi_code;
      if (code) {
        onSelectMunicipality(code);
      }
    };

    map.on('mousemove', 'municipalities-fill', onMouseMove);
    map.on('mouseleave', 'municipalities-fill', onMouseLeave);
    map.on('click', 'municipalities-fill', onClick);

    return () => {
      map.off('styledata', updateLayers);
      map.off('mousemove', 'municipalities-fill', onMouseMove);
      map.off('mouseleave', 'municipalities-fill', onMouseLeave);
      map.off('click', 'municipalities-fill', onClick);
    };
  }, [mapLoaded, municipalitiesGeoJSON, stateGeoJSON, selectedMunicipalityCode, onSelectMunicipality]);

  // Update selected highlight when selectedMunicipalityCode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('municipalities-fill') || !map.getLayer('municipalities-borders')) return;

    map.setPaintProperty('municipalities-fill', 'fill-color', [
      'case',
      ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
      '#10b981',
      ['boolean', ['feature-state', 'hover'], false],
      '#059669',
      '#1e293b',
    ]);

    map.setPaintProperty('municipalities-borders', 'line-color', [
      'case',
      ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
      '#34d399',
      '#475569',
    ]);

    map.setPaintProperty('municipalities-borders', 'line-width', [
      'case',
      ['==', ['get', 'inegi_code'], selectedMunicipalityCode || ''],
      2.5,
      1,
    ]);
  }, [selectedMunicipalityCode]);

  // Camera flyTo on municipality selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedMunicipality) return;

    if (selectedMunicipality.inegi_code === '15') {
      // Entire state
      map.fitBounds(EDOMEX_BBOX as LngLatBoundsLike, { padding: 40, duration: 1200 });
    } else if (selectedMunicipality.bbox) {
      map.fitBounds(selectedMunicipality.bbox as LngLatBoundsLike, {
        padding: 60,
        maxZoom: 13,
        duration: 1200,
      });
    }
  }, [selectedMunicipality]);

  const resetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.fitBounds(EDOMEX_BBOX as LngLatBoundsLike, { padding: 30, duration: 1000 });
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Header Badge / Indicator Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs text-slate-200 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-white tracking-wide">
            {activeIndicator === 'land_cover' ? 'Cobertura y Uso del Suelo' : 'Pérdida Arbórea Bruta'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-md font-bold">
            {isCompareMode ? `${compareYearA} vs ${compareYearB}` : selectedYear}
          </span>
        </div>

        {/* Hovered municipality tooltip banner */}
        {hoveredMuniName && (
          <div className="bg-slate-900/95 backdrop-blur border border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs text-emerald-200 shadow-xl font-medium flex items-center gap-1.5 animate-fadeIn">
            <span className="text-slate-400">Municipio:</span>
            <span className="font-semibold text-white">{hoveredMuniName}</span>
          </div>
        )}
      </div>

      {/* Top-Right Floating Controls (Basemap Switcher & Reset) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 p-1.5 rounded-xl shadow-xl">
        <button
          onClick={() => handleBasemapChange('carto_dark')}
          className={`p-2 rounded-lg transition-all ${basemap === 'carto_dark' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Mapa Oscuro (Carto Dark)"
        >
          <Moon className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleBasemapChange('carto_positron')}
          className={`p-2 rounded-lg transition-all ${basemap === 'carto_positron' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Mapa Claro (Carto Positron)"
        >
          <Sun className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-700 mx-0.5" />
        <button
          onClick={resetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          title="Centrar en Estado de México"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* In-Map Floating Legend Preview */}
      <div className="absolute bottom-6 right-4 z-10 hidden sm:block max-w-xs bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl text-xs text-slate-300">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Leyenda oficial
          </span>
          <span className="text-[10px] text-slate-400 font-mono">MapBiomas Col. 1</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#329c5a] shrink-0" />
            <span className="truncate">Bosque templado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#6bd46c] shrink-0" />
            <span className="truncate">Selva seca</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#a89358] shrink-0" />
            <span className="truncate">Matorrales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#807a40] shrink-0" />
            <span className="truncate">Pastizal alpino</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#c27ba0] shrink-0" />
            <span className="truncate">Agricultura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#d4271e] shrink-0" />
            <span className="truncate">Área urbana</span>
          </div>
        </div>
      </div>
    </div>
  );
};
