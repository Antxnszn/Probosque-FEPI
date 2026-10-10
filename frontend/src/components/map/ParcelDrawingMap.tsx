import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  RotateCcw,
  Trash2,
  CheckCircle2,
  Navigation,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Compass,
} from 'lucide-react';
import {
  EDOMEX_BOUNDS,
  EDOMEX_CENTER,
  EDOMEX_BOUNDARY_GEOJSON,
  EDOMEX_FOREST_MUNICIPALITIES,
  isPointInsideEdomex,
  calculatePolygonAreaHa,
  calculatePolygonPerimeterM,
  hasSelfIntersections,
} from '../../utils/geo';

interface ParcelDrawingMapProps {
  onPolygonChange: (coords: [number, number][], isClosed: boolean, areaHa: number, perimeterM: number) => void;
  initialCoords?: [number, number][];
  heightClass?: string;
  selectedMunicipality?: string;
}

export function ParcelDrawingMap({
  onPolygonChange,
  initialCoords = [],
  heightClass = 'h-[580px]',
  selectedMunicipality,
}: ParcelDrawingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const satelliteTileRef = useRef<L.TileLayer | null>(null);
  const streetTileRef = useRef<L.TileLayer | null>(null);

  const [vertices, setVertices] = useState<[number, number][]>(initialCoords);
  const [isClosed, setIsClosed] = useState<boolean>(initialCoords.length >= 3);
  const [mapType, setMapType] = useState<'SATELLITE' | 'STREET'>('SATELLITE');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [currentMuni, setCurrentMuni] = useState<string>(selectedMunicipality || 'Zinacantepec');

  const isClosedRef = useRef(isClosed);
  useEffect(() => {
    isClosedRef.current = isClosed;
  }, [isClosed]);

  // Metrics
  const areaHa = calculatePolygonAreaHa(vertices);
  const perimeterM = calculatePolygonPerimeterM(vertices);
  const isSelfIntersecting = hasSelfIntersections(vertices);

  // Clear alert after 3.5s
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Notify parent of polygon updates
  useEffect(() => {
    onPolygonChange(vertices, isClosed, areaHa, perimeterM);
  }, [vertices, isClosed, areaHa, perimeterM, onPolygonChange]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Fix default marker icon assets for Leaflet in Vite
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // 1. Create Leaflet map locked strictly to Estado de México
    const bounds = L.latLngBounds(
      L.latLng(EDOMEX_BOUNDS[0][0] - 0.08, EDOMEX_BOUNDS[0][1] - 0.08),
      L.latLng(EDOMEX_BOUNDS[1][0] + 0.08, EDOMEX_BOUNDS[1][1] + 0.08)
    );

    const map = L.map(mapContainerRef.current, {
      center: EDOMEX_CENTER,
      zoom: 11,
      minZoom: 8,
      maxZoom: 18,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0, // Hard bounce back to Edomex
      zoomControl: false,
    });

    // 2. Base tile layers
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 18,
      }
    );

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    });

    satellite.addTo(map);
    satelliteTileRef.current = satellite;
    streetTileRef.current = street;

    // 3. Estado de México Official Border Overlay
    L.geoJSON(EDOMEX_BOUNDARY_GEOJSON, {
      style: {
        color: '#10b981',
        weight: 2,
        dashArray: '5, 5',
        fillColor: '#059669',
        fillOpacity: 0.03,
      },
    }).addTo(map);

    // 4. Layers for dynamic drawing
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // 5. Map Click Handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Validate boundary
      if (!isPointInsideEdomex(lat, lng)) {
        setAlertMsg('⚠️ Punto fuera de los límites del Estado de México.');
        return;
      }

      setVertices((prev) => {
        // If polygon was already closed, start fresh
        if (isClosedRef.current) {
          setIsClosed(false);
          return [[lat, lng]];
        }
        return [...prev, [lat, lng]];
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layers when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !satelliteTileRef.current || !streetTileRef.current) return;

    if (mapType === 'SATELLITE') {
      map.removeLayer(streetTileRef.current);
      map.addLayer(satelliteTileRef.current);
    } else {
      map.removeLayer(satelliteTileRef.current);
      map.addLayer(streetTileRef.current);
    }
  }, [mapType]);

  // Sync markers and polygon shape when vertices or isClosed state change
  const redrawGeometry = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // 1. Clear previous layers
    markersLayer.clearLayers();
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (vertices.length === 0) return;

    // 2. Draw Vertex Markers
    vertices.forEach(([lat, lon], idx) => {
      const isFirst = idx === 0;
      const isLast = idx === vertices.length - 1;

      // Custom styled HTML marker icon
      const icon = L.divIcon({
        className: 'custom-parcel-marker',
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 ${
            isFirst
              ? 'bg-emerald-500 border-white text-white shadow-lg ring-4 ring-emerald-500/30'
              : isLast && !isClosed
              ? 'bg-amber-500 border-white text-slate-950 shadow-md ring-2 ring-amber-400/40'
              : 'bg-slate-900 border-emerald-400 text-emerald-300 shadow'
          } font-mono text-[11px] font-bold cursor-grab transition-transform hover:scale-125">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lon], {
        icon,
        draggable: true,
      });

      // Dragging vertex allows fine adjustment
      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        if (!isPointInsideEdomex(newPos.lat, newPos.lng)) {
          marker.setLatLng([lat, lon]);
          setAlertMsg('⚠️ Vértice desplazado fuera del Estado de México.');
          return;
        }

        setVertices((prev) => {
          const next = [...prev];
          next[idx] = [newPos.lat, newPos.lng];
          return next;
        });
      });

      // If user clicks the first marker when they have >= 3 vertices, close the polygon!
      if (isFirst && vertices.length >= 3 && !isClosed) {
        marker.on('click', (ev) => {
          L.DomEvent.stopPropagation(ev);
          setIsClosed(true);
        });
        marker.bindTooltip('Haz clic aquí para cerrar el polígono', {
          direction: 'top',
          offset: [0, -10],
        });
      }

      markersLayer.addLayer(marker);
    });

    // 3. Draw Polygon or Polyline
    const latLngs = vertices.map(([lat, lon]) => L.latLng(lat, lon));

    if (isClosed && vertices.length >= 3) {
      const polygon = L.polygon(latLngs, {
        color: isSelfIntersecting ? '#f43f5e' : '#10b981',
        weight: 2.5,
        fillColor: isSelfIntersecting ? '#f43f5e' : '#10b981',
        fillOpacity: 0.3,
        dashArray: isSelfIntersecting ? '4, 4' : undefined,
      }).addTo(map);
      polygonLayerRef.current = polygon;
    } else {
      const polyline = L.polyline(latLngs, {
        color: '#34d399',
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);
      polylineLayerRef.current = polyline;
    }
  }, [vertices, isClosed, isSelfIntersecting]);

  useEffect(() => {
    redrawGeometry();
  }, [redrawGeometry]);

  // Actions
  const handleUndo = () => {
    if (vertices.length === 0) return;
    setIsClosed(false);
    setVertices((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setVertices([]);
    setIsClosed(false);
  };

  const handleClosePolygon = () => {
    if (vertices.length < 3) {
      setAlertMsg('Se requieren al menos 3 vértices para cerrar el polígono.');
      return;
    }
    setIsClosed(true);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setAlertMsg('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isPointInsideEdomex(latitude, longitude)) {
          setAlertMsg('Tu ubicación GPS actual está fuera del territorio del Estado de México.');
          return;
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.5 });
        }
      },
      (err) => {
        setAlertMsg(`Error al obtener GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMunicipalityChange = (muniName: string) => {
    setCurrentMuni(muniName);
    const found = EDOMEX_FOREST_MUNICIPALITIES.find((m) => m.name === muniName);
    if (found && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([found.lat, found.lon], found.zoom, { duration: 1.2 });
    }
  };

  return (
    <div className={`relative w-full ${heightClass} bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl`}>
      {/* Top Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1.5 rounded-xl text-xs text-slate-200 shadow-xl">
        {/* Layer Selector */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMapType('SATELLITE')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mapType === 'SATELLITE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Satélite (Esri)
          </button>
          <button
            type="button"
            onClick={() => setMapType('STREET')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mapType === 'STREET'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Calles (OSM)
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* Municipality Fast-Zoom */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={currentMuni}
            onChange={(e) => handleMunicipalityChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-emerald-500"
          >
            {EDOMEX_FOREST_MUNICIPALITIES.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.region.split(' ')[1] || m.region})
              </option>
            ))}
          </select>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-medium rounded-lg text-[11px] transition-colors border border-slate-700"
          title="Centrar en mi ubicación GPS"
        >
          <Navigation className="w-3 h-3" />
          <span className="hidden sm:inline">Mi GPS</span>
        </button>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1 rounded-xl shadow-xl">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Alert Banner */}
      {alertMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-rose-950/95 border border-rose-600/80 text-rose-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Map Container Leaflet DOM */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0 cursor-crosshair" />

      {/* Bottom Map Drawing Toolbar and Real-Time Metrics */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-2xl">
        {/* Geometry Metrics */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Vértices:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${vertices.length >= 3 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
              {vertices.length}
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-700" />

          <div className="flex items-center gap-1 font-mono">
            <span className="text-slate-400">Superficie:</span>
            <span className="font-bold text-emerald-400 text-sm">{areaHa.toFixed(2)} ha</span>
          </div>

          <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />

          <div className="items-center gap-1 font-mono hidden sm:flex">
            <span className="text-slate-400">Perímetro:</span>
            <span className="font-semibold text-slate-200">{perimeterM.toLocaleString()} m</span>
          </div>

          {isSelfIntersecting && (
            <span className="text-[11px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 animate-pulse">
              ⚠️ Auto-intersección detectada
            </span>
          )}
        </div>

        {/* Action Buttons for Drawing */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={vertices.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700"
            title="Deshacer último vértice"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={vertices.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/80 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-rose-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            title="Borrar todo el polígono"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>

          {!isClosed ? (
            <button
              type="button"
              onClick={handleClosePolygon}
              disabled={vertices.length < 3 || isSelfIntersecting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-lg text-xs transition-all shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cerrar Polígono</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/90 text-emerald-400 border border-emerald-800 text-[11px] font-semibold rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Polígono Cerrado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
