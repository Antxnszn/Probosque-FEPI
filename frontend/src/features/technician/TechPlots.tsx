import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, ArrowRight, Trees } from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { TriageBadge, AuditStatusBadge } from '../../components/common/StatusBadge';

export function TechPlots() {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'CON_INCIDENCIA'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
    }
    fetchPlots();
  }, []);

  const filteredPlots = plots.filter((p) => {
    const matchesFilter = filter === 'ALL' || p.auditStatus === filter;
    const matchesSearch =
      p.cadastralKey.toLowerCase().includes(search.toLowerCase()) ||
      p.beneficiaryName.toLowerCase().includes(search.toLowerCase()) ||
      p.municipality.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-forest-400" />
            Mis Parcelas Asignadas
          </h1>
          <p className="text-xs text-slate-400">
            {plots.length} parcelas registradas para levantamiento forestal
          </p>
        </div>

        <button
          onClick={() => navigate('/app/plots/new')}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Delimitar Parcela en Mapa</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por clave catastral, ejido o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-forest-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDIENTE', label: 'Pendientes' },
            { id: 'EN_CURSO', label: 'En progreso' },
            { id: 'COMPLETADA', label: 'Completadas' },
            { id: 'CON_INCIDENCIA', label: 'Con incidencia' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-forest-600 text-white font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plot Cards List */}
      <div className="space-y-3">
        {filteredPlots.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <Trees className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No se encontraron parcelas</p>
            <p className="text-xs text-slate-500 mt-0.5">Prueba cambiando el filtro o la búsqueda</p>
          </div>
        ) : (
          filteredPlots.map((plot) => (
            <div
              key={plot.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all shadow-md space-y-3"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-forest-400 bg-forest-950/80 px-2 py-0.5 rounded border border-forest-800">
                    {plot.cadastralKey}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{plot.beneficiaryName}</h3>
                  <p className="text-xs text-slate-400">{plot.municipality} • {plot.region}</p>
                </div>
                <TriageBadge status={plot.triageStatus} />
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Superficie</span>
                  <span className="font-bold text-slate-200">{plot.areaHa} ha</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Auditoría</span>
                  <span className="font-semibold text-forest-400">{plot.auditStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Subsidio</span>
                  <span className="font-semibold text-slate-300">{plot.subsidyStatus}</span>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <AuditStatusBadge status={plot.auditStatus} />
                <button
                  onClick={() => navigate(`/app/plots/${plot.id}`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  <span>Ver parcela</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
