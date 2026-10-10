import type { TriageClassification, AuditWorkflowStatus, SubsidyDecisionStatus, SyncStatus } from '../../types';

export function TriageBadge({ status }: { status: TriageClassification }) {
  switch (status) {
    case 'NORMAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          NORMAL
        </span>
      );
    case 'ANOMALY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
          ANOMALY
        </span>
      );
    case 'INCONCLUSIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          INCONCLUSIVE
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {status}
        </span>
      );
  }
}

export function AuditStatusBadge({ status }: { status: AuditWorkflowStatus }) {
  switch (status) {
    case 'COMPLETADA':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
          ✓ COMPLETADA
        </span>
      );
    case 'EN_CURSO':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/70 text-blue-300 border border-blue-800/80">
          ● EN CURSO
        </span>
      );
    case 'GUARDADA_LOCALMENTE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800/80">
          💾 LOCAL
        </span>
      );
    case 'CON_INCIDENCIA':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/80">
          ⚠ INCIDENCIA
        </span>
      );
    case 'EN_REVISION':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950/70 text-purple-300 border border-purple-800/80">
          🔍 REVISIÓN
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          ⏳ PENDIENTE
        </span>
      );
  }
}

export function SubsidyBadge({ status }: { status: SubsidyDecisionStatus }) {
  switch (status) {
    case 'APROBADO':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-600">
          APROBADO
        </span>
      );
    case 'RECHAZADO':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-900/60 text-rose-300 border border-rose-600">
          RECHAZADO
        </span>
      );
    case 'ELEGIBLE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-900/60 text-teal-300 border border-teal-600">
          ELEGIBLE
        </span>
      );
    case 'NO_ELEGIBLE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-900/60 text-orange-300 border border-orange-600">
          NO ELEGIBLE
        </span>
      );
    case 'EN_REVISION':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-600">
          EN REVISIÓN
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
          PENDIENTE
        </span>
      );
  }
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'SYNCED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          ✓ Sincronizado
        </span>
      );
    case 'UPLOADING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950 text-blue-400 border border-blue-800 animate-pulse">
          Subiendo...
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
          ⚠ Error sync
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
          ⏳ Pendiente local
        </span>
      );
  }
}
