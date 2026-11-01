import { useState } from 'react';
import { Users, Smartphone, ShieldCheck } from 'lucide-react';

interface TechUser {
  id: string;
  name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';
  email: string;
  status: 'ACTIVO' | 'INACTIVO';
  deviceModel: string;
  assignedPlots: number;
  completedAudits: number;
  lastSync: string;
  incidents: number;
}

export function AdminUsers() {
  const [userList] = useState<TechUser[]>([
    {
      id: 'tech-1',
      name: 'Ing. Juan Pérez',
      role: 'TECHNICIAN',
      email: 'juan.perez@probosque.edomex.gob.mx',
      status: 'ACTIVO',
      deviceModel: 'Samsung Galaxy A15 (Android 14)',
      assignedPlots: 18,
      completedAudits: 14,
      lastSync: '07/10/2026 · 14:32',
      incidents: 2,
    },
    {
      id: 'tech-2',
      name: 'Biól. Carlos Gómez',
      role: 'TECHNICIAN',
      email: 'carlos.gomez@probosque.edomex.gob.mx',
      status: 'ACTIVO',
      deviceModel: 'Motorola Moto G84 (Android 14)',
      assignedPlots: 22,
      completedAudits: 19,
      lastSync: '07/10/2026 · 12:15',
      incidents: 0,
    },
    {
      id: 'admin-1',
      name: 'Dra. Elena Ramos',
      role: 'SUPERVISOR',
      email: 'elena.ramos@probosque.edomex.gob.mx',
      status: 'ACTIVO',
      deviceModel: 'Estación Central Probosque',
      assignedPlots: 1248,
      completedAudits: 876,
      lastSync: '07/10/2026 · 16:50',
      incidents: 0,
    },
  ]);

  const [selectedUser, setSelectedUser] = useState<TechUser>(userList[0]);

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#355044]" />
            <span>Padrón Técnico y Personal Operativo</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            Gestión de brigadas de campo, dispositivos certificados y control de sincronización
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: User Table */}
        <div className="lg:col-span-2 rounded-[28px] bg-[#EAE4D3]/40 border border-[#6B8B78]/20 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#6B8B78]/20 flex items-center justify-between bg-[#D9D1B8]/60">
            <h3 className="font-['Outfit',sans-serif] text-base font-semibold text-[#1B2A24]">Personal en Cuadrante</h3>
            <span className="text-xs text-[#6B8B78]">{userList.length} usuarios registrados</span>
          </div>

          <div className="divide-y divide-[#6B8B78]/15 text-xs bg-[#F4F1EA]">
            {userList.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`p-5 hover:bg-[#EAE4D3]/70 cursor-pointer transition-colors flex items-center justify-between ${
                  selectedUser.id === u.id ? 'bg-[#EAE4D3] border-l-4 border-[#355044]' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-[#1B2A24]">{u.name}</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#D9D1B8] font-semibold text-[#355044]">
                      {u.role === 'TECHNICIAN' ? 'Técnico de Campo' : 'Supervisión Central'}
                    </span>
                  </div>
                  <p className="text-[#6B8B78]">{u.email}</p>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-[#1B2A24] font-semibold">{u.assignedPlots} parcelas</div>
                  <div className="text-xs text-[#355044] font-medium">{u.completedAudits} auditorías realizadas</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Detailed Technician Profile */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm space-y-5 text-xs">
          <div className="border-b border-[#6B8B78]/20 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full block w-fit mb-2">
                Ficha Técnica
              </span>
              <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24]">{selectedUser.name}</h3>
              <p className="text-[#6B8B78] mt-0.5">{selectedUser.email}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#B9C8B2] text-[#1B2A24] font-semibold text-xs">
              {selectedUser.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#F4F1EA] p-4 border border-[#6B8B78]/15 space-y-1 shadow-inner">
              <span className="text-[#6B8B78] text-xs font-semibold block flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#355044]" />
                <span>Dispositivo Móvil Homologado</span>
              </span>
              <p className="font-semibold text-[#1B2A24] text-xs">{selectedUser.deviceModel}</p>
              <span className="text-[11px] text-[#355044] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Certificado Criptográfico PWA Activo</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
                <span className="text-xs text-[#6B8B78] block">Parcelas</span>
                <span className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24] tabular-nums mt-1 block">
                  {selectedUser.assignedPlots}
                </span>
              </div>
              <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
                <span className="text-xs text-[#6B8B78] block">Auditorías</span>
                <span className="font-['Outfit',sans-serif] text-2xl font-light text-[#355044] tabular-nums mt-1 block">
                  {selectedUser.completedAudits}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-2.5 shadow-inner">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B8B78]">Última Sincronización:</span>
                <span className="text-[#1B2A24] font-semibold">{selectedUser.lastSync}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B8B78]">Incidencias Reportadas:</span>
                <span className="font-semibold text-[#E0643A]">{selectedUser.incidents}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
