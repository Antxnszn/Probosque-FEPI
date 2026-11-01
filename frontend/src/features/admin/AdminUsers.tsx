import { useState } from 'react';
import { Users, Smartphone } from 'lucide-react';

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
      lastSync: '07/10/2026 14:32',
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
      lastSync: '07/10/2026 12:15',
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
      lastSync: '07/10/2026 16:50',
      incidents: 0,
    },
  ]);

  const [selectedUser, setSelectedUser] = useState<TechUser>(userList[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Directorio de Técnicos de Campo y Supervisores
          </h1>
          <p className="text-xs text-slate-400">
            Administración de dispositivos autorizados, asignación operativa y control de sincronización
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: User Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Personal Operativo Activo</h3>
            <span className="text-xs text-slate-400">{userList.length} usuarios</span>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {userList.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`p-4 hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between ${
                  selectedUser.id === u.id ? 'bg-slate-800/60 border-l-4 border-forest-500' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-300">
                      {u.role}
                    </span>
                  </div>
                  <p className="text-slate-400">{u.email}</p>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-slate-300 font-semibold">{u.assignedPlots} parcelas</div>
                  <div className="text-[10px] text-emerald-400">{u.completedAudits} auditorías</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Detailed Technician Profile matching section 4.10 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ficha Técnica</span>
              <h3 className="text-base font-bold text-white mt-0.5">{selectedUser.name}</h3>
              <p className="text-slate-400 text-[11px]">{selectedUser.email}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
              {selectedUser.status}
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Dispositivo Autorizado
              </span>
              <p className="font-semibold text-white">{selectedUser.deviceModel}</p>
              <span className="text-[10px] text-emerald-400">Certificado PWA Instalado</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Parcelas Asignadas</span>
                <span className="text-2xl font-black text-white">{selectedUser.assignedPlots}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Auditorías Realizadas</span>
                <span className="text-2xl font-black text-emerald-400">{selectedUser.completedAudits}</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Última Sincronización:</span>
                <span className="font-mono text-white font-bold">{selectedUser.lastSync}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Incidencias GPS Reportadas:</span>
                <span className="font-mono font-bold text-amber-400">{selectedUser.incidents}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
