import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ClipboardCheck,
  AlertTriangle,
  FileCheck2,
  Map as MapIcon,
  Satellite,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<PlotRecord[]>([]);

  useEffect(() => {
    async function loadPlots() {
      const data = await db.plots.toArray();
      setPlots(data);
    }
    loadPlots();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-forest-400">
            Dirección General de Auditoría y Fomento Forestal
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Tablero de Supervisión y Control Operativo
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Consolidado general de triage satelital Sentinel-2, auditorías de campo y dictamen de subsidios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/map')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <MapIcon className="w-4 h-4 text-forest-400" />
            <span>Ver Mapa Operativo</span>
          </button>
          <button
            onClick={() => navigate('/admin/subsidies')}
            className="flex items-center gap-2 px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Decisión de Subsidios</span>
          </button>
        </div>
      </div>

      {/* Main KPI Row matching plan section 4.3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Parcelas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parcelas Totales</span>
            <div className="w-8 h-8 rounded-xl bg-forest-950 border border-forest-800/80 flex items-center justify-center text-forest-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-3">1,248</div>
          <p className="text-[11px] text-slate-500 mt-1">Superficie censada: 5,420 ha</p>
        </div>

        {/* KPI 2: Auditorías */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Auditorías</span>
            <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-100 mt-3">876</div>
          <p className="text-[11px] text-blue-400/70 mt-1">70.2% de cobertura de campo</p>
        </div>

        {/* KPI 3: Anomalías Satelitales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Anomalías</span>
            <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-200 mt-3">94</div>
          <p className="text-[11px] text-rose-400/80 mt-1">Alertas fenológicas ΔNDVI</p>
        </div>

        {/* KPI 4: Subsidios Elegibles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Subsidios Aprobados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-200 mt-3">721</div>
          <p className="text-[11px] text-emerald-400/70 mt-1">$1.44M MXN ejercidos</p>
        </div>
      </div>

      {/* Breakdown Triad Columns matching plan section 4.3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Estado de Parcelas (Triage) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Satellite className="w-4 h-4 text-forest-400" />
              Estado de Parcelas (Triage)
            </h3>
            <button
              onClick={() => navigate('/admin/triage')}
              className="text-[11px] text-forest-400 hover:underline font-semibold"
            >
              Detalle →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> NORMAL
              </span>
              <span className="font-mono font-bold text-white">812</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2 font-medium text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span> ANOMALY
              </span>
              <span className="font-mono font-bold text-white">94</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2 font-medium text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> INCONCLUSIVE
              </span>
              <span className="font-mono font-bold text-white">62</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2 font-medium text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> PENDIENTE
              </span>
              <span className="font-mono font-bold text-white">280</span>
            </div>
          </div>
        </div>

        {/* Col 2: Estado de Auditorías */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
              Estado de Auditorías
            </h3>
            <button
              onClick={() => navigate('/admin/audits')}
              className="text-[11px] text-blue-400 hover:underline font-semibold"
            >
              Auditorías →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Pendientes de levantar</span>
              <span className="font-mono font-bold text-white">213</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-purple-400 font-medium">En revisión técnica</span>
              <span className="font-mono font-bold text-white">45</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-medium">Completadas con éxito</span>
              <span className="font-mono font-bold text-white">618</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-medium">Con incidencias GPS / canopia</span>
              <span className="font-mono font-bold text-amber-300">21</span>
            </div>
          </div>
        </div>

        {/* Col 3: Estado de Subsidios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Decisión de Subsidios
            </h3>
            <button
              onClick={() => navigate('/admin/subsidies')}
              className="text-[11px] text-emerald-400 hover:underline font-semibold"
            >
              Dictaminar →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-medium">Elegibles (Supervivencia &ge; 80%)</span>
              <span className="font-mono font-bold text-white">721</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-rose-400 font-medium">No elegibles (&lt; 80%)</span>
              <span className="font-mono font-bold text-white">88</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-medium">Pendientes de decisión / firma</span>
              <span className="font-mono font-bold text-amber-300">67</span>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Tasa de aprobación regional</span>
              <span className="font-mono font-bold text-emerald-400">89.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-forest-400" />
          Expedientes Clave en Espera de Dictamen
        </h3>
        <div className="space-y-2">
          {plots.slice(0, 3).map((plot) => (
            <div
              key={plot.id}
              onClick={() => navigate(`/admin/plots/${plot.id}`)}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-forest-400">{plot.cadastralKey}</span>
                  <span className="font-semibold text-white">{plot.beneficiaryName}</span>
                  <span className="text-slate-500 font-normal">({plot.municipality})</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                  <span>Triage: <strong className={plot.triageStatus === 'ANOMALY' ? 'text-rose-400' : 'text-emerald-400'}>{plot.triageStatus}</strong></span>
                  <span>Supervivencia: <strong className="text-white">{plot.survivalRate ? `${plot.survivalRate}%` : 'En cálculo'}</strong></span>
                  <span>IC 95%: <strong className="text-slate-300">{plot.confidenceIntervalLow ? `${plot.confidenceIntervalLow}%–${plot.confidenceIntervalHigh}%` : 'N/D'}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${plot.subsidyStatus === 'APROBADO' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}`}>
                  {plot.subsidyStatus}
                </span>
                <span className="text-forest-400 text-xs font-semibold flex items-center gap-1">
                  Expediente <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
