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
        color: '#6B8B78',
        weight: 2,
        dashArray: '5, 5',
        fillColor: '#355044',
        fillOpacity: 0.05,
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
        setAlertMsg('Punto fuera de los límites del Estado de México.');
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
              ? 'bg-[#355044] border-white text-[#F4F1EA] shadow-md ring-4 ring-[#355044]/30'
              : isLast && !isClosed
              ? 'bg-[#E0643A] border-white text-white shadow-md ring-2 ring-[#E0643A]/40'
              : 'bg-[#EAE4D3] border-[#355044] text-[#1B2A24] shadow'
          } font-sans text-[11px] font-bold cursor-grab transition-transform hover:scale-125">
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
          setAlertMsg('Vértice desplazado fuera del Estado de México.');
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
        color: isSelfIntersecting ? '#E0643A' : '#355044',
        weight: 2.5,
        fillColor: isSelfIntersecting ? '#E0643A' : '#6B8B78',
        fillOpacity: 0.35,
        dashArray: isSelfIntersecting ? '4, 4' : undefined,
      }).addTo(map);
      polygonLayerRef.current = polygon;
    } else {
      const polyline = L.polyline(latLngs, {
        color: '#6B8B78',
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
    <div className={`relative w-full ${heightClass} bg-[#16251E] rounded-[28px] border border-[#6B8B78]/25 overflow-hidden flex flex-col shadow-sm select-none font-['Plus_Jakarta_Sans',sans-serif]`}>
      {/* Top Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] p-1.5 rounded-full text-xs text-[#1B2A24] shadow-md">
        {/* Layer Selector */}
        <div className="flex items-center gap-1 bg-[#EAE4D3] p-0.5 rounded-full border border-[#D9D1B8]">
          <button
            type="button"
            onClick={() => setMapType('SATELLITE')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              mapType === 'SATELLITE'
                ? 'bg-[#355044] text-[#F4F1EA] shadow-sm'
                : 'text-[#6B8B78] hover:text-[#1B2A24]'
            }`}
          >
            Satélite (Esri)
          </button>
          <button
            type="button"
            onClick={() => setMapType('STREET')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              mapType === 'STREET'
                ? 'bg-[#355044] text-[#F4F1EA] shadow-sm'
                : 'text-[#6B8B78] hover:text-[#1B2A24]'
            }`}
          >
            Calles (OSM)
          </button>
        </div>

        <div className="h-4 w-px bg-[#D9D1B8] hidden sm:block" />

        {/* Municipality Fast-Zoom */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <Compass className="w-3.5 h-3.5 text-[#355044]" />
          <select
            value={currentMuni}
            onChange={(e) => handleMunicipalityChange(e.target.value)}
            className="bg-[#EAE4D3] border border-[#D9D1B8] rounded-full px-2.5 py-1 text-[#1B2A24] text-[11px] font-medium focus:outline-none shadow-sm cursor-pointer"
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
          className="flex items-center gap-1.5 px-3 py-1 bg-[#D9D1B8] hover:bg-[#cfc6ab] text-[#355044] font-semibold rounded-full text-[11px] transition-colors shadow-sm cursor-pointer"
          title="Centrar en mi ubicación GPS"
        >
          <Navigation className="w-3 h-3 text-[#355044]" />
          <span className="hidden sm:inline">Mi GPS</span>
        </button>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] p-1 rounded-2xl shadow-md text-[#355044]">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-1.5 hover:bg-[#EAE4D3] rounded-xl transition-colors cursor-pointer"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-1.5 hover:bg-[#EAE4D3] rounded-xl transition-colors cursor-pointer"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Alert Banner */}
      {alertMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-[#F9EDE8] border border-[#E8C8B8] text-[#9A381E] px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-[#E0643A] shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Map Container Leaflet DOM */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0 cursor-crosshair" />

      {/* Bottom Map Drawing Toolbar and Real-Time Metrics */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2.5 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] p-3 rounded-2xl shadow-lg">
        {/* Geometry Metrics */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B8B78]">Vértices:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-xs tabular-nums ${
              vertices.length >= 3
                ? 'bg-[#E5ECE3] text-[#355044]'
                : 'bg-[#D9D1B8] text-[#1B2A24]'
            }`}>
              {vertices.length}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#D9D1B8]" />

          <div className="flex items-center gap-1">
            <span className="text-[#6B8B78]">Superficie:</span>
            <span className="font-['Outfit',sans-serif] text-base font-light text-[#355044] tabular-nums">
              {areaHa.toFixed(2)} ha
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#D9D1B8] hidden sm:block" />

          <div className="items-center gap-1 hidden sm:flex">
            <span className="text-[#6B8B78]">Perímetro:</span>
            <span className="font-medium text-[#1B2A24] tabular-nums">{perimeterM.toLocaleString()} m</span>
          </div>

          {isSelfIntersecting && (
            <span className="text-xs text-[#9A381E] font-bold bg-[#F9EDE8] px-2.5 py-0.5 rounded-full border border-[#E8C8B8] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#E0643A]" />
              <span>Auto-intersección detectada</span>
            </span>
          )}
        </div>

        {/* Action Buttons for Drawing */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={vertices.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D9D1B8] hover:bg-[#cfc6ab] disabled:opacity-40 disabled:pointer-events-none text-[#1B2A24] rounded-full text-xs font-medium transition-colors shadow-sm cursor-pointer"
            title="Deshacer último vértice"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={vertices.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#D9D1B8] hover:bg-[#F9EDE8] hover:text-[#9A381E] disabled:opacity-40 disabled:pointer-events-none text-[#1B2A24] rounded-full text-xs font-medium transition-colors shadow-sm cursor-pointer"
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
              className="clay-btn-terracotta flex items-center gap-1.5 px-4 py-1.5 text-white font-bold rounded-full text-xs shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cerrar Polígono</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#E5ECE3] text-[#355044] font-bold text-xs rounded-full shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
              <span>Polígono Cerrado</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
