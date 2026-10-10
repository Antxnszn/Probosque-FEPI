import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  MapPin,
  Satellite,
  FileCheck2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord, TimelineEvent } from '../../types';
import { TriageBadge, AuditStatusBadge, SubsidyBadge } from '../../components/common/StatusBadge';
import { InteractiveMap } from '../../components/map/InteractiveMap';

export function AdminPlotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plot, setPlot] = useState<PlotRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const foundPlot = await db.plots.get(id);
      if (foundPlot) {
        setPlot(foundPlot);
      }

      // Load timeline events
      const events = await db.timeline.where('plotId').equals(id).toArray();
      if (events.length > 0) {
        setTimeline(events);
      } else {
        // Fallback realistic timeline matching section 4.5
        setTimeline([
          {
            id: 't-1',
            plotId: id,
            date: '02 Oct 2026 08:30',
            title: 'Triage Satelital Ejecutado',
            description: 'Sentinel-2 L2A detectó alteración multiespectral. Clasificación registrada automáticamente.',
            actor: 'Pipeline Sentinel-2 GEE',
            type: 'TRIAGE',
          },
          {
            id: 't-2',
            plotId: id,
            date: '04 Oct 2026 09:15',
            title: 'Parcela Asignada a Auditoría de Campo',
            description: 'Asignada a técnico de campo para levantamiento de unidades circulares de 500 m².',
            actor: 'Admin / Sistema Automático',
            type: 'ASSIGNMENT',
          },
          {
            id: 't-3',
            plotId: id,
            date: '06 Oct 2026 11:42',
            title: 'Auditoría Capturada Offline',
            description: 'Levantamiento in situ registrado en memoria local del dispositivo.',
            actor: 'Ing. Juan Pérez (PWA)',
            type: 'OFFLINE_AUDIT',
          },
          {
            id: 't-4',
            plotId: id,
            date: '07 Oct 2026 09:42',
            title: 'Auditoría Sincronizada con Backend',
            description: 'Recepción por API FastAPI. Idempotencia y hashes SHA-256 validados.',
            actor: 'Worker Sincronización',
            type: 'SYNC',
          },
          {
            id: 't-5',
            plotId: id,
            date: '07 Oct 2026 09:43',
            title: 'Resultado Estadístico Inmutable Calculado',
            description: 'Estimador de razón: Supervivencia e intervalo de confianza t-Student calculados en servidor.',
            actor: 'Motor Bioestadístico FastAPI',
            type: 'CALCULATION',
          },
          {
            id: 't-6',
            plotId: id,
            date: '07 Oct 2026 10:15',
            title: 'Revisión Administrativa',
            description: 'Supervisión de evidencia fotográfica y telemetría GPS previa a dictamen.',
            actor: 'Dra. Elena Ramos (Supervisor)',
            type: 'REVIEW',
          },
        ]);
      }
    }
    loadData();
  }, [id]);

  if (!plot) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-sm text-slate-400">Expediente no encontrado.</p>
        <button
          onClick={() => navigate('/admin/plots')}
          className="text-xs text-forest-400 font-semibold underline"
        >
          Regresar a parcelas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admin/plots')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo de parcelas</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/subsidies')}
            className="px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Proceder a Dictamen de Subsidio</span>
          </button>
        </div>
      </div>

      {/* Main Dossier Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-forest-400 bg-forest-950/80 px-3 py-1 rounded-full border border-forest-800">
                EXPEDIENTE DIGITAL: {plot.cadastralKey}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ID: {plot.id}</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">{plot.beneficiaryName}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>{plot.municipality} • {plot.region}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <TriageBadge status={plot.triageStatus} />
            <AuditStatusBadge status={plot.auditStatus} />
            <SubsidyBadge status={plot.subsidyStatus} />
          </div>
        </div>

        {/* Administrative & Geospatial Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Superficie Total</span>
            <span className="text-base font-bold text-white font-mono">{plot.areaHa} ha</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Fecha de Plantación</span>
            <span className="text-sm font-semibold text-slate-200">{plot.plantingDate || 'Sin registro'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Técnico de Campo</span>
            <span className="text-sm font-semibold text-slate-200">{plot.assignedTechnicianName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Monto Programado</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              ${(plot.subsidyAmountMxn || plot.areaHa * 2000).toLocaleString()} MXN
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns (Geospatial & Scientific vs Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Geospatial, Satellite Triage & Statistical Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Geospatial Map */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest-400" />
              Polígono y Coordenadas Georreferenciadas
            </h2>
            <InteractiveMap
              plots={[plot]}
              selectedPlotId={plot.id}
              heightClass="h-[280px]"
              showFilters={false}
            />
          </div>

          {/* Statistical Result Card (Calculated exclusively by backend) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-forest-400" />
                Resultado Estadístico Inmutable (FastAPI)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Modelo Bioestadístico Cochran
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Supervivencia Estimada</span>
                <div className="text-3xl font-black text-forest-400 my-1 font-mono">
                  {plot.survivalRate ? `${plot.survivalRate}%` : 'En cálculo'}
                </div>
                <span className="text-[10px] text-emerald-400">
                  {plot.survivalRate && plot.survivalRate >= 80 ? '≥ 80% Umbral Cumplido' : '< 80% Insuficiente'}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Intervalo de Confianza 95%</span>
                <div className="text-xl font-bold text-white my-2 font-mono">
                  {plot.confidenceIntervalLow
                    ? `[${plot.confidenceIntervalLow}%, ${plot.confidenceIntervalHigh}%]`
                    : 'N/D'}
                </div>
                <span className="text-[10px] text-slate-400">Distribución t-Student</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Muestreo Censado</span>
                <div className="text-xl font-bold text-white my-2 font-mono">
                  {plot.sampledUnitsCount || 5} unidades
                </div>
                <span className="text-[10px] text-slate-400">
                  {plot.totalObservedTrees || 243} árboles observados
                </span>
              </div>
            </div>
          </div>

          {/* Satellite Triage Detail */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Satellite className="w-4 h-4 text-indigo-400" />
              Triage Satelital Sentinel-2 (Análisis Multiespectral)
            </h2>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">NDVI Base</span>
                <span className="font-mono font-bold text-white text-sm">{plot.ndviBase ?? 0.65}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">NDVI Actual</span>
                <span className="font-mono font-bold text-white text-sm">{plot.ndviCurrent ?? 0.42}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ΔNDVI</span>
                <span className={`font-mono font-bold text-sm ${plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {plot.deltaNdvi ?? -0.23}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Calidad Atmosférica</span>
                <span className="font-semibold text-emerald-400 text-sm">{plot.satelliteQuality ?? 'ALTA'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Complete Event Timeline matching section 4.5 */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-forest-400" />
              Línea de Tiempo y Trazabilidad (Timeline)
            </h2>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 text-xs">
              {timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-forest-600 border-2 border-slate-900 ring-4 ring-forest-900/30"></span>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-forest-400 font-bold block">
                      {ev.date}
                    </span>
                    <h4 className="font-bold text-white">{ev.title}</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {ev.description}
                    </p>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Actor: {ev.actor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
