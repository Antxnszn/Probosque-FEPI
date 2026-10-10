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
    <div className={`relative w-full ${heightClass} bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-inner select-none`}>
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/70 p-1.5 rounded-xl text-xs text-slate-300 shadow-lg">
        <span className="font-semibold text-white px-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-forest-400" />
          Capa Geoespacial: Edo. de México
        </span>

        {showFilters && (
          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              onClick={() => setFilterTriage('ALL')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${filterTriage === 'ALL' ? 'bg-forest-600 text-white font-medium' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              Todas ({plots.length})
            </button>
            <button
              onClick={() => setFilterTriage('NORMAL')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${filterTriage === 'NORMAL' ? 'bg-emerald-600 text-white font-medium' : 'hover:bg-slate-800 text-emerald-400'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilterTriage('ANOMALY')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${filterTriage === 'ANOMALY' ? 'bg-rose-600 text-white font-medium' : 'hover:bg-slate-800 text-rose-400'}`}
            >
              Anomalía
            </button>
            <button
              onClick={() => setFilterTriage('INCONCLUSIVE')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${filterTriage === 'INCONCLUSIVE' ? 'bg-amber-600 text-white font-medium' : 'hover:bg-slate-800 text-amber-400'}`}
            >
              Inconcluso
            </button>
          </div>
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/70 p-1 rounded-xl shadow-lg">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
          className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
          className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="Restablecer vista"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Map SVG Canvas */}
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-[#070d19]">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Subtle grid pattern */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            {/* Elevation topography contours representation */}
            <radialGradient id="mountainNevado" cx="55%" cy="60%" r="40%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#0f172a" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="600" fill="url(#mapGrid)" />
          <circle cx="450" cy="350" r="220" fill="url(#mountainNevado)" />

          {/* Regional Landmark labels */}
          <g className="text-[11px] font-mono fill-slate-600 font-semibold select-none pointer-events-none">
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
                ? '#10b981'
                : plot.triageStatus === 'ANOMALY'
                ? '#f43f5e'
                : '#f59e0b';

            const fillColor =
              plot.triageStatus === 'NORMAL'
                ? 'rgba(16, 185, 129, 0.25)'
                : plot.triageStatus === 'ANOMALY'
                ? 'rgba(244, 63, 94, 0.3)'
                : 'rgba(245, 158, 11, 0.25)';

            return (
              <g
                key={plot.id}
                onClick={() => onSelectPlot && onSelectPlot(plot)}
                className="cursor-pointer group"
              >
                {/* Polygon Boundary */}
                <polygon
                  points={pointsStr}
                  fill={isSelected ? 'rgba(56, 189, 248, 0.45)' : fillColor}
                  stroke={isSelected ? '#38bdf8' : strokeColor}
                  strokeWidth={isSelected ? '3.5' : '2'}
                  strokeDasharray={isSelected ? '4 2' : 'none'}
                  className="transition-all duration-200 group-hover:stroke-white group-hover:stroke-width-3"
                />

                {/* Centroid Badge / Marker */}
                <circle
                  cx={centroid.x}
                  cy={centroid.y}
                  r={isSelected ? '9' : '6'}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all drop-shadow-md group-hover:r-8"
                />

                {/* Cadastral Label */}
                <text
                  x={centroid.x + 10}
                  y={centroid.y + 4}
                  fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
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
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-700/70 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> NORMAL
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> ANOMALY
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> INCONCLUSIVE
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Clic en parcela para inspeccionar</span>
      </div>
    </div>
  );
}
