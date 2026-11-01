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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-forest-400" />
            Mapa Operativo Geoespacial de Supervisión
          </h1>
          <p className="text-xs text-slate-400">
            Monitoreo en tiempo real de parcelas, capas de Sentinel-2 y estado de auditorías
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          Visualizando: <span className="text-forest-400 font-bold">{filteredPlots.length}</span> de {plots.length} parcelas
        </div>
      </div>

      {/* Filter Row matching section 4.4 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold">
          <Filter className="w-3.5 h-3.5 text-forest-400" />
          <span>Filtros:</span>
        </div>

        {/* Municipality Filter */}
        <select
          value={filterMunicipality}
          onChange={(e) => setFilterMunicipality(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-forest-500"
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
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-forest-500"
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
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-forest-500"
        >
          <option value="ALL">Triage: Todos</option>
          <option value="NORMAL">NORMAL</option>
          <option value="ANOMALY">ANOMALY</option>
          <option value="INCONCLUSIVE">INCONCLUSIVE</option>
        </select>

        {/* Audit Filter */}
        <select
          value={filterAudit}
          onChange={(e) => setFilterAudit(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-forest-500"
        >
          <option value="ALL">Auditoría: Todas</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="EN_CURSO">EN CURSO</option>
          <option value="COMPLETADA">COMPLETADA</option>
          <option value="CON_INCIDENCIA">CON INCIDENCIA</option>
        </select>

        {/* Subsidy Filter */}
        <select
          value={filterSubsidy}
          onChange={(e) => setFilterSubsidy(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-forest-500"
        >
          <option value="ALL">Subsidio: Todos</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="APROBADO">APROBADO</option>
          <option value="RECHAZADO">RECHAZADO</option>
        </select>
      </div>

      {/* Main Map Workspace with Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Map */}
        <div className="lg:col-span-2">
          <InteractiveMap
            plots={filteredPlots}
            selectedPlotId={selectedPlot?.id}
            onSelectPlot={(p) => setSelectedPlot(p)}
            heightClass="h-[520px]"
            showFilters={false}
          />
        </div>

        {/* Selected Plot Inspection Panel matching section 4.4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl space-y-4">
          {selectedPlot ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-forest-400 bg-forest-950/80 px-2.5 py-0.5 rounded border border-forest-800">
                    {selectedPlot.cadastralKey}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{selectedPlot.beneficiaryName}</h3>
                  <p className="text-xs text-slate-400">{selectedPlot.municipality} • {selectedPlot.region}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2">
                <TriageBadge status={selectedPlot.triageStatus} />
                <AuditStatusBadge status={selectedPlot.auditStatus} />
              </div>

              {/* Statistical & Server Results Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">Resultado Bioestadístico (Servidor)</span>
                
                <div className="flex justify-between items-center text-slate-300">
                  <span>Supervivencia estimada:</span>
                  <span className="font-bold text-base text-forest-400 font-mono">
                    {selectedPlot.survivalRate ? `${selectedPlot.survivalRate}%` : 'En espera'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Intervalo Confianza 95%:</span>
                  <span className="font-mono text-slate-200">
                    {selectedPlot.confidenceIntervalLow
                      ? `${selectedPlot.confidenceIntervalLow}% – ${selectedPlot.confidenceIntervalHigh}%`
                      : 'N/D'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Unidades Muestreadas:</span>
                  <span className="font-mono text-white">
                    {selectedPlot.sampledUnitsCount || 0} circulares
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-1.5">
                  <span>Dictamen de Subsidio:</span>
                  <SubsidyBadge status={selectedPlot.subsidyStatus} />
                </div>
              </div>

              {/* Satellite Triage Summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-indigo-300 block">Telemetría Sentinel-2:</span>
                <div className="flex justify-between">
                  <span>ΔNDVI fenológico:</span>
                  <span className={`font-mono font-bold ${selectedPlot.deltaNdvi && selectedPlot.deltaNdvi < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedPlot.deltaNdvi ?? 'N/D'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Calidad de observación:</span>
                  <span className="text-slate-200">{selectedPlot.satelliteQuality || 'ALTA'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Selecciona una parcela en el mapa para consultar su expediente.
            </div>
          )}

          {/* Action button: Ver Expediente */}
          {selectedPlot && (
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => navigate(`/admin/plots/${selectedPlot.id}`)}
                className="w-full py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
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
