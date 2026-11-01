import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Layers,
  AlertCircle,
  Play,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord, AuditRecord } from '../../types';
import { TriageBadge, AuditStatusBadge } from '../../components/common/StatusBadge';
import { InteractiveMap } from '../../components/map/InteractiveMap';
import { getCurrentGPSPosition } from '../../services/gps';

export function TechPlotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plot, setPlot] = useState<PlotRecord | null>(null);
  const [activeAudit, setActiveAudit] = useState<AuditRecord | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function loadPlot() {
      if (!id) return;
      const found = await db.plots.get(id);
      if (found) {
        setPlot(found);
      }
      // Check if audit exists for this plot
      const audit = await db.audits.where('plotId').equals(id).first();
      if (audit) {
        setActiveAudit(audit);
      }
    }
    loadPlot();
  }, [id]);

  if (!plot) {
    return (
      <div className="text-center py-12 space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <p className="text-sm text-[#6B8B78]">Parcela no encontrada en la base local.</p>
        <button
          onClick={() => navigate('/app/plots')}
          className="text-xs text-[#355044] underline font-semibold"
        >
          Regresar a mis parcelas
        </button>
      </div>
    );
  }

  async function handleStartOrResumeAudit() {
    setStarting(true);
    try {
      if (activeAudit) {
        navigate(`/app/audit/${plot!.id}`);
        return;
      }

      // Acquire initial GPS fix
      let pos = { lat: 19.2465, lon: -99.7198, accuracyM: 8.0, timestamp: new Date().toISOString() };
      try {
        pos = await getCurrentGPSPosition();
      } catch (e) {
        console.warn('GPS fix fallback:', e);
      }

      const auditId = `audit-${crypto.randomUUID().slice(0, 8)}`;
      const newAudit: AuditRecord = {
        id: auditId,
        plotId: plot!.id,
        plotCadastralKey: plot!.cadastralKey,
        technicianId: 'tech-juan-perez',
        technicianName: 'Ing. Juan Pérez',
        startedAt: new Date().toISOString(),
        status: 'EN_CURSO',
        syncStatus: 'PENDING',
        startLat: pos.lat,
        startLon: pos.lon,
        startAccuracyM: pos.accuracyM,
        geofenceValid: true,
        geofenceDistanceM: 12.4,
        hasGpsWarning: pos.accuracyM > 30,
        samplingUnits: [],
        evidenceCount: 0,
        idempotencyKey: `audit-sync-${auditId}`,
      };

      await db.audits.put(newAudit);

      // Update plot status locally
      const updatedPlot: PlotRecord = { ...plot!, auditStatus: 'EN_CURSO' };
      await db.plots.put(updatedPlot);
      setPlot(updatedPlot);

      navigate(`/app/audit/${plot!.id}`);
    } catch (err: any) {
      alert('Error al iniciar auditoría: ' + err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/app/plots')}
        className="clay-pebble px-4 py-2 text-xs font-semibold text-[#1B2A24] flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
      >
        <ArrowLeft className="w-4 h-4 text-[#355044]" />
        <span>Regresar a mis parcelas</span>
      </button>

      {/* Main Plot Header Card */}
      <div className="rounded-[32px] bg-[#EAE4D3] p-6 sm:p-8 shadow-[inset_4px_4px_12px_rgba(107,139,120,0.18),inset_-4px_-4px_12px_rgba(255,255,255,0.85)] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
              {plot.cadastralKey}
            </span>
            <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24] mt-2">
              {plot.beneficiaryName}
            </h1>
            <p className="text-xs text-[#6B8B78] flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-[#355044]" />
              <span>{plot.municipality} · {plot.region}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TriageBadge status={plot.triageStatus} />
            <AuditStatusBadge status={plot.auditStatus} />
          </div>
        </div>

        {/* Geometry & Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F1EA] p-4 rounded-2xl text-xs shadow-inner">
          <div>
            <span className="text-[11px] text-[#6B8B78] block">Superficie Total</span>
            <span className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
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
            <span className="text-[11px] text-[#6B8B78] block">Subsidio Programado</span>
            <span className="font-medium text-[#1B2A24]">{plot.subsidyStatus}</span>
          </div>
        </div>

        {/* Geospatial Map Visualization */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#1B2A24] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#355044]" />
            <span>Polígono Georreferenciado Oficial</span>
          </span>
          <div className="rounded-2xl overflow-hidden shadow-inner border border-[#6B8B78]/20">
            <InteractiveMap
              plots={[plot]}
              selectedPlotId={plot.id}
              heightClass="h-[240px]"
              showFilters={false}
            />
          </div>
        </div>

        {/* Informative Satellite Triage Notice */}
        <div className="rounded-2xl bg-[#D9D1B8]/40 border border-[#6B8B78]/15 p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1B2A24] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#355044]" />
              <span>Contexto Satelital (Informativo)</span>
            </span>
            <span className="text-[11px] text-[#6B8B78]">Sentinel-2 MSI</span>
          </div>
          <p className="text-[#6B8B78] leading-relaxed">
            {plot.triageStatus === 'ANOMALY'
              ? 'Se detectó una alteración fenológica previa al despliegue. Realiza muestreo estricto de 5 unidades circulares para verificar supervivencia in situ.'
              : 'Firma espectral uniforme. Procede con el muestreo sistemático de las unidades asignadas.'}
          </p>
          <div className="flex items-center gap-4 text-xs text-[#6B8B78] pt-1">
            <span>NDVI Base: <strong className="text-[#1B2A24]">{plot.ndviBase ?? 'N/D'}</strong></span>
            <span>NDVI Actual: <strong className="text-[#1B2A24]">{plot.ndviCurrent ?? 'N/D'}</strong></span>
            <span>ΔNDVI: <strong className={plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-[#E0643A]' : 'text-[#355044]'}>{plot.deltaNdvi ?? 'N/D'}</strong></span>
          </div>
        </div>

        {/* Start / Resume Audit Action Button */}
        <div className="pt-2">
          <button
            onClick={handleStartOrResumeAudit}
            disabled={starting}
            className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>
              {starting
                ? 'Conectando telemetría GPS...'
                : activeAudit
                ? 'Continuar Auditoría de Campo'
                : 'Iniciar Auditoría de Campo'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
