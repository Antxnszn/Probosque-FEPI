import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Trees,
  Layers,
  Send,
  History,
  User,
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
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] pb-24 md:pb-6 selection:bg-[#E0643A]/20">
      {/* Top Telemetry Header for Technician */}
      <header className="bg-[#EAE4D3]/90 backdrop-blur border-b border-[#6B8B78]/15 px-4 py-3 sticky top-0 z-40 shadow-[0_4px_16px_rgba(27,42,36,0.04)]">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-[4px_6px_14px_rgba(27,42,36,0.18),inset_2px_2px_4px_rgba(185,200,178,0.3),inset_-2px_-3px_5px_rgba(15,25,21,0.5)]">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit',sans-serif] text-base font-semibold tracking-tight text-[#1B2A24]">
                  PROBOSQUE CAMPO
                </span>
                <span className="text-[11px] font-semibold text-[#355044] bg-[#D9D1B8] px-2 py-0.5 rounded-full">
                  Técnico
                </span>
              </div>
              <p className="text-xs text-[#6B8B78]">Operación in situ y muestreo forestal</p>
            </div>
          </div>

          {/* Telemetry Pebbles & Role Switcher */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Connectivity Pebble */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium ${
                isOnline
                  ? 'bg-[#B9C8B2]/60 text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(53,80,68,0.15)]'
                  : 'bg-[#F9DFD5] text-[#E0643A] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_rgba(224,100,58,0.2)]'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#A3C962]" />
                  <span>En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#E0643A]" />
                  <span>Modo local</span>
                </>
              )}
            </div>

            {/* GPS Telemetry Pebble */}
            <button
              onClick={handleRefreshGPS}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9D1B8] hover:bg-[#B9C8B2] text-[#1B2A24] shadow-[3px_5px_12px_rgba(27,42,36,0.06),-2px_-2px_6px_rgba(255,255,255,0.7),inset_1px_1px_3px_rgba(255,255,255,0.6)] transition-all text-[11px] font-medium"
              title="Actualizar telemetría GPS"
            >
              <Crosshair className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-[#E0643A]' : 'text-[#355044]'}`} />
              <span>
                {currentGps
                  ? `Precision ±${currentGps.accuracyM}m`
                  : 'Fijar GPS'}
              </span>
            </button>

            {/* Storage Quota Pebble */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9D1B8]/70 text-[#355044] text-[11px] font-medium shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8)]">
              <HardDrive className="w-3.5 h-3.5 text-[#6B8B78]" />
              <span>{storageInfo ? formatBytes(storageInfo.usageBytes) : '12 MB'} local</span>
            </div>

            {/* Quick Role Switcher Button */}
            <button
              onClick={() => switchRole('ADMIN')}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#355044] hover:bg-[#1B2A24] text-white text-[11px] font-semibold shadow-[4px_6px_14px_rgba(27,42,36,0.18),inset_2px_2px_4px_rgba(185,200,178,0.25)] transition-all"
              title="Cambiar a Vista Administrador Gerencial"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Outlet */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Mobile-First Floating Clay Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto z-50 rounded-full bg-[#D9D1B8] px-4 py-2 shadow-[10px_16px_32px_rgba(27,42,36,0.12),-4px_-4px_14px_rgba(255,255,255,0.88),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-3px_5px_rgba(107,139,120,0.22)]">
        <div className="grid grid-cols-5 text-center">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors rounded-2xl ${
                isActive ? 'text-[#1B2A24] font-semibold bg-[#B9C8B2]/50 shadow-inner' : 'text-[#6B8B78] hover:text-[#1B2A24]'
              }`
            }
          >
            <Trees className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Inicio</span>
          </NavLink>

          <NavLink
            to="/app/plots"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors rounded-2xl ${
                isActive ? 'text-[#1B2A24] font-semibold bg-[#B9C8B2]/50 shadow-inner' : 'text-[#6B8B78] hover:text-[#1B2A24]'
              }`
            }
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Parcelas</span>
          </NavLink>

          <NavLink
            to="/app/sync"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center py-1 transition-colors rounded-2xl ${
                isActive ? 'text-[#1B2A24] font-semibold bg-[#B9C8B2]/50 shadow-inner' : 'text-[#6B8B78] hover:text-[#1B2A24]'
              }`
            }
          >
            <Send className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Sincronía</span>
            {pendingCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-[#E0643A] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {pendingCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/app/history"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors rounded-2xl ${
                isActive ? 'text-[#1B2A24] font-semibold bg-[#B9C8B2]/50 shadow-inner' : 'text-[#6B8B78] hover:text-[#1B2A24]'
              }`
            }
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Historial</span>
          </NavLink>

          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 transition-colors rounded-2xl ${
                isActive ? 'text-[#1B2A24] font-semibold bg-[#B9C8B2]/50 shadow-inner' : 'text-[#6B8B78] hover:text-[#1B2A24]'
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
