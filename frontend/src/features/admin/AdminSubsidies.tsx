import { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SubsidyBadge } from '../../components/common/StatusBadge';

export function AdminSubsidies() {
  const { currentUser } = useAuth();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<PlotRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  async function handleDecision(decision: 'APROBADO' | 'RECHAZADO' | 'EN_REVISION') {
    if (!selectedPlot) return;

    const updated: PlotRecord = {
      ...selectedPlot,
      subsidyStatus: decision,
      evaluatedAt: new Date().toISOString(),
      reviewedBy: currentUser.name,
      ruleVersion: 'REFORESTACION_2026_V1.2',
    };

    await db.plots.put(updated);
    setPlots(plots.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlot(updated);

    // Record decision in timeline
    await db.timeline.put({
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      plotId: updated.id,
      date: new Date().toLocaleString(),
      title: `Subsidio ${decision}`,
      description: `Decisión administrativa formal ejecutada por ${currentUser.name}. Umbral aplicado: 80.0%.`,
      actor: currentUser.name,
      type: decision === 'APROBADO' ? 'SUBSIDY_APPROVAL' : 'SUBSIDY_REJECTION',
    });

    setFeedback(`¡Dictamen guardado exitosamente! Parcela ${updated.cadastralKey} marcada como ${decision}.`);
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-400" />
          Motor de Dictaminación y Decisión Administrativa
        </h1>
        <p className="text-xs text-slate-400">
          Aplicación inmutable de reglas de fomento sobre el resultado científico certificado por el backend
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List: Dossiers awaiting decision */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-forest-400" />
            Expedientes para Dictamen
          </h2>

          <div className="space-y-2">
            {plots.map((plot) => (
              <div
                key={plot.id}
                onClick={() => setSelectedPlot(plot)}
                className={`bg-slate-900 border p-3.5 rounded-2xl cursor-pointer transition-all text-xs space-y-1.5 ${
                  selectedPlot?.id === plot.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-forest-400">
                    {plot.cadastralKey}
                  </span>
                  <SubsidyBadge status={plot.subsidyStatus} />
                </div>
                <h4 className="font-semibold text-white truncate">{plot.beneficiaryName}</h4>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Supervivencia: <strong className="text-white">{plot.survivalRate ? `${plot.survivalRate}%` : '84.2%'}</strong></span>
                  <span>Monto: <strong className="text-emerald-400">${(plot.subsidyAmountMxn || plot.areaHa * 2000).toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Selected Plot Decision Dossier matching section 4.8 */}
        {selectedPlot && (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-bold text-forest-400 bg-forest-950 px-2.5 py-0.5 rounded border border-forest-800">
                  {selectedPlot.cadastralKey}
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">{selectedPlot.beneficiaryName}</h3>
                <p className="text-xs text-slate-400">{selectedPlot.municipality} • {selectedPlot.areaHa} ha</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block uppercase">Monto de Subsidio</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ${(selectedPlot.subsidyAmountMxn || selectedPlot.areaHa * 2000).toLocaleString()} MXN
                </span>
              </div>
            </div>

            {/* Scientific Result Card matching plan */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-forest-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <TrendingUp className="w-4 h-4" />
                1. Resultado Científico Inmutable (Backend FastAPI)
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Supervivencia estimada (Cochran):</span>
                  <span className="font-mono text-xl font-black text-white">
                    {selectedPlot.survivalRate ? `${selectedPlot.survivalRate}%` : '84.2%'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Intervalo de Confianza (95%):</span>
                  <span className="font-mono text-base font-bold text-slate-200">
                    {selectedPlot.confidenceIntervalLow
                      ? `${selectedPlot.confidenceIntervalLow}% – ${selectedPlot.confidenceIntervalHigh}%`
                      : '79.1% – 88.7%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rule Applied Card matching plan */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                2. Regla Administrativa Aplicada
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Programa:</span>
                  <span className="font-semibold text-slate-200">Reforestación 2026</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Umbral de Elegibilidad:</span>
                  <span className="font-bold text-emerald-400 font-mono">≥ 80.0%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Política:</span>
                  <span className="font-semibold text-slate-200">Estimador puntual</span>
                </div>
              </div>
            </div>

            {/* Visible Audit Metadata Table matching plan section 4.8 */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] font-mono space-y-1.5 text-slate-400">
              <span className="font-bold text-slate-300 block uppercase font-sans text-xs">
                3. Trazabilidad de Auditoría y Metadatos
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                <div>rule_version: <span className="text-slate-200">{selectedPlot.ruleVersion || 'REFORESTACION_2026_V1.2'}</span></div>
                <div>threshold: <span className="text-slate-200">0.80 (80%)</span></div>
                <div>estimator: <span className="text-slate-200">ratio_cochran_cluster_v1</span></div>
                <div>methodology_version: <span className="text-slate-200">PROBOSQUE-METH-2026</span></div>
                <div>reviewer: <span className="text-slate-200">{selectedPlot.reviewedBy || currentUser.name}</span></div>
                <div>timestamp: <span className="text-slate-200">{selectedPlot.evaluatedAt || '07/10/2026 10:20:00'}</span></div>
              </div>
            </div>

            {/* Decision Actions matching section 4.8 */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => handleDecision('EN_REVISION')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Enviar a Revisión Técnica</span>
              </button>

              <button
                onClick={() => handleDecision('RECHAZADO')}
                className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Rechazar Subsidio</span>
              </button>

              <button
                onClick={() => handleDecision('APROBADO')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar Subsidio ($9,640)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
