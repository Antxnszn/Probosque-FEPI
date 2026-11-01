import { Smartphone, Layers, CheckCircle2, AlertTriangle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function TechProfile() {
  const { currentUser, switchRole } = useAuth();

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Editorial Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <h1 className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24]">
          Perfil del Técnico Forestal
        </h1>
        <p className="text-xs text-[#6B8B78] mt-0.5">
          Credencial operativa y telemetría del dispositivo certificado
        </p>
      </div>

      {/* User Identity Card */}
      <div className="rounded-[24px] bg-[#EAE4D3] p-5 border border-[#6B8B78]/20 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#355044] text-[#F4F1EA] font-['Outfit',sans-serif] font-bold text-xl flex items-center justify-center shadow-md">
          {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1B2A24]">{currentUser.name}</h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E5ECE3] text-[#355044] font-bold shadow-sm">
              Activo
            </span>
          </div>
          <p className="text-xs text-[#6B8B78]">{currentUser.email}</p>
          <p className="text-xs text-[#355044] font-medium">Técnico Forestal Certificado PROBOSQUE</p>
        </div>
      </div>

      {/* Telemetry and Profile Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-[22px] bg-[#EAE4D3] p-4 border border-[#6B8B78]/15 shadow-sm space-y-1">
          <span className="text-xs text-[#6B8B78] flex items-center gap-1.5 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-[#355044]" />
            Dispositivo Registrado
          </span>
          <p className="font-bold text-[#1B2A24] text-sm">{currentUser.deviceModel || 'Samsung Galaxy A15'}</p>
          <span className="text-[11px] text-[#6B8B78] block">Android 14 · Sensor GNSS Calibrado</span>
        </div>

        <div className="rounded-[22px] bg-[#EAE4D3] p-4 border border-[#6B8B78]/15 shadow-sm space-y-1">
          <span className="text-xs text-[#6B8B78] flex items-center gap-1.5 font-medium">
            <RefreshCw className="w-3.5 h-3.5 text-[#355044]" />
            Última Sincronización
          </span>
          <p className="font-bold text-[#1B2A24] text-sm">{currentUser.lastSyncAt || '07/10/2026 14:32'}</p>
          <span className="text-[11px] text-[#355044] font-medium block">Canal TLS 1.3 / FastAPI</span>
        </div>

        <div className="rounded-[22px] bg-[#EAE4D3] p-4 border border-[#6B8B78]/15 shadow-sm space-y-1">
          <span className="text-xs text-[#6B8B78] flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#355044]" />
            Parcelas Asignadas
          </span>
          <p className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24] tabular-nums">
            {currentUser.assignedPlotsCount || 4}
          </p>
          <span className="text-[11px] text-[#6B8B78] block">Valle de Toluca y Bravo</span>
        </div>

        <div className="rounded-[22px] bg-[#EAE4D3] p-4 border border-[#6B8B78]/15 shadow-sm space-y-1">
          <span className="text-xs text-[#6B8B78] flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
            Auditorías Completadas
          </span>
          <p className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24] tabular-nums">
            {currentUser.completedAuditsCount || 14}
          </p>
          <span className="text-[11px] text-[#6B8B78] block">Temporada Reforestación 2026</span>
        </div>
      </div>

      {/* GPS Incidents Pill */}
      <div className="rounded-[22px] bg-[#F9EDE8] border border-[#E8C8B8] p-4 text-xs flex items-center justify-between text-[#9A381E] shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E0643A] shrink-0" />
          <span>Incidencias GPS históricas registradas:</span>
        </div>
        <span className="font-bold bg-[#E0643A] text-white px-3 py-1 rounded-full text-xs shadow-sm">
          2 registradas
        </span>
      </div>

      {/* Switch to Admin Role Action */}
      <div className="pt-2">
        <button
          onClick={() => switchRole('ADMIN')}
          className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-md flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Cambiar a Vista de Administrador Central</span>
        </button>
      </div>
    </div>
  );
}
