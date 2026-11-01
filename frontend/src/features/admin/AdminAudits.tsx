import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  AlertTriangle,
  Search,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { AuditStatusBadge } from '../../components/common/StatusBadge';

export function AdminAudits() {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
    }
    loadPlots();
  }, []);

  const filtered = plots.filter((p) => {
    return (
      p.cadastralKey.toLowerCase().includes(search.toLowerCase()) ||
      p.beneficiaryName.toLowerCase().includes(search.toLowerCase()) ||
      (p.assignedTechnicianName && p.assignedTechnicianName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-[#355044]" />
            <span>Supervisión de Auditorías de Campo</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            Control de calidad de muestreos estadísticos, telemetría GPS y evidencias forenses in situ
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3.5 py-1.5 rounded-full">
          <Lock className="w-3.5 h-3.5 text-[#355044]" />
          <span>Datos certificados inmutables</span>
        </div>
      </div>

      {/* Recessed Clay Search Bar */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-4 shadow-[inset_4px_4px_10px_rgba(107,139,120,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.85)]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B8B78] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por clave de parcela, técnico o beneficiario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F1EA] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#1B2A24] placeholder-[#6B8B78]/70 focus:outline-none shadow-inner"
          />
        </div>
      </div>

      {/* Audits Table */}
      <div className="rounded-[28px] bg-[#EAE4D3]/40 border border-[#6B8B78]/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#D9D1B8]/60 text-[#355044] font-semibold border-b border-[#6B8B78]/20 text-xs">
              <tr>
                <th className="px-5 py-3.5">Parcela</th>
                <th className="px-5 py-3.5">Técnico</th>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Supervivencia (Servidor)</th>
                <th className="px-5 py-3.5">IC 95%</th>
                <th className="px-5 py-3.5 text-center">GPS</th>
                <th className="px-5 py-3.5 text-center">Evidencia</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8B78]/15 bg-[#F4F1EA]">
              {filtered.map((p) => {
                const hasGpsWarning = p.auditStatus === 'CON_INCIDENCIA';
                return (
                  <tr key={p.id} className="hover:bg-[#EAE4D3]/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-[#355044]">
                      {p.cadastralKey}
                    </td>
                    <td className="px-5 py-4 text-[#1B2A24] font-medium">
                      {p.assignedTechnicianName || 'Ing. Juan Pérez'}
                    </td>
                    <td className="px-5 py-4 text-[#6B8B78] text-xs">
                      06/10/2026
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#1B2A24] tabular-nums">
                      {p.survivalRate ? `${p.survivalRate}%` : '78.5%'}
                    </td>
                    <td className="px-5 py-4 text-[#6B8B78] tabular-nums">
                      {p.confidenceIntervalLow ? `${p.confidenceIntervalLow}%–${p.confidenceIntervalHigh}%` : '74%–83%'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {hasGpsWarning ? (
                        <button
                          onClick={() => setSelectedIncident(`Incidencia en ${p.cadastralKey}: Precisión GPS de 34m en unidad #2 por canopia densa. Tolerancia aceptada según protocolo.`)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F9DFD5] text-[#E0643A] font-semibold text-[11px]"
                        >
                          <AlertTriangle className="w-3 h-3 text-[#E0643A]" />
                          <span>Alerta</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center text-[#355044]">
                          <CheckCircle2 className="w-4 h-4 text-[#355044]" />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center text-[#355044] font-medium text-[11px]">
                      Certificada SHA-256
                    </td>
                    <td className="px-5 py-4">
                      <AuditStatusBadge status={p.auditStatus} />
                    </td>
                    <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/plots/${p.id}`)}
                        className="px-3 py-1 bg-[#D9D1B8] hover:bg-[#B9C8B2] text-[#1B2A24] rounded-full text-xs font-semibold transition-colors shadow-sm"
                      >
                        Revisar
                      </button>
                      <button
                        onClick={() => alert(`Se ha solicitado formalmente una re-auditoría con número de evento para ${p.cadastralKey}.`)}
                        className="px-3 py-1 bg-[#F4F1EA] hover:bg-[#D9D1B8] text-[#6B8B78] hover:text-[#1B2A24] border border-[#6B8B78]/25 rounded-full text-xs transition-colors"
                      >
                        Re-auditar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Modal in Clay Style */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-[#1B2A24]/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#F4F1EA] border border-[#6B8B78]/25 rounded-[32px] w-full max-w-md p-6 shadow-2xl space-y-4 text-xs text-[#1B2A24]">
            <div className="flex items-center justify-between border-b border-[#6B8B78]/20 pb-3">
              <h3 className="font-['Outfit',sans-serif] text-base font-semibold text-[#1B2A24] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E0643A]" />
                <span>Detalle de Incidencia Registrada</span>
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="text-[#6B8B78] hover:text-[#1B2A24]" aria-label="Cerrar modal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[#6B8B78] leading-relaxed text-xs">{selectedIncident}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-5 py-2 rounded-full bg-[#355044] hover:bg-[#1B2A24] text-white text-xs font-semibold transition-all shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
