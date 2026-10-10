import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Trees,
  Layers,
  Send,
  History,
  User,
  Wifi,
  WifiOff,
  HardDrive,
  Crosshair,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkAndRequestStorageHealth, formatBytes } from '../services/storage';
import type { StorageHealthInfo } from '../services/storage';
import { getCurrentGPSPosition } from '../services/gps';
import type { GPSPosition } from '../services/gps';
import { db } from '../db/dexie';

export function TechnicianLayout() {
  const { isOnline, switchRole } = useAuth();
  const [storageInfo, setStorageInfo] = useState<StorageHealthInfo | null>(null);
  const [currentGps, setCurrentGps] = useState<GPSPosition | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function loadStatus() {
      const s = await checkAndRequestStorageHealth();
      setStorageInfo(s);

      // Check pending audits & evidence
      const pAudits = await db.audits.where('syncStatus').equals('PENDING').count();
      const pEvidence = await db.evidence.where('syncStatus').equals('PENDING').count();
      setPendingCount(pAudits + pEvidence);
    }
    loadStatus();
    const interval = setInterval(loadStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleRefreshGPS() {
    setGpsLoading(true);
    try {
      const pos = await getCurrentGPSPosition();
      setCurrentGps(pos);
    } catch (e: any) {
      console.warn('GPS error:', e);
    } finally {
      setGpsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      {/* Top Telemetry Header for Technician */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-600/20 border border-forest-500/40 flex items-center justify-center text-forest-400 shadow-sm">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">PROBOSQUE CAMPO</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  TÉCNICO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Operación Offline & Muestreo In Situ</p>
            </div>
          </div>

          {/* Telemetry Pills & Role Switcher */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Connectivity */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-400 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="font-semibold text-[11px]">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* GPS Telemetry Pill */}
            <button
              onClick={handleRefreshGPS}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors text-[11px]"
              title="Actualizar telemetría GPS"
            >
              <Crosshair className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-amber-400' : 'text-forest-400'}`} />
              <span>
                {currentGps
                  ? `±${currentGps.accuracyM}m`
                  : 'GPS FIX'}
              </span>
            </button>

            {/* Storage Quota */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>{storageInfo ? formatBytes(storageInfo.usageBytes) : '12MB'} local</span>
            </div>

            {/* Quick Role Switcher Button */}
            <button
              onClick={() => switchRole('ADMIN')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 text-[11px] font-medium transition-all shadow-sm"
              title="Cambiar a Vista Administrador Gerencial"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden xs:inline">Cambiar a</span> Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Outlet */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-5">
        <Outlet />
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center py-2">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-forest-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Trees className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Inicio</span>
          </NavLink>

          <NavLink
            to="/app/plots"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-forest-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Parcelas</span>
          </NavLink>

          <NavLink
            to="/app/sync"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-forest-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Send className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Sync</span>
            {pendingCount > 0 && (
              <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center animate-bounce">
                {pendingCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/app/history"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-forest-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Historial</span>
          </NavLink>

          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-forest-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Perfil</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
