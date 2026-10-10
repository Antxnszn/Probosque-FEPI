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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-forest-400" />
            Catálogo y Expedientes de Parcelas
          </h1>
          <p className="text-xs text-slate-400">
            Registro censal de parcelas forestales, asignación técnica y dictamen
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total: <span className="text-forest-400 font-bold">{filtered.length}</span> parcelas
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por clave catastral, ejido o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-forest-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterTriage}
            onChange={(e) => setFilterTriage(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-forest-500"
          >
            <option value="ALL">Triage: Todos</option>
            <option value="NORMAL">NORMAL</option>
            <option value="ANOMALY">ANOMALY</option>
            <option value="INCONCLUSIVE">INCONCLUSIVE</option>
          </select>

          <select
            value={filterSubsidy}
            onChange={(e) => setFilterSubsidy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-forest-500"
          >
            <option value="ALL">Subsidio: Todos</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="APROBADO">APROBADO</option>
            <option value="RECHAZADO">RECHAZADO</option>
          </select>
        </div>
      </div>

      {/* Plots Table matching desktop-first admin requirement */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Clave Catastral</th>
                <th className="px-4 py-3">Beneficiario / Ejido</th>
                <th className="px-4 py-3">Municipio</th>
                <th className="px-4 py-3">Superficie</th>
                <th className="px-4 py-3">Triage</th>
                <th className="px-4 py-3">Auditoría</th>
                <th className="px-4 py-3">Supervivencia</th>
                <th className="px-4 py-3">Subsidio</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((plot) => (
                <tr
                  key={plot.id}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/admin/plots/${plot.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-bold text-forest-400">
                    {plot.cadastralKey}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {plot.beneficiaryName}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {plot.municipality}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {plot.areaHa} ha
                  </td>
                  <td className="px-4 py-3">
                    <TriageBadge status={plot.triageStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <AuditStatusBadge status={plot.auditStatus} />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">
                    {plot.survivalRate ? `${plot.survivalRate}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SubsidyBadge status={plot.subsidyStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/plots/${plot.id}`);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-forest-600 hover:text-white text-slate-300 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
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
