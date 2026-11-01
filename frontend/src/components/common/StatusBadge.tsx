import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  HardDrive,
  Search,
  Check,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import type { TriageClassification, AuditWorkflowStatus, SubsidyDecisionStatus, SyncStatus } from '../../types';

export function TriageBadge({ status }: { status: TriageClassification }) {
  switch (status) {
    case 'NORMAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#B9C8B2]/50 text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(53,80,68,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#A3C962]" />
          Normal
        </span>
      );
    case 'ANOMALY':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_rgba(224,100,58,0.2)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#E0643A]" />
          Alerta fenológica
        </span>
      );
    case 'INCONCLUSIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D9D1B8]/60 text-[#355044] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <HelpCircle className="w-3.5 h-3.5 text-[#6B8B78]" />
          No concluyente
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAE4D3] text-[#6B8B78]">
          <span className="w-2 h-2 rounded-full bg-[#6B8B78]" />
          {status}
        </span>
      );
  }
}

export function AuditStatusBadge({ status }: { status: AuditWorkflowStatus }) {
  switch (status) {
    case 'COMPLETADA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#B9C8B2]/60 text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(53,80,68,0.15)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
          Completada
        </span>
      );
    case 'EN_CURSO':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D9D1B8] text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#E0643A]" />
          En curso
        </span>
      );
    case 'GUARDADA_LOCALMENTE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAE4D3] text-[#355044] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <HardDrive className="w-3.5 h-3.5 text-[#6B8B78]" />
          Almacén local
        </span>
      );
    case 'CON_INCIDENCIA':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(224,100,58,0.2)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#E0643A]" />
          Con incidencia
        </span>
      );
    case 'EN_REVISION':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D9D1B8]/60 text-[#355044] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <Search className="w-3.5 h-3.5 text-[#6B8B78]" />
          En revisión
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAE4D3] text-[#6B8B78]">
          <Clock className="w-3.5 h-3.5 text-[#6B8B78]" />
          Pendiente
        </span>
      );
  }
}

export function SubsidyBadge({ status }: { status: SubsidyDecisionStatus }) {
  switch (status) {
    case 'APROBADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B9C8B2] text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(53,80,68,0.2)]">
          <Check className="w-3.5 h-3.5 text-[#355044]" />
          Aprobado
        </span>
      );
    case 'RECHAZADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(224,100,58,0.25)]">
          <XCircle className="w-3.5 h-3.5 text-[#E0643A]" />
          Rechazado
        </span>
      );
    case 'ELEGIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D9D1B8] text-[#355044] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
          Elegible
        </span>
      );
    case 'NO_ELEGIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(224,100,58,0.2)]">
          <XCircle className="w-3.5 h-3.5 text-[#E0643A]" />
          No elegible
        </span>
      );
    case 'EN_REVISION':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D9D1B8]/60 text-[#355044] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <Search className="w-3.5 h-3.5 text-[#6B8B78]" />
          En revisión
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAE4D3] text-[#6B8B78]">
          <Clock className="w-3.5 h-3.5 text-[#6B8B78]" />
          Pendiente
        </span>
      );
  }
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'SYNCED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#B9C8B2]/50 text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(53,80,68,0.15)]">
          <Check className="w-3 h-3 text-[#355044]" />
          Sincronizado
        </span>
      );
    case 'UPLOADING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D9D1B8] text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(107,139,120,0.2)]">
          <RefreshCw className="w-3 h-3 text-[#355044] animate-spin" />
          Transmitiendo
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(224,100,58,0.2)]">
          <AlertTriangle className="w-3 h-3 text-[#E0643A]" />
          Error de sincronización
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAE4D3] text-[#6B8B78]">
          <Clock className="w-3 h-3 text-[#6B8B78]" />
          Pendiente local
        </span>
      );
  }
}
