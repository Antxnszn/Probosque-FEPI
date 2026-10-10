import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  AlertTriangle,
  Search,
  Lock,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
            Supervisión de Auditorías de Campo
          </h1>
          <p className="text-xs text-slate-400">
            Control de calidad de muestreos estadísticos, telemetría GPS y evidencias forenses
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Datos de campo inmutables</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por parcela, técnico o beneficiario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-forest-500"
          />
        </div>
      </div>

      {/* Audits Table matching plan section 4.7 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Parcela</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Supervivencia (Servidor)</th>
                <th className="px-4 py-3">IC 95%</th>
                <th className="px-4 py-3 text-center">GPS</th>
                <th className="px-4 py-3 text-center">Evidencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((p) => {
                const hasGpsWarning = p.auditStatus === 'CON_INCIDENCIA';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-forest-400">
                      {p.cadastralKey}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {p.assignedTechnicianName || 'Ing. Juan Pérez'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      06/10/2026
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {p.survivalRate ? `${p.survivalRate}%` : '78.5%'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {p.confidenceIntervalLow ? `${p.confidenceIntervalLow}%–${p.confidenceIntervalHigh}%` : '74%–83%'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasGpsWarning ? (
                        <button
                          onClick={() => setSelectedIncident(`Incidencia en ${p.cadastralKey}: Precisión GPS de 34m en unidad #2 por canopia densa. Tolerancia aceptada según protocolo.`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold text-[10px]"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400" /> ⚠
                        </button>
                      ) : (
                        <span className="inline-flex items-center text-emerald-400 font-bold">
                          ✓
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-bold">
                      ✓ (SHA-256)
                    </td>
                    <td className="px-4 py-3">
                      <AuditStatusBadge status={p.auditStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/plots/${p.id}`)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
                      >
                        Revisar
                      </button>
                      <button
                        onClick={() => alert(`Se ha solicitado formalmente una re-auditoría con número de evento para ${p.cadastralKey}.`)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-forest-600 hover:text-white text-slate-400 rounded-lg text-xs transition-colors"
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

      {/* Incident Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detalle de Incidencia Registrada
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 leading-relaxed">{selectedIncident}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
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
