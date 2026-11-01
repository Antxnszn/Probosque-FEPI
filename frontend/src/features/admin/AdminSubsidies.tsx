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
      description: `Decisión administrativa formal registrada por ${currentUser.name}. Umbral aplicado: 80.0%.`,
      actor: currentUser.name,
      type: decision === 'APROBADO' ? 'SUBSIDY_APPROVAL' : 'SUBSIDY_REJECTION',
    });

    setFeedback(`Dictamen formal registrado con éxito para la parcela ${updated.cadastralKey}.`);
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
          <FileCheck2 className="w-6 h-6 text-[#355044]" />
          <span>Dictaminación y Evaluación de Subsidios</span>
        </h1>
        <p className="text-sm text-[#6B8B78] mt-1">
          Aplicación institucional de reglas de fomento sobre el resultado bioestadístico inmutable
        </p>
      </div>

      {feedback && (
        <div className="p-4 bg-[#B9C8B2]/50 border border-[#355044]/30 rounded-2xl text-xs text-[#1B2A24] flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[#355044]" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* Main Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left List: Dossiers awaiting decision */}
        <div className="space-y-4">
          <h2 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#355044]" />
            <span>Expedientes Asignados</span>
          </h2>

          <div className="space-y-3">
            {plots.map((plot) => (
              <div
                key={plot.id}
                onClick={() => setSelectedPlot(plot)}
                className={`p-4 rounded-2xl cursor-pointer transition-all text-xs space-y-2 ${
                  selectedPlot?.id === plot.id
                    ? 'bg-[#EAE4D3] shadow-md border-2 border-[#355044]'
                    : 'bg-[#F4F1EA] hover:bg-[#EAE4D3]/60 border border-[#6B8B78]/20 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#355044] bg-[#D9D1B8] px-2.5 py-0.5 rounded-full">
                    {plot.cadastralKey}
                  </span>
                  <SubsidyBadge status={plot.subsidyStatus} />
                </div>
                <h4 className="font-semibold text-[#1B2A24] truncate">{plot.beneficiaryName}</h4>
                <div className="flex justify-between text-xs text-[#6B8B78]">
                  <span>Supervivencia: <strong className="text-[#1B2A24]">{plot.survivalRate ? `${plot.survivalRate}%` : '84.2%'}</strong></span>
                  <span>Monto: <strong className="text-[#355044] font-medium">${(plot.subsidyAmountMxn || plot.areaHa * 2000).toLocaleString('es-MX')}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Selected Plot Decision Dossier */}
        {selectedPlot && (
          <div className="lg:col-span-2 rounded-[32px] bg-[#EAE4D3] p-6 sm:p-8 shadow-[inset_4px_4px_12px_rgba(107,139,120,0.18),inset_-4px_-4px_12px_rgba(255,255,255,0.85)] space-y-6">
            <div className="border-b border-[#6B8B78]/20 pb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
                  {selectedPlot.cadastralKey}
                </span>
                <h3 className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24] mt-2">
                  {selectedPlot.beneficiaryName}
                </h3>
                <p className="text-xs text-[#6B8B78]">{selectedPlot.municipality} · {selectedPlot.areaHa} ha</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#6B8B78] block">Monto de Subsidio</span>
                <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#E0643A] tabular-nums">
                  ${(selectedPlot.subsidyAmountMxn || selectedPlot.areaHa * 2000).toLocaleString('es-MX')} MXN
                </span>
              </div>
            </div>

            {/* Scientific Result Card */}
            <div className="rounded-2xl bg-[#F4F1EA] p-5 space-y-3 shadow-inner text-xs">
              <span className="font-semibold text-[#355044] flex items-center gap-2 text-xs">
                <TrendingUp className="w-4 h-4 text-[#355044]" />
                <span>1. Certificación Bioestadística Inmutable</span>
              </span>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[#6B8B78] block text-[11px]">Supervivencia estimada (Cochran):</span>
                  <span className="font-['Outfit',sans-serif] text-2xl font-medium text-[#355044] tabular-nums">
                    {selectedPlot.survivalRate ? `${selectedPlot.survivalRate}%` : '84.2%'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B8B78] block text-[11px]">Intervalo de Confianza (95%):</span>
                  <span className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
                    {selectedPlot.confidenceIntervalLow
                      ? `${selectedPlot.confidenceIntervalLow}% – ${selectedPlot.confidenceIntervalHigh}%`
                      : '79.1% – 88.7%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rule Applied Card */}
            <div className="rounded-2xl bg-[#F4F1EA] p-5 space-y-3 shadow-inner text-xs">
              <span className="font-semibold text-[#355044] flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#355044]" />
                <span>2. Parámetros de la Regla Institucional</span>
              </span>
              <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-[#6B8B78] block text-[11px]">Programa Forestal:</span>
                  <span className="font-medium text-[#1B2A24]">Reforestación Integral 2026</span>
                </div>
                <div>
                  <span className="text-[#6B8B78] block text-[11px]">Umbral de Elegibilidad:</span>
                  <span className="font-semibold text-[#355044]">≥ 80.0% supervivencia</span>
                </div>
                <div>
                  <span className="text-[#6B8B78] block text-[11px]">Criterio de Evaluación:</span>
                  <span className="font-medium text-[#1B2A24]">Estimador puntual de razón</span>
                </div>
              </div>
            </div>

            {/* Audit Metadata Table */}
            <div className="rounded-2xl bg-[#D9D1B8]/40 p-4 border border-[#6B8B78]/20 text-xs space-y-2">
              <span className="font-semibold text-[#355044] block">
                3. Trazabilidad y Metadatos del Dictamen
              </span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-[#6B8B78]">
                <div>Versión de regla: <strong className="text-[#1B2A24]">{selectedPlot.ruleVersion || 'REFORESTACION_2026_V1.2'}</strong></div>
                <div>Umbral normativo: <strong className="text-[#1B2A24]">80% supervivencia</strong></div>
                <div>Metodología de campo: <strong className="text-[#1B2A24]">PROBOSQUE-METH-2026</strong></div>
                <div>Auditor / Supervisor: <strong className="text-[#1B2A24]">{selectedPlot.reviewedBy || currentUser.name}</strong></div>
              </div>
            </div>

            {/* Decision Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => handleDecision('EN_REVISION')}
                className="clay-pebble px-4 py-2.5 text-xs font-semibold text-[#1B2A24] flex items-center gap-1.5 hover:-translate-y-0.5 transition-transform"
              >
                <AlertCircle className="w-4 h-4 text-[#6B8B78]" />
                <span>Solicitar Revisión Técnica</span>
              </button>

              <button
                onClick={() => handleDecision('RECHAZADO')}
                className="px-4 py-2.5 bg-[#F9DFD5] hover:bg-[#F2845C]/30 text-[#E0643A] rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                <span>Rechazar Subsidio</span>
              </button>

              <button
                onClick={() => handleDecision('APROBADO')}
                className="clay-btn-terracotta px-6 py-2.5 text-xs text-white flex items-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar Dictamen de Subsidio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
