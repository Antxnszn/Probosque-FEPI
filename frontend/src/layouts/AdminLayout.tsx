import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Map as MapIcon,
  Layers,
  Satellite,
  ClipboardCheck,
  FileCheck2,
  Image as ImageIcon,
  Users,
  FileSpreadsheet,
  Server,
  ArrowRightLeft,
  Wifi,
  WifiOff,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminLayout() {
  const { currentUser, isOnline, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/map', label: 'Mapa Operativo', icon: MapIcon },
    { to: '/admin/plots', label: 'Parcelas', icon: Layers },
    { to: '/admin/triage', label: 'Triage Satelital', icon: Satellite },
    { to: '/admin/audits', label: 'Auditorías', icon: ClipboardCheck },
    { to: '/admin/subsidies', label: 'Subsidios & Decisión', icon: FileCheck2 },
    { to: '/admin/evidence', label: 'Evidencias (Hash)', icon: ImageIcon },
    { to: '/admin/users', label: 'Técnicos & Usuarios', icon: Users },
    { to: '/admin/reports', label: 'Reportes & Export', icon: FileSpreadsheet },
    { to: '/admin/system', label: 'Estado del Sistema', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand & Emblem */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-600/20 border border-forest-500/40 flex items-center justify-center text-forest-400 shadow-md">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                PROBOSQUE <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">ADMIN</span>
              </h1>
              <p className="text-[11px] text-slate-400">Supervisión & Decisión</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Módulos de Gestión
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-forest-600 text-white shadow-lg shadow-forest-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Current Admin User Footnote */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-indigo-300 font-bold text-xs">
              ER
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <span className="text-xs text-slate-400 hidden sm:inline">Panel Gerencial y Dictaminación Forestal</span>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Gobierno del Estado de México — Probosque
              </h2>
            </div>
          </div>

          {/* Right Header Statuses & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Connectivity */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-400'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="font-semibold text-[11px] hidden sm:inline">{isOnline ? 'CONECTADO AL CENTRO' : 'SIN RED'}</span>
            </div>

            {/* Quick Switch to Technician Mode */}
            <button
              onClick={() => switchRole('TECHNICIAN')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-forest-600/20 hover:bg-forest-600/30 text-forest-300 border border-forest-500/40 text-xs font-semibold transition-all shadow-sm"
              title="Cambiar a Vista Operativa de Técnico de Campo"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-forest-400" />
              <span>Modo Técnico</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                      isActive ? 'bg-forest-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Desktop Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
