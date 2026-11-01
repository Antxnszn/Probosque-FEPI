import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Search, Eye } from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { TriageBadge, AuditStatusBadge, SubsidyBadge } from '../../components/common/StatusBadge';

export function AdminPlots() {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterTriage, setFilterTriage] = useState<string>('ALL');
  const [filterSubsidy, setFilterSubsidy] = useState<string>('ALL');

  useEffect(() => {
    async function loadPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
    }
    loadPlots();
  }, []);

  const filtered = plots.filter((p) => {
    const matchesSearch =
      p.cadastralKey.toLowerCase().includes(search.toLowerCase()) ||
      p.beneficiaryName.toLowerCase().includes(search.toLowerCase()) ||
      p.municipality.toLowerCase().includes(search.toLowerCase());
    const matchesTriage = filterTriage === 'ALL' || p.triageStatus === filterTriage;
    const matchesSubsidy = filterSubsidy === 'ALL' || p.subsidyStatus === filterSubsidy;
    return matchesSearch && matchesTriage && matchesSubsidy;
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#355044]" />
            <span>Catálogo y Expedientes de Parcelas</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            Registro censal de parcelas forestales, asignación técnica y dictaminación institucional
          </p>
        </div>
        <div className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3.5 py-1.5 rounded-full">
          Total: <span className="text-[#1B2A24] font-bold tabular-nums">{filtered.length}</span> parcelas
        </div>
      </div>

      {/* Recessed Clay Search & Filter Well */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-4 sm:p-5 shadow-[inset_4px_4px_10px_rgba(107,139,120,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.85)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-[#6B8B78] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por clave catastral, ejido o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F1EA] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#1B2A24] placeholder-[#6B8B78]/70 focus:outline-none shadow-inner"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <select
            value={filterTriage}
            onChange={(e) => setFilterTriage(e.target.value)}
            className="bg-[#D9D1B8] rounded-full px-4 py-2 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-[3px_5px_12px_rgba(27,42,36,0.06),-2px_-2px_6px_rgba(255,255,255,0.7)]"
          >
            <option value="ALL">Triage: Todos</option>
            <option value="NORMAL">Normal</option>
            <option value="ANOMALY">Alerta de anomalía</option>
            <option value="INCONCLUSIVE">No concluyente</option>
          </select>

          <select
            value={filterSubsidy}
            onChange={(e) => setFilterSubsidy(e.target.value)}
            className="bg-[#D9D1B8] rounded-full px-4 py-2 text-xs font-medium text-[#1B2A24] focus:outline-none shadow-[3px_5px_12px_rgba(27,42,36,0.06),-2px_-2px_6px_rgba(255,255,255,0.7)]"
          >
            <option value="ALL">Subsidio: Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Open Editorial Table Stream */}
      <div className="rounded-[28px] bg-[#EAE4D3]/40 border border-[#6B8B78]/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#D9D1B8]/60 text-[#355044] font-semibold border-b border-[#6B8B78]/20 text-xs">
              <tr>
                <th className="px-5 py-3.5">Clave Catastral</th>
                <th className="px-5 py-3.5">Beneficiario / Ejido</th>
                <th className="px-5 py-3.5">Municipio</th>
                <th className="px-5 py-3.5">Superficie</th>
                <th className="px-5 py-3.5">Triage</th>
                <th className="px-5 py-3.5">Auditoría</th>
                <th className="px-5 py-3.5">Supervivencia</th>
                <th className="px-5 py-3.5">Subsidio</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8B78]/15 bg-[#F4F1EA]">
              {filtered.map((plot) => (
                <tr
                  key={plot.id}
                  className="hover:bg-[#EAE4D3]/70 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/admin/plots/${plot.id}`)}
                >
                  <td className="px-5 py-4 font-semibold text-[#355044]">
                    {plot.cadastralKey}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#1B2A24]">
                    {plot.beneficiaryName}
                  </td>
                  <td className="px-5 py-4 text-[#6B8B78]">
                    {plot.municipality}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#1B2A24] tabular-nums">
                    {plot.areaHa} ha
                  </td>
                  <td className="px-5 py-4">
                    <TriageBadge status={plot.triageStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <AuditStatusBadge status={plot.auditStatus} />
                  </td>
                  <td className="px-5 py-4 font-medium text-[#1B2A24] tabular-nums">
                    {plot.survivalRate ? `${plot.survivalRate}%` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <SubsidyBadge status={plot.subsidyStatus} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/plots/${plot.id}`);
                      }}
                      className="px-3.5 py-1.5 bg-[#D9D1B8] hover:bg-[#355044] hover:text-white text-[#1B2A24] rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Expediente</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
