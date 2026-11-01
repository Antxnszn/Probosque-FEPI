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
        fixed inset-y-0 left-0 z-30 w-84 sm:w-96 bg-[#EAE4D3] border-r border-[#6B8B78]/20 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(27,42,36,0.06)] font-['Plus_Jakarta_Sans',sans-serif]
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static lg:z-auto'}
      `}
    >
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[#6B8B78]/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-sm">
            <TreePine className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-['Outfit',sans-serif] text-sm font-semibold text-[#1B2A24] tracking-tight">
              Filtros Geoespaciales
            </h2>
            <p className="text-xs text-[#6B8B78]">Series multitemporales 2010–2025</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenMetadataModal}
            className="p-2 rounded-xl text-[#355044] hover:bg-[#D9D1B8] transition-colors"
            title="Ver fuentes y metodología"
            aria-label="Ver fuentes y metodología"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-xl text-[#355044] hover:bg-[#D9D1B8] transition-colors lg:hidden"
            title="Cerrar panel"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* 1. Área de Análisis */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#1B2A24] flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#355044]" />
              <span>Región o municipio</span>
            </label>
            {selectedCode && selectedCode !== '15' && (
              <button
                onClick={() => onSelectMunicipality('15')}
                className="text-xs text-[#E0643A] hover:underline flex items-center gap-1 font-semibold"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Todo el estado</span>
              </button>
            )}
          </div>

          {/* Search Input (Recessed Clay Well) */}
          <div className="relative rounded-2xl bg-[#F4F1EA] shadow-[inset_3px_3px_7px_rgba(107,139,120,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.85)]">
            <Search className="w-4 h-4 text-[#6B8B78] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de municipio..."
              className="w-full bg-transparent border-none pl-10 pr-4 py-2.5 text-xs text-[#1B2A24] placeholder-[#6B8B78]/70 focus:outline-none"
            />
          </div>

          {/* Municipality Selector Dropdown / Quick list */}
          <div className="rounded-2xl bg-[#D9D1B8]/40 p-1.5 max-h-48 overflow-y-auto space-y-1 border border-[#6B8B78]/15">
            {/* Option: Entire State */}
            <button
              onClick={() => onSelectMunicipality('15')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                !selectedCode || selectedCode === '15'
                  ? 'bg-[#355044] text-[#F4F1EA] font-semibold shadow-sm'
                  : 'text-[#1B2A24] hover:bg-[#D9D1B8]'
              }`}
            >
              <div>
                <span className="block font-medium">Estado de México (Total)</span>
                <span className={`text-[10px] ${!selectedCode || selectedCode === '15' ? 'text-[#B9C8B2]' : 'text-[#6B8B78]'}`}>
                  125 municipios · 2,235,175 ha
                </span>
              </div>
              {(!selectedCode || selectedCode === '15') && <Check className="w-3.5 h-3.5 text-[#A3C962]" />}
            </button>

            {filteredMunicipalities.map((m) => {
              const isSelected = selectedCode === m.inegi_code;
              const isValle = m.inegi_code === '15110';
              return (
                <button
                  key={m.inegi_code}
                  onClick={() => onSelectMunicipality(m.inegi_code)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#355044] text-[#F4F1EA] font-semibold shadow-sm'
                      : isValle
                      ? 'bg-[#B9C8B2]/50 text-[#1B2A24] hover:bg-[#B9C8B2]/70 font-medium'
                      : 'text-[#1B2A24] hover:bg-[#D9D1B8]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="block truncate font-medium">{m.name}</span>
                      {isValle && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isSelected ? 'bg-[#D9D1B8] text-[#1B2A24]' : 'bg-[#355044] text-white'}`}>
                          Verificado
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] ${isSelected ? 'text-[#B9C8B2]' : 'text-[#6B8B78]'}`}>
                      {m.area_ha.toLocaleString('es-MX')} ha
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#A3C962] shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Catálogo de Capas / Indicadores */}
        <section className="space-y-3">
          <label className="text-xs font-semibold text-[#1B2A24] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#355044]" />
            <span>Indicador satelital</span>
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => onChangeIndicator('land_cover')}
              className={`p-3.5 rounded-2xl text-left transition-all ${
                activeIndicator === 'land_cover'
                  ? 'bg-[#355044] text-white shadow-[6px_10px_20px_rgba(27,42,36,0.18),inset_2px_2px_4px_rgba(185,200,178,0.25)]'
                  : 'bg-[#D9D1B8]/60 text-[#1B2A24] hover:bg-[#D9D1B8] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeIndicator === 'land_cover' ? 'bg-[#A3C962]' : 'bg-[#355044]'}`} />
                  Cobertura y Uso del Suelo
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activeIndicator === 'land_cover' ? 'bg-[#D9D1B8] text-[#1B2A24]' : 'bg-[#B9C8B2] text-[#355044]'}`}>
                  MapBiomas Col. 1
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${activeIndicator === 'land_cover' ? 'text-[#F4F1EA]/85' : 'text-[#6B8B78]'}`}>
                Clasificación temática de bosques templados, selvas, agricultura y cuerpos de agua a 30m.
              </p>
            </button>

            <button
              onClick={() => onChangeIndicator('tree_cover_loss')}
              className={`p-3.5 rounded-2xl text-left transition-all ${
                activeIndicator === 'tree_cover_loss'
                  ? 'bg-gradient-to-br from-[#EB7147] to-[#D95B30] text-white shadow-[6px_10px_20px_rgba(224,100,58,0.28),inset_2px_2px_5px_rgba(255,215,195,0.5)]'
                  : 'bg-[#D9D1B8]/60 text-[#1B2A24] hover:bg-[#D9D1B8] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeIndicator === 'tree_cover_loss' ? 'bg-white' : 'bg-[#E0643A]'}`} />
                  Pérdida de Cobertura Arbórea
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activeIndicator === 'tree_cover_loss' ? 'bg-white/20 text-white' : 'bg-[#F9DFD5] text-[#E0643A]'}`}>
                  Hansen v1.13
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${activeIndicator === 'tree_cover_loss' ? 'text-white/90' : 'text-[#6B8B78]'}`}>
                Eventos anuales de pérdida de dosel arbóreo (umbral mayor o igual al 30%).
              </p>
            </button>
          </div>
        </section>

        {/* 3. Selector Temporal */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#1B2A24] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#355044]" />
              <span>Año seleccionado</span>
            </label>
            <span className="font-['Outfit',sans-serif] text-sm font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-0.5 rounded-full tabular-nums">
              {selectedYear}
            </span>
          </div>

          <div className="space-y-2.5">
            <select
              value={selectedYear}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className="w-full rounded-2xl bg-[#F4F1EA] border border-[#6B8B78]/20 px-3.5 py-2.5 text-xs text-[#1B2A24] focus:outline-none shadow-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Año {y} {y === 2025 ? '(Más reciente)' : y === 2010 ? '(Línea base MVP)' : ''}
                </option>
              ))}
            </select>

            {/* Quick 2010 / 2025 Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeYear(2010)}
                className={`py-2 px-3 rounded-full text-xs font-semibold transition-all text-center ${
                  selectedYear === 2010
                    ? 'bg-[#355044] text-white shadow-sm'
                    : 'bg-[#D9D1B8] text-[#1B2A24] hover:bg-[#B9C8B2]'
                }`}
              >
                2010 (Línea base)
              </button>
              <button
                type="button"
                onClick={() => onChangeYear(2025)}
                className={`py-2 px-3 rounded-full text-xs font-semibold transition-all text-center ${
                  selectedYear === 2025
                    ? 'bg-[#355044] text-white shadow-sm'
                    : 'bg-[#D9D1B8] text-[#1B2A24] hover:bg-[#B9C8B2]'
                }`}
              >
                2025 (Reciente)
              </button>
            </div>
          </div>
        </section>

        {/* 4. Comparador Temporal */}
        <section className="rounded-3xl bg-[#D9D1B8]/40 border border-[#6B8B78]/15 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SplitSquareVertical className="w-4 h-4 text-[#355044]" />
              <span className="text-xs font-semibold text-[#1B2A24]">Modo Comparativo</span>
            </div>
            <button
              onClick={() => onToggleCompare(!isCompareMode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                isCompareMode
                  ? 'bg-[#E0643A] text-white shadow-sm'
                  : 'bg-[#D9D1B8] text-[#6B8B78] hover:text-[#1B2A24]'
              }`}
            >
              {isCompareMode ? 'Activado' : 'Desactivado'}
            </button>
          </div>

          {isCompareMode && (
            <div className="space-y-3 pt-2 border-t border-[#6B8B78]/15">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-[#6B8B78] font-medium block mb-1">Año A (Izquierda)</label>
                  <select
                    value={compareYearA}
                    onChange={(e) => onChangeCompareYearA(Number(e.target.value))}
                    className="w-full bg-[#F4F1EA] border border-[#6B8B78]/20 rounded-xl px-2.5 py-1.5 text-xs text-[#1B2A24]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#6B8B78] font-medium block mb-1">Año B (Derecha)</label>
                  <select
                    value={compareYearB}
                    onChange={(e) => onChangeCompareYearB(Number(e.target.value))}
                    className="w-full bg-[#F4F1EA] border border-[#6B8B78]/20 rounded-xl px-2.5 py-1.5 text-xs text-[#1B2A24]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-[#6B8B78] leading-relaxed">
                Desplaza la cortinilla en el mapa para contrastar ambos momentos temporales.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#6B8B78]/15 bg-[#D9D1B8]/30 text-xs text-[#6B8B78] flex items-center justify-between">
        <span>PROBOSQUE · Edomex</span>
        <button
          onClick={onOpenMetadataModal}
          className="text-[#355044] hover:text-[#E0643A] font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Metodología</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
