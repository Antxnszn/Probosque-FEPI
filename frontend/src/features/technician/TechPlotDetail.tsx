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
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-slate-400">Parcela no encontrada.</p>
        <button
          onClick={() => navigate('/app/plots')}
          className="text-xs text-forest-400 underline font-semibold"
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
    <div className="space-y-4">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/app/plots')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Regresar a la lista</span>
      </button>

      {/* Main Plot Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-forest-400 bg-forest-950/80 px-2.5 py-0.5 rounded-full border border-forest-800">
              {plot.cadastralKey}
            </span>
            <h1 className="text-xl font-extrabold text-white mt-2">{plot.beneficiaryName}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {plot.municipality} • {plot.region}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <TriageBadge status={plot.triageStatus} />
            <AuditStatusBadge status={plot.auditStatus} />
          </div>
        </div>

        {/* Geometry & Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">Superficie Total</span>
            <span className="font-bold text-white text-sm">{plot.areaHa} ha</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Fecha de Plantación</span>
            <span className="font-bold text-white text-sm">{plot.plantingDate || 'Sin registro'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Técnico Asignado</span>
            <span className="font-semibold text-slate-300">{plot.assignedTechnicianName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Subsidio Programado</span>
            <span className="font-semibold text-slate-300">{plot.subsidyStatus}</span>
          </div>
        </div>

        {/* Geospatial Map Visualization */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-forest-400" />
            Polígono Georreferenciado
          </span>
          <InteractiveMap
            plots={[plot]}
            selectedPlotId={plot.id}
            heightClass="h-[220px]"
            showFilters={false}
          />
        </div>

        {/* Informative Satellite Triage Notice (Technician cannot edit) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-400" />
              Triage Satelital de Contexto (Solo Consulta)
            </span>
            <span className="text-[10px] text-slate-500">Sentinel-2 MSI</span>
          </div>
          <p className="text-slate-400">
            {plot.triageStatus === 'ANOMALY'
              ? 'Se detectó una alteración fenológica previa al despliegue. Realiza muestreo estricto de 5 unidades circulares para verificar supervivencia in situ.'
              : 'Firma espectral uniforme. Procede con el muestreo sistemático de las unidades asignadas.'}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
            <span>NDVI Base: <strong className="text-white">{plot.ndviBase ?? 'N/D'}</strong></span>
            <span>NDVI Actual: <strong className="text-white">{plot.ndviCurrent ?? 'N/D'}</strong></span>
            <span>ΔNDVI: <strong className={plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-rose-400' : 'text-emerald-400'}>{plot.deltaNdvi ?? 'N/D'}</strong></span>
          </div>
          <p className="text-[10px] text-slate-500 italic border-t border-slate-800/80 pt-1.5">
            Nota de seguridad: Como técnico de campo, puedes consultar el triage pero no modificarlo ni autorizar subsidios.
          </p>
        </div>

        {/* Start / Resume Audit Action Button */}
        <div className="pt-2">
          <button
            onClick={handleStartOrResumeAudit}
            disabled={starting}
            className="w-full py-3.5 bg-forest-600 hover:bg-forest-500 text-white rounded-2xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>
              {starting
                ? 'Conectando sensor GPS...'
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
