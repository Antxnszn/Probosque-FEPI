import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Clock,
  ArrowRight,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/dexie';
import type { PlotRecord, AuditRecord } from '../../types';
import { formatBytes, checkAndRequestStorageHealth } from '../../services/storage';

export function TechDashboard() {
  const navigate = useNavigate();
  const { currentUser, isOnline } = useAuth();
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [pendingAuditsCount, setPendingAuditsCount] = useState(0);
  const [pendingEvidenceCount, setPendingEvidenceCount] = useState(0);
  const [activeAudit, setActiveAudit] = useState<AuditRecord | null>(null);
  const [storageUsage, setStorageUsage] = useState<string>('0 MB');

  useEffect(() => {
    async function loadData() {
      const allPlots = await db.plots.toArray();
      setPlots(allPlots);

      const pAudits = await db.audits.where('syncStatus').equals('PENDING').toArray();
      setPendingAuditsCount(pAudits.length);

      const pEvidence = await db.evidence.where('syncStatus').equals('PENDING').count();
      setPendingEvidenceCount(pEvidence);

      // Check if there is an in-progress or draft audit
      const inProgress = await db.audits.where('status').equals('EN_CURSO').first();
      setActiveAudit(inProgress || null);

      const s = await checkAndRequestStorageHealth();
      setStorageUsage(formatBytes(s.usageBytes));
    }
    loadData();
  }, []);

  const pendingPlots = plots.filter((p) => p.auditStatus === 'PENDIENTE');
  const inProgressPlots = plots.filter((p) => p.auditStatus === 'EN_CURSO');
  const completedPlots = plots.filter((p) => p.auditStatus === 'COMPLETADA');
  const incidentPlots = plots.filter((p) => p.auditStatus === 'CON_INCIDENCIA');

  const pendingSyncTotal = pendingAuditsCount + pendingEvidenceCount;

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-forest-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-forest-400">
              Operación de Campo Probosque
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Buenos días, {currentUser.name.split(' ')[1] || currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {plots.length} parcelas asignadas en tu cuadrante de trabajo.
          </p>
        </div>

        {/* Floating Quick Action */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/app/plots')}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
          >
            <span>{activeAudit ? 'Continuar auditoría en curso' : 'Ver parcelas asignadas'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Sync warning pill */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${pendingSyncTotal > 0 ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'}`}>
              <Clock className="w-3.5 h-3.5" />
              {pendingSyncTotal > 0 ? `${pendingSyncTotal} pendientes de sync` : 'Datos al día'}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Pendientes</span>
          <div className="text-2xl font-black text-slate-100 my-1">{pendingPlots.length}</div>
          <span className="text-[10px] text-slate-500">Por auditar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-blue-400 font-medium">En Progreso</span>
          <div className="text-2xl font-black text-blue-300 my-1">{inProgressPlots.length}</div>
          <span className="text-[10px] text-blue-500/80">Levantamiento activo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-emerald-400 font-medium">Completadas</span>
          <div className="text-2xl font-black text-emerald-300 my-1">{completedPlots.length}</div>
          <span className="text-[10px] text-emerald-500/80">Sincronizadas/listas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-medium">Incidencias</span>
          <div className="text-2xl font-black text-amber-300 my-1">{incidentPlots.length}</div>
          <span className="text-[10px] text-amber-500/80">GPS o vegetación</span>
        </div>
      </div>

      {/* Connectivity & Local Storage Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-forest-400" />
          Estado del Dispositivo y Almacenamiento Local
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <div>
                <div className="font-semibold text-white">
                  {isOnline ? 'Conexión a Internet Estable' : 'Sin Conexión Celular'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isOnline ? 'Listo para enviar cola' : 'Operando en base de datos IndexedDB'}
                </div>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}`}>
              {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-white">Almacenamiento Local PWA</div>
                <div className="text-[10px] text-slate-400">Uso actual: {storageUsage}</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
              PROTEGIDO
            </span>
          </div>
        </div>
      </div>

      {/* Quick Plots Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-forest-400" />
            Próximas Parcelas a Muestrear
          </h3>
          <button
            onClick={() => navigate('/app/plots')}
            className="text-xs text-forest-400 hover:text-forest-300 font-semibold"
          >
            Ver todas →
          </button>
        </div>

        <div className="space-y-2">
          {plots.slice(0, 3).map((plot) => (
            <div
              key={plot.id}
              onClick={() => navigate(`/app/plots/${plot.id}`)}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-forest-400 bg-forest-950/80 px-2 py-0.5 rounded border border-forest-800">
                    {plot.cadastralKey}
                  </span>
                  <span className="text-xs font-semibold text-white">{plot.municipality}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{plot.beneficiaryName}</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-300">{plot.areaHa} ha</span>
                <div className="text-[10px] text-forest-400 font-semibold mt-0.5">
                  {plot.auditStatus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
