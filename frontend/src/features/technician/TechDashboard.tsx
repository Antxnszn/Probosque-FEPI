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
    <div className="space-y-10 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Welcome Banner in Tactile Clay Well */}
      <div className="rounded-[32px] bg-[#EAE4D3] p-6 sm:p-8 shadow-[inset_4px_4px_12px_rgba(107,139,120,0.18),inset_-4px_-4px_12px_rgba(255,255,255,0.85)] space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#E0643A] uppercase tracking-normal">
            Operación de Campo PROBOSQUE
          </span>
          <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24]">
            Buenos días, {currentUser.name.split(' ')[1] || currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B8B78]">
            Tienes {plots.length} parcelas asignadas en tu cuadrante territorial de muestreo.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-[#6B8B78]/20 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/app/plots')}
            className="clay-btn-terracotta px-6 py-2.5 text-xs text-white shadow-sm flex items-center gap-2"
          >
            <span>{activeAudit ? 'Continuar auditoría en curso' : 'Ver parcelas asignadas'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Sync warning pill */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-semibold ${
                pendingSyncTotal > 0
                  ? 'bg-[#F9DFD5] text-[#E0643A]'
                  : 'bg-[#B9C8B2] text-[#1B2A24]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingSyncTotal > 0 ? `${pendingSyncTotal} registros pendientes de sincronía` : 'Datos sincronizados al día'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Open-Air Operational Metrics */}
      <section aria-label="Resumen operativo del técnico">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-4 border-y border-[#6B8B78]/20">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#6B8B78] block">Por Muestrear</span>
            <div className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] tabular-nums">
              {pendingPlots.length}
            </div>
            <span className="text-xs text-[#6B8B78]">Parcelas pendientes</span>
          </div>

          <div className="space-y-1 border-l-0 sm:border-l border-[#6B8B78]/20 sm:pl-6">
            <span className="text-xs font-medium text-[#355044] block">En Progreso</span>
            <div className="font-['Outfit',sans-serif] text-3xl font-light text-[#355044] tabular-nums">
              {inProgressPlots.length}
            </div>
            <span className="text-xs text-[#6B8B78]">Levantamiento activo</span>
          </div>

          <div className="space-y-1 border-l-0 sm:border-l border-[#6B8B78]/20 sm:pl-6">
            <span className="text-xs font-medium text-[#355044] block">Completadas</span>
            <div className="font-['Outfit',sans-serif] text-3xl font-light text-[#355044] tabular-nums">
              {completedPlots.length}
            </div>
            <span className="text-xs text-[#6B8B78]">Listas o transmitidas</span>
          </div>

          <div className="space-y-1 border-l-0 sm:border-l border-[#6B8B78]/20 sm:pl-6">
            <span className="text-xs font-medium text-[#E0643A] block">Con Incidencias</span>
            <div className="font-['Outfit',sans-serif] text-3xl font-light text-[#E0643A] tabular-nums">
              {incidentPlots.length}
            </div>
            <span className="text-xs text-[#6B8B78]">Desvío GPS o canopia</span>
          </div>
        </div>
      </section>

      {/* Device & Connectivity Status in Soft Clay */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm border border-[#6B8B78]/15 space-y-4">
        <h3 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#355044]" />
          <span>Estado del Dispositivo y Almacén Local</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-[#F4F1EA] p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="w-8 h-8 rounded-full bg-[#B9C8B2] flex items-center justify-center text-[#355044]">
                  <Wifi className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#F9DFD5] flex items-center justify-center text-[#E0643A]">
                  <WifiOff className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="font-semibold text-[#1B2A24]">
                  {isOnline ? 'Conexión a Internet Activa' : 'Modo Fuera de Línea'}
                </div>
                <div className="text-[11px] text-[#6B8B78]">
                  {isOnline ? 'Listo para sincronizar cola' : 'Guardando en base local Dexie'}
                </div>
              </div>
            </div>
            <span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${isOnline ? 'bg-[#B9C8B2] text-[#1B2A24]' : 'bg-[#F9DFD5] text-[#E0643A]'}`}>
              {isOnline ? 'En línea' : 'Local'}
            </span>
          </div>

          <div className="rounded-2xl bg-[#F4F1EA] p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D9D1B8] flex items-center justify-center text-[#355044]">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-[#1B2A24]">Almacenamiento Local PWA</div>
                <div className="text-[11px] text-[#6B8B78]">Espacio en uso: {storageUsage}</div>
              </div>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full font-semibold bg-[#D9D1B8] text-[#355044]">
              Protegido
            </span>
          </div>
        </div>
      </div>

      {/* Quick Assigned Plots Stream */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#6B8B78]/20 pb-3">
          <h3 className="font-['Outfit',sans-serif] text-xl font-light text-[#1B2A24] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#355044]" />
            <span>Próximas Parcelas a Muestrear</span>
          </h3>
          <button
            onClick={() => navigate('/app/plots')}
            className="text-xs text-[#355044] hover:text-[#E0643A] font-semibold transition-colors"
          >
            Ver todas →
          </button>
        </div>

        <div className="divide-y divide-[#6B8B78]/15 border-b border-[#6B8B78]/15">
          {plots.slice(0, 3).map((plot) => (
            <article
              key={plot.id}
              onClick={() => navigate(`/app/plots/${plot.id}`)}
              className="group py-4 px-3 -mx-3 rounded-2xl hover:bg-[#EAE4D3]/60 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-2.5 py-0.5 rounded-full">
                    {plot.cadastralKey}
                  </span>
                  <span className="text-xs font-semibold text-[#1B2A24]">{plot.municipality}</span>
                </div>
                <p className="text-xs text-[#6B8B78]">{plot.beneficiaryName}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-xs font-semibold text-[#1B2A24] tabular-nums">{plot.areaHa} ha</span>
                <div className="text-[11px] text-[#355044] font-medium">
                  {plot.auditStatus}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
