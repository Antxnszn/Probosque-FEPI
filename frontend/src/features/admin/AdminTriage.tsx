import { useState, useEffect } from 'react';
import { Satellite, AlertTriangle, CheckCircle2, HelpCircle, Layers } from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { TriageBadge } from '../../components/common/StatusBadge';

export function AdminTriage() {
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [selectedTriagePlot, setSelectedTriagePlot] = useState<PlotRecord | null>(null);

  useEffect(() => {
    async function loadPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
      const anomaly = data.find((p) => p.triageStatus === 'ANOMALY');
      if (anomaly) setSelectedTriagePlot(anomaly);
    }
    loadPlots();
  }, []);

  async function handleSendToAudit(plot: PlotRecord) {
    const updated: PlotRecord = { ...plot, auditStatus: 'PENDIENTE' };
    await db.plots.put(updated);
    setPlots(plots.map((p) => (p.id === updated.id ? updated : p)));
    alert(`Parcela ${plot.cadastralKey} encolada prioritariamente para levantamiento en campo por técnico.`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Satellite className="w-5 h-5 text-indigo-400" />
          Triage Satelital Sentinel-2 MSI
        </h1>
        <p className="text-xs text-slate-400">
          Detección temprana multitemporal de anomalías de vigor vegetativo previo a la auditoría
        </p>
      </div>

      {/* KPI Counters matching plan section 4.6 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
            <span>NORMAL (Estabilidad)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-emerald-300 mt-2">812</div>
          <p className="text-[11px] text-slate-400 mt-1">Variación fenológica estándar</p>
        </div>

        <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold">
            <span>ANOMALY (Pérdida de Vigor)</span>
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-rose-300 mt-2">94</div>
          <p className="text-[11px] text-slate-400 mt-1">ΔNDVI &lt; -0.15 detectado</p>
        </div>

        <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>INCONCLUSIVE (Nubosidad)</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-amber-300 mt-2">62</div>
          <p className="text-[11px] text-slate-400 mt-1">Requiere nuevo paso orbital</p>
        </div>
      </div>

      {/* Detailed Triage Inspection Workspace matching plan section 4.6 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Anomaly and Triage List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-forest-400" />
            Parcelas Clasificadas con Alerta Multiespectral
          </h2>

          <div className="space-y-2.5">
            {plots.map((plot) => (
              <div
                key={plot.id}
                onClick={() => setSelectedTriagePlot(plot)}
                className={`bg-slate-900 border p-4 rounded-2xl transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs ${
                  selectedTriagePlot?.id === plot.id
                    ? 'border-forest-500 ring-2 ring-forest-500/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-forest-400 bg-forest-950/80 px-2 py-0.5 rounded border border-forest-800">
                      {plot.cadastralKey}
                    </span>
                    <span className="font-semibold text-white">{plot.beneficiaryName}</span>
                    <span className="text-slate-400">({plot.municipality})</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 text-[11px] mt-1.5 font-mono">
                    <span>NDVI Base: {plot.ndviBase ?? 0.65}</span>
                    <span>NDVI Actual: {plot.ndviCurrent ?? 0.42}</span>
                    <span>
                      ΔNDVI:{' '}
                      <strong className={plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {plot.deltaNdvi ?? -0.23}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TriageBadge status={plot.triageStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Selected Triage Card matching section 4.6 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {selectedTriagePlot ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-bold text-forest-400">
                  {selectedTriagePlot.cadastralKey}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Cambio Temporal Detectado
                </h3>
                <p className="text-slate-400 mt-0.5">{selectedTriagePlot.beneficiaryName}</p>
              </div>

              {/* Spectral Metric Details */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Variación ΔNDVI:</span>
                  <span className={`font-mono text-base font-extrabold ${selectedTriagePlot.deltaNdvi && selectedTriagePlot.deltaNdvi < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedTriagePlot.deltaNdvi ?? -0.23}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Calidad de Observación:</span>
                  <span className="font-semibold text-emerald-400">
                    {selectedTriagePlot.satelliteQuality || 'Buena (Sin nubosidad)'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Clasificación:</span>
                  <TriageBadge status={selectedTriagePlot.triageStatus} />
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-[11px]">
                  <span className="text-slate-500">Sensor:</span>
                  <span className="text-slate-300 font-mono">Sentinel-2 MSI Level-2A</span>
                </div>
              </div>

              {/* Simulated Spectral Chart / Graph Preview */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">Evolución Fenológica NDVI (2024–2026)</span>
                <div className="h-16 flex items-end gap-1.5 pt-2 border-b border-slate-800">
                  <div className="flex-1 bg-emerald-600/40 hover:bg-emerald-500 rounded-t h-[75%]" title="Jun 2024: 0.65"></div>
                  <div className="flex-1 bg-emerald-600/50 hover:bg-emerald-500 rounded-t h-[80%]" title="Nov 2024: 0.68"></div>
                  <div className="flex-1 bg-emerald-600/60 hover:bg-emerald-500 rounded-t h-[78%]" title="May 2025: 0.67"></div>
                  <div className="flex-1 bg-emerald-600/70 hover:bg-emerald-500 rounded-t h-[72%]" title="Nov 2025: 0.64"></div>
                  <div className={`flex-1 rounded-t h-[48%] ${selectedTriagePlot.triageStatus === 'ANOMALY' ? 'bg-rose-500' : 'bg-emerald-500'}`} title="Oct 2026: 0.42"></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>Jun 24</span>
                  <span>May 25</span>
                  <span>Oct 26 (Actual)</span>
                </div>
              </div>

              {/* Actions matching section 4.6 */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => alert(`Imágenes multiespectrales B04-B08 de ${selectedTriagePlot.cadastralKey} cargadas desde MinIO/GEE.`)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700"
                >
                  Ver Imágenes Satelitales
                </button>
                <button
                  onClick={() => handleSendToAudit(selectedTriagePlot)}
                  className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                >
                  Enviar a Auditoría de Campo
                </button>
              </div>

              <p className="text-[10px] text-slate-500 italic text-center">
                * Regla: No existe acción directa de aprobación de subsidio desde el triage satelital. Se requiere certificación in situ.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Selecciona una parcela para inspeccionar la evolución fenológica.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
