import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map as MapIcon,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { TriageBadge, AuditStatusBadge, SubsidyBadge } from '../../components/common/StatusBadge';

export function AdminMap() {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<PlotRecord | null>(null);

  // Filters
  const [filterMunicipality, setFilterMunicipality] = useState<string>('ALL');
  const [filterTechnician, setFilterTechnician] = useState<string>('ALL');
  const [filterTriage, setFilterTriage] = useState<string>('ALL');
  const [filterAudit, setFilterAudit] = useState<string>('ALL');
  const [filterSubsidy, setFilterSubsidy] = useState<string>('ALL');

  useEffect(() => {
    async function loadPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
      if (data.length > 0) {
        setSelectedPlot(data[0]);
      }
    }
    loadPlots();
  }, []);

  const municipalities = Array.from(new Set(plots.map((p) => p.municipality)));
  const technicians = Array.from(new Set(plots.map((p) => p.assignedTechnicianName).filter(Boolean)));

  const filteredPlots = plots.filter((p) => {
    if (filterMunicipality !== 'ALL' && p.municipality !== filterMunicipality) return false;
    if (filterTechnician !== 'ALL' && p.assignedTechnicianName !== filterTechnician) return false;
    if (filterTriage !== 'ALL' && p.triageStatus !== filterTriage) return false;
    if (filterAudit !== 'ALL' && p.auditStatus !== filterAudit) return false;
    if (filterSubsidy !== 'ALL' && p.subsidyStatus !== filterSubsidy) return false;
    return true;
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <MapIcon className="w-6 h-6 text-[#355044]" />
            <span>Mapa Operativo Geoespacial</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            Supervisión territorial de parcelas, monitoreo de Sentinel-2 y estado de auditorías in situ
          </p>
        </div>
        <div className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3.5 py-1.5 rounded-full">
          Visualizando: <span className="text-[#1B2A24] font-bold tabular-nums">{filteredPlots.length}</span> de {plots.length} parcelas
        </div>
      </div>

      {/* Recessed Clay Filter Well */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-4 sm:p-5 shadow-[inset_4px_4px_10px_rgba(107,139,120,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.85)] flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#355044] font-semibold">
          <Filter className="w-4 h-4" />
          <span>Filtros:</span>
        </div>

        {/* Municipality Filter */}
        <select
          value={filterMunicipality}
          onChange={(e) => setFilterMunicipality(e.target.value)}
          className="bg-[#D9D1B8] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-sm"
        >
          <option value="ALL">Todos los municipios</option>
          {municipalities.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Technician Filter */}
        <select
          value={filterTechnician}
          onChange={(e) => setFilterTechnician(e.target.value)}
          className="bg-[#D9D1B8] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-sm"
        >
          <option value="ALL">Todos los técnicos</option>
          {technicians.map((t) => (
            <option key={t as string} value={t as string}>{t}</option>
          ))}
        </select>

        {/* Triage Filter */}
        <select
          value={filterTriage}
          onChange={(e) => setFilterTriage(e.target.value)}
          className="bg-[#D9D1B8] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-sm"
        >
          <option value="ALL">Triage: Todos</option>
          <option value="NORMAL">Normal</option>
          <option value="ANOMALY">Alerta de anomalía</option>
          <option value="INCONCLUSIVE">No concluyente</option>
        </select>

        {/* Audit Filter */}
        <select
          value={filterAudit}
          onChange={(e) => setFilterAudit(e.target.value)}
          className="bg-[#D9D1B8] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-sm"
        >
          <option value="ALL">Auditoría: Todas</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_CURSO">En curso</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CON_INCIDENCIA">Con incidencia</option>
        </select>

        {/* Subsidy Filter */}
        <select
          value={filterSubsidy}
          onChange={(e) => setFilterSubsidy(e.target.value)}
          className="bg-[#D9D1B8] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-sm"
        >
          <option value="ALL">Subsidio: Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="APROBADO">Aprobado</option>
          <option value="RECHAZADO">Rechazado</option>
        </select>
      </div>

      {/* Main Map Workspace with Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map */}
        <div className="lg:col-span-2 rounded-[28px] overflow-hidden shadow-sm border border-[#6B8B78]/20 bg-[#EAE4D3] p-2">
          <InteractiveMap
            plots={filteredPlots}
            selectedPlotId={selectedPlot?.id}
            onSelectPlot={(p) => setSelectedPlot(p)}
            heightClass="h-[520px]"
            showFilters={false}
          />
        </div>

        {/* Selected Plot Inspection Panel */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 flex flex-col justify-between shadow-sm space-y-5">
          {selectedPlot ? (
            <div className="space-y-4">
              <div className="border-b border-[#6B8B78]/15 pb-3">
                <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
                  {selectedPlot.cadastralKey}
                </span>
                <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] mt-2">
                  {selectedPlot.beneficiaryName}
                </h3>
                <p className="text-xs text-[#6B8B78]">{selectedPlot.municipality} · {selectedPlot.region}</p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <TriageBadge status={selectedPlot.triageStatus} />
                <AuditStatusBadge status={selectedPlot.auditStatus} />
              </div>

              {/* Statistical & Server Results Card */}
              <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-2.5 text-xs shadow-inner">
                <span className="font-semibold text-[#355044] block">Resultado Bioestadístico Certificado</span>
                
                <div className="flex justify-between items-center text-[#1B2A24]">
                  <span>Supervivencia estimada:</span>
                  <span className="font-['Outfit',sans-serif] text-xl font-medium text-[#355044] tabular-nums">
                    {selectedPlot.survivalRate ? `${selectedPlot.survivalRate}%` : 'En cálculo'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#6B8B78]">
                  <span>Intervalo Confianza 95%:</span>
                  <span className="font-medium text-[#1B2A24] tabular-nums">
                    {selectedPlot.confidenceIntervalLow
                      ? `${selectedPlot.confidenceIntervalLow}% – ${selectedPlot.confidenceIntervalHigh}%`
                      : 'N/D'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#6B8B78]">
                  <span>Unidades Muestreadas:</span>
                  <span className="font-medium text-[#1B2A24] tabular-nums">
                    {selectedPlot.sampledUnitsCount || 0} circulares
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-[#6B8B78]/15 pt-2">
                  <span className="text-[#6B8B78]">Dictamen:</span>
                  <SubsidyBadge status={selectedPlot.subsidyStatus} />
                </div>
              </div>

              {/* Satellite Triage Summary */}
              <div className="rounded-2xl bg-[#F4F1EA] p-4 text-xs text-[#6B8B78] space-y-1.5 shadow-inner">
                <span className="font-semibold text-[#355044] block">Telemetría Sentinel-2:</span>
                <div className="flex justify-between">
                  <span>Variación ΔNDVI:</span>
                  <span className={`font-semibold tabular-nums ${selectedPlot.deltaNdvi && selectedPlot.deltaNdvi < 0 ? 'text-[#E0643A]' : 'text-[#355044]'}`}>
                    {selectedPlot.deltaNdvi ?? 'N/D'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Calidad Atmosférica:</span>
                  <span className="text-[#1B2A24] font-medium">{selectedPlot.satelliteQuality || 'ALTA'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-[#6B8B78] text-xs">
              Selecciona una parcela en el mapa para consultar su expediente.
            </div>
          )}

          {/* Action button */}
          {selectedPlot && (
            <div className="pt-3 border-t border-[#6B8B78]/15">
              <button
                onClick={() => navigate(`/admin/plots/${selectedPlot.id}`)}
                className="clay-btn-terracotta w-full py-3 text-xs text-white shadow-sm flex items-center justify-center gap-2"
              >
                <span>Ver expediente completo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
