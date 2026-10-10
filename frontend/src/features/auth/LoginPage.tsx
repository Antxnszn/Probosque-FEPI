import { useNavigate } from 'react-router-dom';
import { Trees, Smartphone, Monitor, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { switchRole } = useAuth();

  const handleSelectRole = (role: 'TECHNICIAN' | 'ADMIN') => {
    switchRole(role);
    if (role === 'TECHNICIAN') {
      navigate('/app');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-forest-600/20 border border-forest-500/40 flex items-center justify-center text-forest-400 mx-auto shadow-md">
            <Trees className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            PROBOSQUE — Sistema de Auditoría Forestal y Subsidios
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Plataforma unificada con división de experiencias: Operación de campo (Mobile/Offline) vs. Supervisión y Dictamen (Desktop/Online).
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Technician Role Card */}
          <div
            onClick={() => handleSelectRole('TECHNICIAN')}
            className="group bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-forest-500 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-4 hover:shadow-forest-950/40"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-forest-950 border border-forest-800 flex items-center justify-center text-forest-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  MOBILE / OFFLINE
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-forest-400 transition-colors">
                  Vista Operativa (Técnico de Campo)
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Levantamiento in situ, geocerca, muestreo de unidades circulares, captura fotográfica forense y almacenamiento local Dexie.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div>• Perfil: Ing. Juan Pérez</div>
                <div>• Dispositivo: Android Samsung Galaxy A15</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-bold text-forest-400">
              <span>Ingresar como Técnico</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Admin Role Card */}
          <div
            onClick={() => handleSelectRole('ADMIN')}
            className="group bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-4 hover:shadow-indigo-950/40"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  DESKTOP / ONLINE
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                  Vista Gerencial (Administrador)
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Supervisión general, mapa operativo geoespacial, inspección Sentinel-2, dictaminación de subsidios y línea de tiempo.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div>• Perfil: Dra. Elena Ramos</div>
                <div>• Rol: Supervisora de Auditoría y Fomento</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-bold text-indigo-400">
              <span>Ingresar como Administrador</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Security and Governance Note */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-500 text-center space-y-1">
          <p className="font-semibold text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-forest-400" />
            Principio Arquitectónico Probosque
          </p>
          <p>
            El técnico captura la realidad. El backend calcula y preserva. El administrador interpreta y decide.
          </p>
        </div>
      </div>
    </div>
  );
}
