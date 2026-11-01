import { Smartphone, Layers, CheckCircle2, AlertTriangle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function TechProfile() {
  const { currentUser, switchRole } = useAuth();

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* User Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-600/20 border border-forest-500/40 flex items-center justify-center text-forest-400 font-bold text-xl">
            JP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{currentUser.name}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                Activo
              </span>
            </div>
            <p className="text-xs text-slate-400">{currentUser.email}</p>
            <p className="text-[11px] text-forest-400 font-medium mt-0.5">Técnico Forestal Operativo</p>
          </div>
        </div>

        {/* Device & Profile Stats Grid matching section 4.10 */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Dispositivo Registrado
            </span>
            <p className="font-semibold text-white">{currentUser.deviceModel || 'Samsung Galaxy A15'}</p>
            <span className="text-[10px] text-slate-500">Android 14 • Sensor GNSS Habilitado</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-forest-400" />
              Última Sincronización
            </span>
            <p className="font-semibold text-white">{currentUser.lastSyncAt || '07/10/2026 14:32'}</p>
            <span className="text-[10px] text-emerald-400">Canal TLS 1.3 / FastAPI</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Parcelas Asignadas
            </span>
            <p className="text-xl font-bold text-white">{currentUser.assignedPlotsCount || 4}</p>
            <span className="text-[10px] text-slate-500">Valle de Toluca y Bravo</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Auditorías Completadas
            </span>
            <p className="text-xl font-bold text-white">{currentUser.completedAuditsCount || 14}</p>
            <span className="text-[10px] text-slate-500">Temporada Reforestación 2026</span>
          </div>
        </div>

        {/* Incidents pill */}
        <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-2xl text-xs flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Incidencias GPS registradas históricas:</span>
          </div>
          <span className="font-mono font-bold bg-amber-900/60 px-2 py-0.5 rounded text-amber-200">
            2 incidencias
          </span>
        </div>

        {/* Role Switcher Action */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => switchRole('ADMIN')}
            className="w-full py-3 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-2xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-300" />
            <span>Cambiar a Vista de Administrador Gerencial</span>
          </button>
        </div>
      </div>
    </div>
  );
}
