import { useState } from 'react';
import type { PlotRecord } from '../../types';
import { Layers, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface InteractiveMapProps {
  plots: PlotRecord[];
  selectedPlotId?: string | null;
  onSelectPlot?: (plot: PlotRecord) => void;
  heightClass?: string;
  showFilters?: boolean;
}

export function InteractiveMap({
  plots,
  selectedPlotId,
  onSelectPlot,
  heightClass = 'h-[500px]',
  showFilters = true,
}: InteractiveMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterTriage, setFilterTriage] = useState<string>('ALL');

  // Bounding box for State of Mexico central forest region
  // Lon: -100.2 to -99.3, Lat: 18.9 to 19.8
  const minLon = -100.25;
  const maxLon = -99.35;
  const minLat = 18.90;
  const maxLat = 19.80;

  const project = (lon: number, lat: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * 800;
    const y = 600 - ((lat - minLat) / (maxLat - minLat)) * 600;
    return { x, y };
  };

  const filteredPlots = plots.filter((p) => {
    if (filterTriage === 'ALL') return true;
    return p.triageStatus === filterTriage;
  });

  return (
    <div className={`relative w-full ${heightClass} bg-[#16251E] rounded-[24px] border border-[#6B8B78]/25 overflow-hidden flex flex-col shadow-sm select-none font-['Plus_Jakarta_Sans',sans-serif]`}>
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] p-1.5 rounded-full text-xs text-[#1B2A24] shadow-md">
        <span className="font-semibold text-[#355044] px-2.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#355044]" />
          <span>Edo. de México</span>
        </span>

        {showFilters && (
          <div className="flex items-center gap-1 border-l border-[#D9D1B8] pl-2">
            <button
              onClick={() => setFilterTriage('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                filterTriage === 'ALL'
                  ? 'bg-[#355044] text-[#F4F1EA] font-semibold shadow-sm'
                  : 'hover:bg-[#EAE4D3] text-[#6B8B78]'
              }`}
            >
              Todas ({plots.length})
            </button>
            <button
              onClick={() => setFilterTriage('NORMAL')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                filterTriage === 'NORMAL'
                  ? 'bg-[#355044] text-[#F4F1EA] font-semibold shadow-sm'
                  : 'hover:bg-[#EAE4D3] text-[#355044]'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilterTriage('ANOMALY')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                filterTriage === 'ANOMALY'
                  ? 'bg-[#E0643A] text-[#F4F1EA] font-semibold shadow-sm'
                  : 'hover:bg-[#EAE4D3] text-[#E0643A]'
              }`}
            >
              Anomalía
            </button>
            <button
              onClick={() => setFilterTriage('INCONCLUSIVE')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                filterTriage === 'INCONCLUSIVE'
                  ? 'bg-[#C48B3F] text-[#F4F1EA] font-semibold shadow-sm'
                  : 'hover:bg-[#EAE4D3] text-[#C48B3F]'
              }`}
            >
              Inconcluso
            </button>
          </div>
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] p-1 rounded-2xl shadow-md text-[#355044]">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
          className="p-1.5 hover:bg-[#EAE4D3] rounded-xl transition-colors cursor-pointer"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
          className="p-1.5 hover:bg-[#EAE4D3] rounded-xl transition-colors cursor-pointer"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          className="p-1.5 hover:bg-[#EAE4D3] rounded-xl transition-colors cursor-pointer"
          title="Restablecer vista"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Map SVG Canvas */}
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-[#16251E]">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Subtle grid pattern */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#23382D" strokeWidth="0.5" strokeOpacity="0.6" />
            </pattern>
            {/* Elevation topography contours representation */}
            <radialGradient id="mountainNevado" cx="55%" cy="60%" r="40%">
              <stop offset="0%" stopColor="#2A4537" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#1C2F25" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#16251E" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="600" fill="url(#mapGrid)" />
          <circle cx="450" cy="350" r="220" fill="url(#mountainNevado)" />

          {/* Regional Landmark labels */}
          <g className="text-[10px] font-sans fill-[#6B8B78] font-medium tracking-wide select-none pointer-events-none opacity-80">
            <text x="440" y="310">VOLCÁN NEVADO DE TOLUCA</text>
            <text x="180" y="240">VALLE DE BRAVO / MONTE ALTO</text>
            <text x="520" y="220">VALLE DE TOLUCA</text>
            <text x="310" y="470">SIERRA DE TEMASCALTEPEC</text>
            <text x="570" y="110">CORREDOR VILLA DEL CARBÓN</text>
          </g>

          {/* Plots Polygons and Centroid Markers */}
          {filteredPlots.map((plot) => {
            const isSelected = selectedPlotId === plot.id;
            const coords = plot.polygonGeojson?.coordinates?.[0] || [];
            if (coords.length === 0) return null;

            // Generate SVG path for polygon
            const pointsStr = coords
              .map((pt) => {
                const p = project(pt[0], pt[1]);
                return `${p.x},${p.y}`;
              })
              .join(' ');

            // Calculate centroid
            const avgLon = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
            const avgLat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
            const centroid = project(avgLon, avgLat);

            const strokeColor =
              plot.triageStatus === 'NORMAL'
                ? '#6B8B78'
                : plot.triageStatus === 'ANOMALY'
                ? '#E0643A'
                : '#C48B3F';

            const fillColor =
              plot.triageStatus === 'NORMAL'
                ? 'rgba(107, 139, 120, 0.35)'
                : plot.triageStatus === 'ANOMALY'
                ? 'rgba(224, 100, 58, 0.4)'
                : 'rgba(196, 139, 63, 0.35)';

            return (
              <g
                key={plot.id}
                onClick={() => onSelectPlot && onSelectPlot(plot)}
                className="cursor-pointer group"
              >
                {/* Polygon Boundary */}
                <polygon
                  points={pointsStr}
                  fill={isSelected ? 'rgba(224, 100, 58, 0.55)' : fillColor}
                  stroke={isSelected ? '#F4F1EA' : strokeColor}
                  strokeWidth={isSelected ? '3.5' : '2'}
                  strokeDasharray={isSelected ? '4 2' : 'none'}
                  className="transition-all duration-200 group-hover:stroke-white group-hover:stroke-width-3"
                />

                {/* Centroid Badge / Marker */}
                <circle
                  cx={centroid.x}
                  cy={centroid.y}
                  r={isSelected ? '9' : '6'}
                  fill={isSelected ? '#E0643A' : strokeColor}
                  stroke="#F4F1EA"
                  strokeWidth="2"
                  className="transition-all drop-shadow-md group-hover:r-8"
                />

                {/* Cadastral Label */}
                <text
                  x={centroid.x + 10}
                  y={centroid.y + 4}
                  fill={isSelected ? '#F4F1EA' : '#D9D1B8'}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none"
                >
                  {plot.cadastralKey}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-[#F4F1EA]/95 backdrop-blur-md border border-[#D9D1B8] px-3.5 py-1.5 rounded-full text-xs text-[#1B2A24] shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6B8B78]"></span>
          <span>Normal</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E0643A]"></span>
          <span>Anomalía</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C48B3F]"></span>
          <span>Inconcluso</span>
        </span>
        <span className="text-[#D9D1B8]">|</span>
        <span className="text-[#6B8B78] text-[11px]">Clic en parcela para inspeccionar</span>
      </div>
    </div>
  );
}
