import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Layers,
  Calendar,
  SplitSquareVertical,
  Info,
  Check,
  ChevronRight,
  TreePine,
  Maximize2,
  X,
} from 'lucide-react';
import type { RegionSummary, ForestMetadata } from '../types/forest';

interface ViewerSidebarProps {
  municipalities: RegionSummary[];
  selectedCode: string | null;
  onSelectMunicipality: (code: string) => void;
  activeIndicator: 'land_cover' | 'tree_cover_loss';
  onChangeIndicator: (ind: 'land_cover' | 'tree_cover_loss') => void;
  selectedYear: number;
  onChangeYear: (year: number) => void;
  isCompareMode: boolean;
  onToggleCompare: (active: boolean) => void;
  compareYearA: number;
  onChangeCompareYearA: (year: number) => void;
  compareYearB: number;
  onChangeCompareYearB: (year: number) => void;
  metadata: ForestMetadata | null;
  onOpenMetadataModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const ViewerSidebar: React.FC<ViewerSidebarProps> = ({
  municipalities,
  selectedCode,
  onSelectMunicipality,
  activeIndicator,
  onChangeIndicator,
  selectedYear,
  onChangeYear,
  isCompareMode,
  onToggleCompare,
  compareYearA,
  onChangeCompareYearA,
  compareYearB,
  onChangeCompareYearB,
  metadata,
  onOpenMetadataModal,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter municipalities by search
  const filteredMunicipalities = useMemo(() => {
    if (!searchQuery.trim()) return municipalities;
    const q = searchQuery.toLowerCase().trim();
    return municipalities.filter(
      (m) => m.name.toLowerCase().includes(q) || m.inegi_code.includes(q) || m.cve_mun.includes(q)
    );
  }, [municipalities, searchQuery]);

  const years = metadata?.years_available || Array.from({ length: 16 }, (_, i) => 2010 + i);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-84 sm:w-96 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-transform duration-300 shadow-2xl
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static lg:z-auto'}
      `}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TreePine className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Panel de Control</h2>
            <p className="text-[11px] text-slate-400">Filtros y series multitemporales</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenMetadataModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            title="Ver fuentes y metodología"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
            title="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Área de Análisis */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Área de análisis
            </label>
            {selectedCode && selectedCode !== '15' && (
              <button
                onClick={() => onSelectMunicipality('15')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
              >
                <Maximize2 className="w-3 h-3" />
                Ver todo Edomex
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar entre los 125 municipios..."
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Municipality Selector Dropdown / Quick list */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl max-h-44 overflow-y-auto p-1 divide-y divide-slate-800/50">
            {/* Option: Entire State */}
            <button
              onClick={() => onSelectMunicipality('15')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                !selectedCode || selectedCode === '15'
                  ? 'bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-800/60'
                  : 'text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <div>
                <span className="block font-medium">Estado de México (Total)</span>
                <span className="text-[10px] text-slate-400 font-mono">125 Municipios • 2,235,175 ha</span>
              </div>
              {(!selectedCode || selectedCode === '15') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {filteredMunicipalities.map((m) => {
              const isSelected = selectedCode === m.inegi_code;
              const isValle = m.inegi_code === '15110';
              return (
                <button
                  key={m.inegi_code}
                  onClick={() => onSelectMunicipality(m.inegi_code)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-800/60'
                      : isValle
                      ? 'bg-emerald-950/20 text-slate-200 border border-emerald-900/30 hover:bg-emerald-950/40'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center">
                      <span className="block truncate font-medium">{m.name}</span>
                      {isValle && (
                        <span className="text-[9px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded ml-1.5 font-sans shrink-0">
                          Fase 2 Verificada
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Clave {m.inegi_code} • {m.area_ha.toLocaleString('es-MX')} ha
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Catálogo de Capas / Indicadores */}
        <section className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Indicador principal
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onChangeIndicator('land_cover')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeIndicator === 'land_cover'
                  ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Cobertura y Uso del Suelo
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded">
                  MapBiomas Col. 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Clasificación temática anual de bosques templados, selvas secas, agricultura y cuerpos de agua (30m).
              </p>
            </button>

            <button
              onClick={() => onChangeIndicator('tree_cover_loss')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeIndicator === 'tree_cover_loss'
                  ? 'bg-rose-950/60 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Pérdida Bruta de Cobertura Arbórea
                </span>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-900/40 px-1.5 py-0.5 rounded">
                  Hansen v1.13
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                Eventos de pérdida de dosel arbóreo (umbral ≥30%). Indicador independiente de stock forestal.
              </p>
            </button>
          </div>
        </section>

        {/* 3. Selector Temporal */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Año seleccionado
            </label>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
              {selectedYear}
            </span>
          </div>

          <div className="space-y-2">
            <select
              value={selectedYear}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Año {y} {y === 2025 ? '(Más reciente)' : y === 2010 ? '(Línea base MVP)' : ''}
                </option>
              ))}
            </select>

            {/* Quick 2010 / 2025 Toggles for Phase 2 Acceptance */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeYear(2010)}
                className={`py-1 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                  selectedYear === 2010
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                2010 (Línea base)
              </button>
              <button
                type="button"
                onClick={() => onChangeYear(2025)}
                className={`py-1 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                  selectedYear === 2025
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                2025 (Reciente)
              </button>
            </div>
          </div>
        </section>

        {/* 4. Comparador Temporal (Swipe / Cortinilla) */}
        <section className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SplitSquareVertical className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Modo Comparación</span>
            </div>
            <button
              onClick={() => onToggleCompare(!isCompareMode)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                isCompareMode
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {isCompareMode ? 'ACTIVADO' : 'DESACTIVADO'}
            </button>
          </div>

          {isCompareMode && (
            <div className="space-y-2.5 pt-1 border-t border-slate-800/80 animate-fadeIn">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Año A (Izquierda)</label>
                  <select
                    value={compareYearA}
                    onChange={(e) => onChangeCompareYearA(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Año B (Derecha)</label>
                  <select
                    value={compareYearB}
                    onChange={(e) => onChangeCompareYearB(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Arrastre la cortinilla central en el mapa para contrastar ambos cortes anuales.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Probosque • Edo. de México</span>
        <button
          onClick={onOpenMetadataModal}
          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
        >
          Metodología
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
};
