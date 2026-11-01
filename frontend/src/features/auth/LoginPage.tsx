import { useNavigate, Link } from 'react-router-dom';
import { Trees, Smartphone, Monitor, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#E0643A]/20">
      <div className="w-full max-w-3xl space-y-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center mx-auto shadow-[6px_10px_24px_rgba(27,42,36,0.22),inset_2px_2px_5px_rgba(185,200,178,0.32),inset_-3px_-4px_6px_rgba(15,24,20,0.5)]">
            <Trees className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E0643A]">Gobierno del Estado de México</p>
            <h1 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-light tracking-tight text-[#1B2A24] mt-1">
              PROBOSQUE · Sistema Forestal y Subsidios
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[#6B8B78] max-w-xl mx-auto leading-relaxed">
            Plataforma unificada para levantamiento in situ, análisis satelital multitemporal y dictamen transparente de apoyos forestales.
          </p>
        </div>

        {/* Role Cards in Tactile Clay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Technician Role */}
          <div
            onClick={() => handleSelectRole('TECHNICIAN')}
            className="group rounded-[32px] bg-[#EAE4D3] p-7 cursor-pointer transition-all duration-200 shadow-[8px_14px_28px_rgba(27,42,36,0.07),-4px_-4px_14px_rgba(255,255,255,0.85),inset_2px_2px_5px_rgba(255,255,255,0.75),inset_-2px_-3px_6px_rgba(107,139,120,0.18)] hover:-translate-y-1 hover:shadow-[12px_18px_32px_rgba(27,42,36,0.12),-4px_-4px_16px_rgba(255,255,255,0.9)] flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#B9C8B2] text-[#1B2A24] flex items-center justify-center shadow-[4px_6px_12px_rgba(27,42,36,0.08),inset_2px_2px_4px_rgba(255,255,255,0.7)]">
                  <Smartphone className="w-6 h-6 text-[#355044]" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D9D1B8] text-[#355044]">
                  Operación In Situ
                </span>
              </div>
              <div>
                <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] group-hover:text-[#355044] transition-colors">
                  Técnico de Campo
                </h3>
                <p className="text-xs sm:text-sm text-[#6B8B78] mt-1.5 leading-relaxed">
                  Levantamiento in situ, geocerca, muestreo de unidades circulares, captura fotográfica y resguardo local Dexie.
                </p>
              </div>
              <div className="text-xs text-[#6B8B78] space-y-1 pt-2 border-t border-[#6B8B78]/15">
                <div>Ing. Juan Pérez</div>
                <div>Brigada de campo regional</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#6B8B78]/15 text-xs font-semibold text-[#355044] group-hover:text-[#E0643A] transition-colors">
              <span>Ingresar a modo técnico</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Admin Role */}
          <div
            onClick={() => handleSelectRole('ADMIN')}
            className="group rounded-[32px] bg-[#EAE4D3] p-7 cursor-pointer transition-all duration-200 shadow-[8px_14px_28px_rgba(27,42,36,0.07),-4px_-4px_14px_rgba(255,255,255,0.85),inset_2px_2px_5px_rgba(255,255,255,0.75),inset_-2px_-3px_6px_rgba(107,139,120,0.18)] hover:-translate-y-1 hover:shadow-[12px_18px_32px_rgba(27,42,36,0.12),-4px_-4px_16px_rgba(255,255,255,0.9)] flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-[4px_6px_12px_rgba(27,42,36,0.18),inset_2px_2px_4px_rgba(185,200,178,0.3)]">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D9D1B8] text-[#355044]">
                  Sede Central
                </span>
              </div>
              <div>
                <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] group-hover:text-[#355044] transition-colors">
                  Supervisión y Dictamen
                </h3>
                <p className="text-xs sm:text-sm text-[#6B8B78] mt-1.5 leading-relaxed">
                  Supervisión del acervo, mapa geoespacial, inspección multitemporal Sentinel-2 y evaluación de subsidios.
                </p>
              </div>
              <div className="text-xs text-[#6B8B78] space-y-1 pt-2 border-t border-[#6B8B78]/15">
                <div>Dra. Elena Ramos</div>
                <div>Supervisora de Auditoría y Fomento</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#6B8B78]/15 text-xs font-semibold text-[#355044] group-hover:text-[#E0643A] transition-colors">
              <span>Ingresar a sede central</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Public Forest Viewer Shortcut */}
        <div className="rounded-2xl bg-[#D9D1B8]/40 p-4 flex flex-wrap items-center justify-between gap-4 border border-[#6B8B78]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#355044] text-white flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B2A24]">Consulta Ciudadana Abierta</p>
              <p className="text-xs text-[#6B8B78]">Accede directamente al Visor Forestal Multitemporal sin credenciales</p>
            </div>
          </div>
          <Link
            to="/visor"
            className="rounded-full bg-gradient-to-br from-[#EB7147] to-[#D95B30] px-5 py-2.5 text-xs font-semibold text-white shadow-[6px_10px_20px_rgba(224,100,58,0.28),inset_2px_2px_5px_rgba(255,215,195,0.55),inset_-2px_-3px_6px_rgba(148,52,20,0.4)] hover:-translate-y-0.5 transition-all"
          >
            Abrir Visor Forestal
          </Link>
        </div>

        {/* Security and Governance Note */}
        <div className="rounded-2xl bg-[#EAE4D3]/60 p-4 text-xs text-[#6B8B78] text-center space-y-1">
          <p className="font-semibold text-[#355044] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#355044]" />
            Principio Institucional PROBOSQUE
          </p>
          <p>
            El técnico captura la realidad in situ. El backend procesa y preserva. El equipo directivo interpreta y dictamina.
          </p>
        </div>
      </div>
    </div>
  );
}
