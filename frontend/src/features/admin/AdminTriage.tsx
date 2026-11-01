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
    alert(`Parcela ${plot.cadastralKey} encolada con prioridad para levantamiento in situ.`);
  }

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
          <Satellite className="w-6 h-6 text-[#355044]" />
          <span>Triage Satelital Sentinel-2 MSI</span>
        </h1>
        <p className="text-sm text-[#6B8B78] mt-1">
          Detección temprana multitemporal de anomalías de vigor vegetativo previa a la auditoría in situ
        </p>
      </div>

      {/* Open-Air KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-b border-[#6B8B78]/20">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#355044]">
            <span>Estabilidad Fenológica (Normal)</span>
            <CheckCircle2 className="w-4 h-4 text-[#355044]" />
          </div>
          <div className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-light text-[#355044] tabular-nums">
            812
          </div>
          <p className="text-xs text-[#6B8B78]">Comportamiento de copa dentro del rango</p>
        </div>

        <div className="space-y-1 border-l-0 sm:border-l border-[#6B8B78]/20 sm:pl-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[#E0643A]">
            <span>Alerta de Vigor (Anomalía)</span>
            <AlertTriangle className="w-4 h-4 text-[#E0643A]" />
          </div>
          <div className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-light text-[#E0643A] tabular-nums">
            94
          </div>
          <p className="text-xs text-[#6B8B78]">Variación ΔNDVI &lt; -0.15 detectada</p>
        </div>

        <div className="space-y-1 border-l-0 sm:border-l border-[#6B8B78]/20 sm:pl-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6B8B78]">
            <span>No Concluyente (Nubosidad)</span>
            <HelpCircle className="w-4 h-4 text-[#6B8B78]" />
          </div>
          <div className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-light text-[#1B2A24] tabular-nums">
            62
          </div>
          <p className="text-xs text-[#6B8B78]">Requiere nuevo paso orbital Sentinel-2</p>
        </div>
      </div>

      {/* Detailed Triage Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Anomaly and Triage List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#355044]" />
            <span>Parcelas Evaluadas por Análisis Multiespectral</span>
          </h2>

          <div className="space-y-3">
            {plots.map((plot) => (
              <div
                key={plot.id}
                onClick={() => setSelectedTriagePlot(plot)}
                className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs ${
                  selectedTriagePlot?.id === plot.id
                    ? 'bg-[#EAE4D3] shadow-md border-2 border-[#355044]'
                    : 'bg-[#F4F1EA] hover:bg-[#EAE4D3]/60 border border-[#6B8B78]/20 shadow-sm'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-[#355044] bg-[#D9D1B8] px-2.5 py-0.5 rounded-full">
                      {plot.cadastralKey}
                    </span>
                    <span className="font-medium text-[#1B2A24]">{plot.beneficiaryName}</span>
                    <span className="text-[#6B8B78]">({plot.municipality})</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#6B8B78] text-xs">
                    <span>NDVI Base: {plot.ndviBase ?? 0.65}</span>
                    <span>NDVI Actual: {plot.ndviCurrent ?? 0.42}</span>
                    <span>
                      ΔNDVI:{' '}
                      <strong className={plot.deltaNdvi && plot.deltaNdvi < 0 ? 'text-[#E0643A]' : 'text-[#355044]'}>
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

        {/* Right Col: Selected Triage Card */}
        <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm space-y-5 border border-[#6B8B78]/15">
          {selectedTriagePlot ? (
            <div className="space-y-5 text-xs">
              <div className="border-b border-[#6B8B78]/20 pb-3">
                <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
                  {selectedTriagePlot.cadastralKey}
                </span>
                <h3 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] mt-2">
                  Diagnóstico Multiespectral
                </h3>
                <p className="text-[#6B8B78] mt-0.5">{selectedTriagePlot.beneficiaryName}</p>
              </div>

              {/* Spectral Metric Details */}
              <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B8B78]">Variación ΔNDVI:</span>
                  <span className={`font-['Outfit',sans-serif] text-xl font-medium tabular-nums ${selectedTriagePlot.deltaNdvi && selectedTriagePlot.deltaNdvi < 0 ? 'text-[#E0643A]' : 'text-[#355044]'}`}>
                    {selectedTriagePlot.deltaNdvi ?? -0.23}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#6B8B78]">Calidad Atmosférica:</span>
                  <span className="font-semibold text-[#355044]">
                    {selectedTriagePlot.satelliteQuality || 'Buena (Sin nubosidad)'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#6B8B78]">Diagnóstico:</span>
                  <TriageBadge status={selectedTriagePlot.triageStatus} />
                </div>

                <div className="flex justify-between items-center border-t border-[#6B8B78]/15 pt-2 text-xs">
                  <span className="text-[#6B8B78]">Sensor:</span>
                  <span className="text-[#1B2A24] font-medium">Sentinel-2 MSI L2A</span>
                </div>
              </div>

              {/* Simulated Spectral Evolution Chart */}
              <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-2 shadow-inner">
                <span className="text-xs font-semibold text-[#1B2A24] block">
                  Evolución Fenológica NDVI (2024–2026)
                </span>
                <div className="h-20 flex items-end gap-2 pt-3 border-b border-[#6B8B78]/20">
                  <div className="flex-1 bg-[#B9C8B2] hover:bg-[#355044] rounded-t h-[75%] transition-all" title="Jun 2024: 0.65" />
                  <div className="flex-1 bg-[#B9C8B2] hover:bg-[#355044] rounded-t h-[80%] transition-all" title="Nov 2024: 0.68" />
                  <div className="flex-1 bg-[#B9C8B2] hover:bg-[#355044] rounded-t h-[78%] transition-all" title="May 2025: 0.67" />
                  <div className="flex-1 bg-[#B9C8B2] hover:bg-[#355044] rounded-t h-[72%] transition-all" title="Nov 2025: 0.64" />
                  <div
                    className={`flex-1 rounded-t h-[48%] transition-all ${
                      selectedTriagePlot.triageStatus === 'ANOMALY' ? 'bg-[#E0643A]' : 'bg-[#355044]'
                    }`}
                    title="Oct 2026: 0.42"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#6B8B78]">
                  <span>Jun 2024</span>
                  <span>May 2025</span>
                  <span>Oct 2026</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => alert(`Bandas B04-B08 de ${selectedTriagePlot.cadastralKey} cargadas desde el almacenamiento satelital.`)}
                  className="w-full py-2.5 bg-[#D9D1B8] hover:bg-[#B9C8B2] text-[#1B2A24] rounded-full text-xs font-semibold transition-all shadow-sm"
                >
                  Ver Imágenes Satelitales
                </button>
                <button
                  onClick={() => handleSendToAudit(selectedTriagePlot)}
                  className="clay-btn-terracotta w-full py-2.5 text-xs text-white shadow-sm"
                >
                  Enviar a Auditoría de Campo
                </button>
              </div>

              <p className="text-[11px] text-[#6B8B78] italic text-center">
                * Regla institucional: El triage satelital orienta la visita de campo pero no autoriza subsidios por sí solo.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 text-[#6B8B78] text-xs">
              Selecciona una parcela para inspeccionar la evolución fenológica.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
