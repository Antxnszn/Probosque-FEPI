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
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header and Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#355044]" />
            <span>Mis Parcelas Asignadas</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            {plots.length} predios registrados para levantamiento y muestreo forestal
          </p>
        </div>

        <button
          onClick={() => navigate('/app/plots/new')}
          className="clay-btn-terracotta px-5 py-2.5 text-xs text-white flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Delimitar Parcela en Mapa</span>
        </button>
      </div>

      {/* Recessed Clay Search & Filter Well */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-5 shadow-[inset_4px_4px_10px_rgba(107,139,120,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.85)] space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B8B78] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por clave catastral, ejido o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F1EA] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#1B2A24] placeholder-[#6B8B78]/70 focus:outline-none shadow-inner"
          />
        </div>

        {/* Filter Pebbles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Todas las parcelas' },
            { id: 'PENDIENTE', label: 'Pendientes' },
            { id: 'EN_CURSO', label: 'En progreso' },
            { id: 'COMPLETADA', label: 'Completadas' },
            { id: 'CON_INCIDENCIA', label: 'Con incidencia' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                filter === f.id
                  ? 'bg-[#355044] text-white shadow-md'
                  : 'bg-[#D9D1B8] text-[#1B2A24] hover:bg-[#B9C8B2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plot Cards List in Tactile Clay */}
      <div className="space-y-4">
        {filteredPlots.length === 0 ? (
          <div className="text-center py-12 rounded-[28px] bg-[#EAE4D3]/50 border border-dashed border-[#6B8B78]/30">
            <Trees className="w-10 h-10 text-[#6B8B78] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1B2A24]">No se encontraron parcelas</p>
            <p className="text-xs text-[#6B8B78] mt-0.5">Prueba cambiando el filtro o la búsqueda</p>
          </div>
        ) : (
          filteredPlots.map((plot) => (
            <div
              key={plot.id}
              className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-5 sm:p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
                    {plot.cadastralKey}
                  </span>
                  <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] mt-1.5">
                    {plot.beneficiaryName}
                  </h3>
                  <p className="text-xs text-[#6B8B78]">{plot.municipality} · {plot.region}</p>
                </div>
                <TriageBadge status={plot.triageStatus} />
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#F4F1EA] p-3.5 rounded-2xl text-center text-xs shadow-inner">
                <div>
                  <span className="text-[11px] text-[#6B8B78] block">Superficie</span>
                  <span className="font-semibold text-[#1B2A24] tabular-nums">{plot.areaHa} ha</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B8B78] block">Auditoría</span>
                  <span className="font-semibold text-[#355044]">{plot.auditStatus}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B8B78] block">Subsidio</span>
                  <span className="font-semibold text-[#1B2A24]">{plot.subsidyStatus}</span>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="flex items-center justify-between pt-2 border-t border-[#6B8B78]/20">
                <AuditStatusBadge status={plot.auditStatus} />
                <button
                  onClick={() => navigate(`/app/plots/${plot.id}`)}
                  className="clay-pebble px-5 py-2 text-xs font-semibold text-[#1B2A24] flex items-center gap-1.5 hover:-translate-y-0.5 transition-transform"
                >
                  <span>Ver parcela</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#355044]" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
