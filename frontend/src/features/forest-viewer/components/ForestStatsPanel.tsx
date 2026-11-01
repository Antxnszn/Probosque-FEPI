import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  TreePine,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import type { RegionSummary, LegendClass, AnnualStatsResponse, LossStatsResponse } from '../types/forest';

interface ForestStatsPanelProps {
  selectedMunicipality: RegionSummary | null;
  selectedYear: number;
  activeIndicator: 'land_cover' | 'tree_cover_loss';
  annualStats: AnnualStatsResponse | null;
  lossStats: LossStatsResponse | null;
  legendClasses: LegendClass[];
  onOpenMetadataModal: () => void;
}

export const ForestStatsPanel: React.FC<ForestStatsPanelProps> = ({
  selectedMunicipality,
  selectedYear,
  activeIndicator: _activeIndicator,
  annualStats: _annualStats,
  lossStats: _lossStats,
  legendClasses,
  onOpenMetadataModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const regionName = selectedMunicipality?.name || 'Estado de México';
  const inegiCode = selectedMunicipality?.inegi_code || '15';
  const totalAreaHa = selectedMunicipality?.area_ha || 2235175.16;

  const approvedClasses = legendClasses.filter((c) => c.is_forest_approved);

  return (
    <div
      className={`
        bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 transition-all duration-300 shadow-2xl flex flex-col
        ${isExpanded ? 'h-96' : 'h-36 sm:h-28'}
      `}
    >
      {/* Drawer Drag / Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {regionName}
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-normal">
                INEGI {inegiCode}
              </span>
            </h3>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            Superficie oficial: <strong className="text-white font-mono">{totalAreaHa.toLocaleString('es-MX')} ha</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMetadataModal}
            className="text-[11px] text-slate-400 hover:text-emerald-400 hidden sm:flex items-center gap-1 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Metodología y fuentes
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs"
          >
            <span>{isExpanded ? 'Contraer' : 'Expandir estadísticas'}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stats Summary Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick KPI Bar (Always visible in collapsed mode) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium block">Superficie Total (INEGI 2023)</span>
            <span className="text-sm sm:text-base font-bold text-white font-mono">
              {totalAreaHa.toLocaleString('es-MX')} <span className="text-xs font-normal text-slate-400">ha</span>
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium block">Clases de Cobertura Oficial</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
              15 <span className="text-xs font-normal text-slate-400">categorías</span>
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium block">Corte Temporal Activo</span>
            <span className="text-sm sm:text-base font-bold text-white font-mono">
              Año {selectedYear}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium block">Estado de Datos (MVP)</span>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Fase 0/1 Lista (ETL en Fase 2)
            </span>
          </div>
        </div>

        {/* Detailed Section (Shown when expanded) */}
        {isExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-800 animate-fadeIn">
            {/* Left: Clases forestales aprobadas */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TreePine className="w-4 h-4 text-emerald-400" />
                  Clases Forestales Aprobadas (Probosque v1.0)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  MapBiomas México Col. 1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Categorías oficialmente aprobadas como cobertura forestal para el Estado de México. Matorrales y pastizales se auditan por separado.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {approvedClasses.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: c.hex_color }} />
                      <span className="font-medium text-slate-200 truncate">{c.name_es}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Cód. {c.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Estado del precálculo & Aviso de rigor científico */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Rigor Estadístico y Científico
                </span>
                <span className="text-[10px] font-mono text-slate-400">Sin cifras simuladas</span>
              </div>

              <div className="bg-slate-900/90 border border-amber-900/40 p-3 rounded-xl text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Contrato de Ejecución Científica
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  El visor <strong>no inventa estadísticas mock</strong> antes de ingerir el ráster oficial. En Fase 2 se ejecutará el pipeline zonal (`build_region_stats.py`) para registrar las hectáreas reales por píxel de MapBiomas 2010–2025 sobre los 125 polígonos del INEGI.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>
                  <strong className="text-slate-300">Pérdida arbórea (Hansen):</strong> Umbral de copa de referencia al 30%. No se confunde con deforestación permanente.
                </div>
                <div>
                  <strong className="text-slate-300">Geometría:</strong> Marco Geoestadístico INEGI (diciembre 2023), normalizado en WGS84.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
