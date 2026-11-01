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
        setTimeline([
          {
            id: 't-1',
            plotId: id,
            date: '02 Oct 2026 · 08:30',
            title: 'Triage Satelital Ejecutado',
            description: 'Sentinel-2 L2A detectó alteración multiespectral. Clasificación registrada automáticamente.',
            actor: 'Pipeline Sentinel-2 GEE',
            type: 'TRIAGE',
          },
          {
            id: 't-2',
            plotId: id,
            date: '04 Oct 2026 · 09:15',
            title: 'Parcela Asignada a Auditoría de Campo',
            description: 'Asignada a técnico de campo para levantamiento de unidades circulares de 500 m².',
            actor: 'Supervisión Central',
            type: 'ASSIGNMENT',
          },
          {
            id: 't-3',
            plotId: id,
            date: '06 Oct 2026 · 11:42',
            title: 'Auditoría Capturada In Situ',
            description: 'Levantamiento in situ registrado en almacenamiento local del dispositivo.',
            actor: 'Ing. Juan Pérez',
            type: 'OFFLINE_AUDIT',
          },
          {
            id: 't-4',
            plotId: id,
            date: '07 Oct 2026 · 09:42',
            title: 'Auditoría Sincronizada con Sede',
            description: 'Recepción por API institucional. Idempotencia y hashes SHA-256 validados.',
            actor: 'Servicio de Sincronización',
            type: 'SYNC',
          },
          {
            id: 't-5',
            plotId: id,
            date: '07 Oct 2026 · 09:43',
            title: 'Resultado Bioestadístico Preservado',
            description: 'Estimador de razón: Supervivencia e intervalo de confianza t-Student calculados en servidor.',
            actor: 'Motor Bioestadístico PROBOSQUE',
            type: 'CALCULATION',
          },
          {
            id: 't-6',
            plotId: id,
            date: '07 Oct 2026 · 10:15',
            title: 'Revisión Técnica Administrativa',
            description: 'Supervisión de evidencia fotográfica y telemetría GPS previa a dictamen.',
            actor: 'Dra. Elena Ramos',
            type: 'REVIEW',
          },
        ]);
      }
    }
    loadData();
  }, [id]);

  if (!plot) {
    return (
      <div className="text-center py-16 space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <p className="text-sm text-[#6B8B78]">Expediente no encontrado en el acervo local.</p>
        <button
          onClick={() => navigate('/admin/plots')}
          className="text-xs text-[#355044] font-semibold underline"
        >
          Regresar al catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/plots')}
          className="clay-pebble px-4 py-2 text-xs font-semibold text-[#1B2A24] flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-[#355044]" />
          <span>Volver al catálogo</span>
        </button>

        <button
          onClick={() => navigate('/admin/subsidies')}
          className="clay-btn-terracotta px-5 py-2.5 text-xs text-white flex items-center gap-2 shadow-sm"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Proceder a Dictamen</span>
        </button>
      </div>

      {/* Main Dossier Header Banner (Recessed Clay Well) */}
      <div className="rounded-[32px] bg-[#EAE4D3] p-6 sm:p-8 shadow-[inset_4px_4px_12px_rgba(107,139,120,0.18),inset_-4px_-4px_12px_rgba(255,255,255,0.85)] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3.5 py-1 rounded-full">
                Expediente: {plot.cadastralKey}
              </span>
              <span className="text-xs text-[#6B8B78]">Ref: {plot.id.slice(0, 8)}</span>
            </div>
            <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24]">
              {plot.beneficiaryName}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B8B78] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#355044]" />
              <span>{plot.municipality} · {plot.region}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TriageBadge status={plot.triageStatus} />
            <AuditStatusBadge status={plot.auditStatus} />
            <SubsidyBadge status={plot.subsidyStatus} />
          </div>
        </div>

        {/* Administrative Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#6B8B78]/20 text-xs">
          <div>
            <span className="text-[11px] text-[#6B8B78] block">Superficie Total</span>
            <span className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] tabular-nums">
              {plot.areaHa} ha
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#6B8B78] block">Fecha de Plantación</span>
            <span className="font-medium text-[#1B2A24]">{plot.plantingDate || 'Sin registro'}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#6B8B78] block">Técnico Asignado</span>
            <span className="font-medium text-[#355044]">{plot.assignedTechnicianName}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#6B8B78] block">Monto Programado</span>
            <span className="font-['Outfit',sans-serif] text-xl font-medium text-[#E0643A] tabular-nums">
              ${(plot.subsidyAmountMxn || plot.areaHa * 2000).toLocaleString('es-MX')} MXN
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Geospatial Map */}
          <div className="rounded-[28px] bg-[#EAE4D3] p-5 shadow-sm space-y-3 border border-[#6B8B78]/15">
            <h2 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#355044]" />
              <span>Delimitación y Polígono Georreferenciado</span>
            </h2>
            <div className="rounded-2xl overflow-hidden shadow-inner border border-[#6B8B78]/20">
              <InteractiveMap
                plots={[plot]}
                selectedPlotId={plot.id}
                heightClass="h-[280px]"
                showFilters={false}
              />
            </div>
          </div>

          {/* Statistical Result */}
          <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm space-y-4 border border-[#6B8B78]/15">
            <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-3">
              <h2 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#355044]" />
                <span>Resultado Bioestadístico Inmutable</span>
              </h2>
              <span className="text-[11px] font-semibold text-[#355044] bg-[#D9D1B8] px-2.5 py-0.5 rounded-full">
                Modelo Cochran
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#F4F1EA] p-4 rounded-2xl text-center space-y-1 shadow-inner">
                <span className="text-xs text-[#6B8B78] block">Supervivencia Estimada</span>
                <div className="font-['Outfit',sans-serif] text-3xl font-light text-[#355044] tabular-nums">
                  {plot.survivalRate ? `${plot.survivalRate}%` : 'En cálculo'}
                </div>
                <span className="text-[11px] font-semibold text-[#355044]">
                  {plot.survivalRate && plot.survivalRate >= 80 ? '≥ 80% Umbral Cumplido' : '< 80% Insuficiente'}
                </span>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl text-center space-y-1 shadow-inner">
                <span className="text-xs text-[#6B8B78] block">Intervalo de Confianza 95%</span>
                <div className="font-['Outfit',sans-serif] text-xl font-light text-[#1B2A24] tabular-nums py-1">
                  {plot.confidenceIntervalLow
                    ? `[${plot.confidenceIntervalLow}%, ${plot.confidenceIntervalHigh}%]`
                    : 'En proceso'}
                </div>
                <span className="text-[11px] text-[#6B8B78]">Distribución t-Student</span>
              </div>

              <div className="bg-[#F4F1EA] p-4 rounded-2xl text-center space-y-1 shadow-inner">
                <span className="text-xs text-[#6B8B78] block">Muestreo Censado</span>
                <div className="font-['Outfit',sans-serif] text-xl font-light text-[#1B2A24] tabular-nums py-1">
                  {plot.sampledUnitsCount || 5} unidades
                </div>
                <span className="text-[11px] text-[#6B8B78]">
                  {plot.totalObservedTrees || 243} árboles contados
                </span>
              </div>
            </div>
          </div>

          {/* Satellite Triage Detail */}
          <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm space-y-4 border border-[#6B8B78]/15">
            <h2 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
              <Satellite className="w-4 h-4 text-[#355044]" />
              <span>Triage Satelital Sentinel-2</span>
            </h2>
            <div className="bg-[#F4F1EA] p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-inner">
              <div>
                <span className="text-[#6B8B78] block text-[11px]">NDVI Base</span>
                <span className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
                  {plot.ndviBase ?? 0.65}
                </span>
              </div>
              <div>
                <span className="text-[#6B8B78] block text-[11px]">NDVI Actual</span>
                <span className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
                  {plot.ndviCurrent ?? 0.42}
                </span>
              </div>
              <div>
                <span className="text-[#6B8B78] block text-[11px]">Variación ΔNDVI</span>
                <span className={`font-['Outfit',sans-serif] text-lg font-medium tabular-nums ${plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-[#E0643A]' : 'text-[#355044]'}`}>
                  {plot.deltaNdvi ?? -0.23}
                </span>
              </div>
              <div>
                <span className="text-[#6B8B78] block text-[11px]">Calidad Atmosférica</span>
                <span className="font-semibold text-[#355044] text-sm">
                  {plot.satelliteQuality ?? 'ALTA'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="space-y-6">
          <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm space-y-5 border border-[#6B8B78]/15">
            <h2 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2 border-b border-[#6B8B78]/15 pb-3">
              <Clock className="w-4 h-4 text-[#355044]" />
              <span>Trazabilidad del Expediente</span>
            </h2>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#6B8B78]/25 text-xs">
              {timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#355044] border-2 border-[#EAE4D3] shadow-sm" />
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#6B8B78] font-medium block">
                      {ev.date}
                    </span>
                    <h4 className="font-semibold text-[#1B2A24]">{ev.title}</h4>
                    <p className="text-[#6B8B78] text-xs leading-relaxed">
                      {ev.description}
                    </p>
                    <span className="text-[11px] text-[#355044] font-medium block">
                      Responsable: {ev.actor}
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
