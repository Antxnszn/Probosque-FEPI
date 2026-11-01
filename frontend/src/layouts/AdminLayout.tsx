import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Trees,
  Compass,
  ArrowRightLeft,
  Menu,
  X,
  FileSpreadsheet,
  Users,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminLayout() {
  const { switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/admin', label: 'Resumen', end: true },
    { to: '/admin/map', label: 'Mapa Operativo' },
    { to: '/admin/plots', label: 'Parcelas' },
    { to: '/admin/triage', label: 'Triage Satelital' },
    { to: '/admin/audits', label: 'Auditorías' },
    { to: '/admin/subsidies', label: 'Dictamen' },
    { to: '/admin/evidence', label: 'Evidencias' },
  ];

  const secondaryItems = [
    { to: '/admin/users', label: 'Padrón Técnico', icon: Users },
    { to: '/admin/reports', label: 'Reportes', icon: FileSpreadsheet },
    { to: '/admin/system', label: 'Sistema', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#E0643A]/20">
      {/* ZONA 1: Isla de Navegación Flotante en Arcilla (Sin barra lateral rígida) */}
      <header className="max-w-6xl mx-auto pt-6 px-4 sm:px-8">
        <nav
          aria-label="Navegación principal PROBOSQUE"
          className="flex items-center justify-between gap-4 rounded-full bg-[#D9D1B8] px-5 sm:px-7 py-3 shadow-[10px_14px_28px_rgba(27,42,36,0.08),-6px_-6px_18px_rgba(255,255,255,0.85),inset_3px_3px_6px_rgba(255,255,255,0.75),inset_-3px_-4px_7px_rgba(107,139,120,0.22)]"
        >
          {/* Emblema y Título */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#355044] text-[#F4F1EA] shadow-[4px_6px_12px_rgba(27,42,36,0.2),inset_2px_2px_4px_rgba(185,200,178,0.3),inset_-2px_-3px_5px_rgba(15,25,21,0.5)]">
              <Trees className="w-5 h-5 text-[#F4F1EA]" />
            </div>
            <div>
              <span className="font-['Outfit',sans-serif] text-xl font-medium tracking-tight text-[#1B2A24] group-hover:text-[#355044] transition-colors">
                PROBOSQUE
              </span>
              <span className="hidden sm:inline-block mx-2 text-[#6B8B78]">·</span>
              <span className="hidden sm:inline-block text-xs font-medium text-[#355044]">
                Panel Directivo
              </span>
            </div>
          </Link>

          {/* Links para Desktop */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#355044] text-[#F4F1EA] font-semibold shadow-sm'
                      : 'text-[#355044] hover:text-[#1B2A24] hover:bg-[#B9C8B2]/40 font-medium'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <Link
              to="/visor"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#355044] hover:text-[#1B2A24] hover:bg-[#B9C8B2]/40 transition-all flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5 text-[#355044]" />
              <span>Visor</span>
            </Link>
          </div>

          {/* Botones de Acción Derecha */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => switchRole('TECHNICIAN')}
              className="clay-btn-terracotta px-4 py-2 text-xs text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Cambiar a Vista Operativa de Técnico de Campo"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modo Técnico</span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full bg-[#B9C8B2] text-[#1B2A24] hover:bg-[#A3C962] transition-colors cursor-pointer"
              aria-label="Menú móvil"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 p-4 rounded-3xl bg-[#EAE4D3] shadow-[inset_3px_3px_8px_rgba(107,139,120,0.18)] space-y-1 text-xs">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-xl transition-all ${
                    isActive ? 'bg-[#355044] text-white font-semibold' : 'text-[#355044] hover:bg-[#D9D1B8]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="pt-2 border-t border-[#6B8B78]/20 flex flex-wrap gap-2">
              {secondaryItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 rounded-full bg-[#D9D1B8] text-[#355044] text-xs font-medium"
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/visor"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1.5 rounded-full bg-[#E0643A] text-white text-xs font-semibold"
              >
                Visor Forestal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Open Canvas Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
