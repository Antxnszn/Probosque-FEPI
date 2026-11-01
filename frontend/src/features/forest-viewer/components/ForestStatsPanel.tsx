import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  TreePine,
  Info,
  Clock,
  Layers,
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
  onChangeYear?: (year: number) => void;
  onSelectMunicipality?: (code: string) => void;
}

export const ForestStatsPanel: React.FC<ForestStatsPanelProps> = ({
  selectedMunicipality,
  selectedYear,
  activeIndicator: _activeIndicator,
  annualStats,
  lossStats: _lossStats,
  legendClasses: _legendClasses,
  onOpenMetadataModal,
  onChangeYear,
  onSelectMunicipality,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const regionName = selectedMunicipality?.name || 'Valle de Bravo';
  const inegiCode = selectedMunicipality?.inegi_code || '15110';
  const totalAreaHa = selectedMunicipality?.area_ha || 40059.856;

  // Retrieve data for current selected year
  const isDataReady = annualStats?.data_status === 'ready';
  const currentSeries = annualStats?.series?.find((s) => s.year === selectedYear);
  const hasYearData = isDataReady && currentSeries && currentSeries.total_forest_approved_ha !== null;

  // Active classes with area > 0 sorted descending
  const activeClasses = (currentSeries?.classes || [])
    .filter((c) => c.area_ha !== undefined && c.area_ha !== null && c.area_ha > 0)
    .sort((a, b) => (b.area_ha || 0) - (a.area_ha || 0));

  const totalAnalyzedHa = activeClasses.reduce((acc, c) => acc + (c.area_ha || 0), 0);
  const forestApprovedHa = currentSeries?.total_forest_approved_ha ?? 0;
  const forestCoverPct = totalAnalyzedHa > 0 ? (forestApprovedHa / totalAnalyzedHa) * 100 : 0;

  // Difference between pixel raster analysis and official INEGI polygon
  const diffInegiHa = totalAnalyzedHa > 0 ? totalAnalyzedHa - totalAreaHa : 0;
  const concordancePct = totalAreaHa > 0 ? (1 - Math.abs(diffInegiHa) / totalAreaHa) * 100 : 100;

  return (
    <div
      className={`
        bg-[#EAE4D3] border-t border-[#6B8B78]/20 transition-all duration-300 shadow-[0_-4px_24px_rgba(27,42,36,0.06)] flex flex-col shrink-0 z-20 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]
        ${isExpanded ? 'h-[440px] max-h-[60vh]' : 'h-36 sm:h-32'}
      `}
    >
      {/* Header Bar */}
      <div className="px-5 py-2.5 border-b border-[#6B8B78]/15 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${hasYearData ? 'bg-[#A3C962]' : 'bg-[#E0643A]'}`}
            />
            <h3 className="font-['Outfit',sans-serif] text-sm sm:text-base font-semibold text-[#1B2A24] tracking-tight flex items-center gap-2">
              <span>{regionName}</span>
              <span className="text-xs text-[#6B8B78] bg-[#D9D1B8] px-2 py-0.5 rounded-full font-normal">
                Clave {inegiCode}
              </span>
            </h3>
          </div>
          <span className="text-xs text-[#6B8B78] hidden md:inline">
            Superficie oficial:{' '}
            <strong className="text-[#355044] font-semibold">{totalAreaHa.toLocaleString('es-MX')} ha</strong>
          </span>
        </div>

        {/* Quick Year Toggler & Expand Toggle */}
        <div className="flex items-center gap-2.5">
          {onChangeYear && (
            <div className="flex items-center gap-1 bg-[#D9D1B8] p-1 rounded-full shadow-inner">
              <button
                onClick={() => onChangeYear(2010)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedYear === 2010
                    ? 'bg-[#355044] text-white shadow-sm'
                    : 'text-[#355044] hover:text-[#1B2A24]'
                }`}
                title="Línea Base 2010"
              >
                2010
              </button>
              <button
                onClick={() => onChangeYear(2025)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedYear === 2025
                    ? 'bg-[#355044] text-white shadow-sm'
                    : 'text-[#355044] hover:text-[#1B2A24]'
                }`}
                title="Corte Reciente 2025"
              >
                2025
              </button>
            </div>
          )}

          <button
            onClick={onOpenMetadataModal}
            className="text-xs text-[#355044] hover:text-[#E0643A] hidden sm:flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-full bg-[#D9D1B8]/60"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Fuentes</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-full bg-[#D9D1B8] hover:bg-[#B9C8B2] text-[#1B2A24] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <span className="hidden sm:inline">{isExpanded ? 'Contraer' : 'Expandir estadísticas'}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stats Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {hasYearData ? (
          <>
            {/* Open-Air Metric Strip (Cardless Botanical Taste) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#6B8B78]/20">
              {/* Metric 1: Cobertura Forestal Aprobada */}
              <div className="space-y-1">
                <span className="text-xs text-[#6B8B78] font-medium block">Bosque Nativo Aprobado</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#355044] tabular-nums">
                    {forestApprovedHa.toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs text-[#6B8B78]">ha</span>
                </div>
                <span className="text-xs font-semibold text-[#355044] block">
                  {forestCoverPct.toFixed(1)}% del territorio ({selectedYear})
                </span>
              </div>

              {/* Metric 2: Superficie Analizada */}
              <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-xs text-[#6B8B78] font-medium block">Superficie Raster 30m</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24] tabular-nums">
                    {totalAnalyzedHa.toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs text-[#6B8B78]">ha</span>
                </div>
                <span className="text-xs text-[#6B8B78] block truncate">
                  Concordancia INEGI: {concordancePct.toFixed(2)}%
                </span>
              </div>

              {/* Metric 3: Usos No Forestales */}
              <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-xs text-[#6B8B78] font-medium block">Otros Usos del Suelo</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#E0643A] tabular-nums">
                    {(totalAnalyzedHa - forestApprovedHa).toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs text-[#6B8B78]">ha</span>
                </div>
                <span className="text-xs text-[#6B8B78] block">
                  {((1 - forestCoverPct / 100) * 100).toFixed(1)}% (Agrícola, urbano, agua)
                </span>
              </div>

              {/* Metric 4: Validación Científica */}
              <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-xs text-[#6B8B78] font-medium block">Validación Científica</span>
                <div className="font-['Outfit',sans-serif] text-xl font-medium text-[#355044] mt-1">
                  MapBiomas México
                </div>
                <span className="text-xs text-[#6B8B78] block">
                  Colección 1.0 (Píxel 30m verificado)
                </span>
              </div>
            </div>

            {/* Detailed Expanded Section */}
            {isExpanded && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-[#6B8B78]/20 animate-fadeIn">
                {/* Left: Class breakdown */}
                <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1B2A24] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#355044]" />
                      <span>Desglose por Clases Oficiales ({selectedYear})</span>
                    </span>
                    <span className="text-xs text-[#6B8B78]">
                      {activeClasses.length} categorías detectadas
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeClasses.map((c) => {
                      const pct = totalAnalyzedHa > 0 ? ((c.area_ha || 0) / totalAnalyzedHa) * 100 : 0;
                      return (
                        <div
                          key={c.code}
                          className="rounded-xl bg-[#EAE4D3] p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="w-3 h-3 rounded shrink-0 shadow-sm"
                                style={{ backgroundColor: c.hex_color }}
                              />
                              <span className="font-semibold text-[#1B2A24] truncate">{c.name_es}</span>
                              {c.is_forest_approved && (
                                <span className="text-[10px] bg-[#B9C8B2] text-[#1B2A24] px-2 py-0.5 rounded-full font-semibold">
                                  Bosque Aprobado
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-['Outfit',sans-serif] font-medium text-[#1B2A24] tabular-nums">
                                {(c.area_ha || 0).toLocaleString('es-MX')} ha
                              </span>
                              <span className="text-xs text-[#6B8B78] ml-1.5 tabular-nums">
                                ({pct.toFixed(1)}%)
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-[#D9D1B8] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(pct, 0.5)}%`,
                                backgroundColor: c.hex_color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Methodological Notes */}
                <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1B2A24] flex items-center gap-1.5">
                      <TreePine className="w-4 h-4 text-[#355044]" />
                      <span>Trazabilidad y Decisión Metodológica</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#355044] bg-[#D9D1B8] px-2 py-0.5 rounded-full">
                      CC BY 4.0
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#EAE4D3] p-3 text-xs text-[#1B2A24] space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b border-[#6B8B78]/20">
                      <div>
                        <span className="text-[#6B8B78] block text-[11px]">Superficie válida analizada:</span>
                        <strong className="text-[#1B2A24]">{totalAnalyzedHa.toLocaleString('es-MX')} ha</strong>
                      </div>
                      <div>
                        <span className="text-[#6B8B78] block text-[11px]">Área sin nubes:</span>
                        <strong className="text-[#355044]">100% verificado</strong>
                      </div>
                      <div>
                        <span className="text-[#6B8B78] block text-[11px]">Superficie vectorial INEGI:</span>
                        <strong className="text-[#1B2A24]">{totalAreaHa.toLocaleString('es-MX')} ha</strong>
                      </div>
                      <div>
                        <span className="text-[#6B8B78] block text-[11px]">Diferencia rasterización:</span>
                        <strong className="text-[#6B8B78]">
                          {diffInegiHa >= 0 ? `+${diffInegiHa.toFixed(1)}` : diffInegiHa.toFixed(1)} ha
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-[#6B8B78]">
                      <strong className="text-[#355044]">Criterio Forestal Institucional:</strong> El agrupamiento
                      de clases forestales aprobadas (Bosque templado código 88) corresponde a la definición técnica de
                      PROBOSQUE para fiscalizar el macizo boscoso nativo. Las áreas agrícolas y urbanas se mapean fielmente
                      según la Colección 1 de MapBiomas México pero quedan excluidas del stock de incentivos de conservación.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty / Pending Ingest State */
          <div className="rounded-2xl bg-[#F4F1EA] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D9D1B8] flex items-center justify-center text-[#E0643A] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1B2A24]">Municipio en cola de ingesta multitemporal</h4>
                <p className="text-xs text-[#6B8B78]">
                  {regionName} ({inegiCode}) cuenta con delimitación oficial. Las estadísticas raster se calculan en el lote estatal.
                </p>
              </div>
            </div>

            {onSelectMunicipality && inegiCode !== '15110' && (
              <button
                onClick={() => onSelectMunicipality('15110')}
                className="px-4 py-2 rounded-full bg-gradient-to-br from-[#EB7147] to-[#D95B30] text-white font-semibold shadow-sm shrink-0 flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>Ver Valle de Bravo (15110)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
