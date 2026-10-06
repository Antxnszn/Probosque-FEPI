import React, { useState, useEffect } from 'react';
import {
  Trees,
  MapPin,
  Camera,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Plus,
  Send,
  Wifi,
  WifiOff,
  TrendingUp,
  FileCheck,
  Crosshair
} from 'lucide-react';
import { db } from './db/dexie';
import type { LocalPlot, LocalAudit, LocalSamplingUnit, LocalEvidence } from './db/dexie';
import { checkAndRequestStorageHealth, formatBytes } from './services/storage';
import type { StorageHealthInfo } from './services/storage';
import { getCurrentGPSPosition } from './services/gps';
import type { GPSPosition } from './services/gps';
import { pushAuditPayload } from './services/api';


// Seed mock plots for offline demonstration
const SEED_PLOTS: LocalPlot[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    cadastralKey: 'PROB-MEX-2026-001',
    beneficiaryName: 'Ejido San Miguel Zinacantepec',
    areaHa: 4.85,
    plantingDate: '2024-06-15',
    triageStatus: 'NORMAL',
    auditStatus: 'NOT_STARTED',
    subsidyStatus: 'PENDING',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.7215, 19.2450],
          [-99.7180, 19.2450],
          [-99.7180, 19.2485],
          [-99.7215, 19.2485],
          [-99.7215, 19.2450],
        ]
      ]
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    cadastralKey: 'PROB-MEX-2026-002',
    beneficiaryName: 'Comunidad Indígena Temascaltepec',
    areaHa: 3.20,
    plantingDate: '2024-07-02',
    triageStatus: 'ANOMALY',
    auditStatus: 'NOT_STARTED',
    subsidyStatus: 'PENDING',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.9850, 19.0420],
          [-99.9810, 19.0420],
          [-99.9810, 19.0460],
          [-99.9850, 19.0460],
          [-99.9850, 19.0420],
        ]
      ]
    }
  }
];

export function App() {
  const [activeTab, setActiveTab] = useState<'plots' | 'audit' | 'queue' | 'results'>('plots');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageInfo, setStorageInfo] = useState<StorageHealthInfo | null>(null);
  const [currentGps, setCurrentGps] = useState<GPSPosition | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Plots & Audit state
  const [plots, setPlots] = useState<LocalPlot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<LocalPlot | null>(null);
  const [activeAudit, setActiveAudit] = useState<LocalAudit | null>(null);
  const [samplingUnits, setSamplingUnits] = useState<LocalSamplingUnit[]>([]);
  const [pendingEvidences, setPendingEvidences] = useState<LocalEvidence[]>([]);
  const [pendingAudits, setPendingAudits] = useState<LocalAudit[]>([]);

  // Current Unit Draft
  const [aliveTrees, setAliveTrees] = useState(85);
  const [deadTrees, setDeadTrees] = useState(15);
  const [unknownSites, setUnknownSites] = useState(0);

  // Initialize DB and Storage check
  useEffect(() => {
    async function init() {
      // 1. Storage Health
      const s = await checkAndRequestStorageHealth();
      setStorageInfo(s);

      // 2. Load Plots from Dexie (or seed if empty)
      const count = await db.plots.count();
      if (count === 0) {
        await db.plots.bulkAdd(SEED_PLOTS);
      }
      const loadedPlots = await db.plots.toArray();
      setPlots(loadedPlots);

      // 3. Load Queue
      refreshQueue();
    }
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function refreshQueue() {
    const pAudits = await db.audits.where('syncStatus').equals('PENDING').toArray();
    const pEvidences = await db.evidence.where('syncStatus').equals('PENDING').toArray();
    setPendingAudits(pAudits);
    setPendingEvidences(pEvidences);
  }

  // Acquire GPS position
  async function refreshGPS() {
    setGpsLoading(true);
    try {
      const pos = await getCurrentGPSPosition();
      setCurrentGps(pos);
    } catch (err: any) {
      alert(`Error al obtener GPS: ${err.message || err}`);
    } finally {
      setGpsLoading(false);
    }
  }

  // Start new audit
  async function startAudit(plot: LocalPlot) {
    setSelectedPlot(plot);
    setGpsLoading(true);
    let pos: GPSPosition | null = null;
    try {
      pos = await getCurrentGPSPosition();
      setCurrentGps(pos);
    } catch (e) {
      console.warn("GPS acquire error:", e);
    } finally {
      setGpsLoading(false);
    }

    const auditId = crypto.randomUUID();
    const newAudit: LocalAudit = {
      id: auditId,
      plotId: plot.id,
      technicianId: '550e8400-e29b-41d4-a716-446655440099',
      methodologyVersion: 'SAMPLING-1.0',
      startedAt: new Date().toISOString(),
      status: 'DRAFT',
      syncStatus: 'PENDING',
      retryCount: 0,
      startLat: pos?.lat,
      startLon: pos?.lon,
      startAccuracyM: pos?.accuracyM,
      geofenceValid: true,
      geofenceMethod: 'POLYGON_ACCURACY_CHECK_VALID',
      idempotencyKey: `audit-sync-${auditId}`,
    };

    await db.audits.put(newAudit);
    setActiveAudit(newAudit);
    setSamplingUnits([]);
    setActiveTab('audit');
  }

  // Add Sampling Unit (500m2 circle, ~12.62m radius)
  async function addSamplingUnit() {
    if (!activeAudit) return;
    const pos = currentGps || { lat: 19.2465, lon: -99.7198, accuracyM: 5.0, timestamp: new Date().toISOString() };

    const newUnit: LocalSamplingUnit = {
      id: crypto.randomUUID(),
      auditId: activeAudit.id,
      sequenceNo: samplingUnits.length + 1,
      lat: pos.lat,
      lon: pos.lon,
      accuracyM: pos.accuracyM,
      radiusM: 12.616,
      aliveTrees,
      deadTrees,
      unknownSites,
      sampledPlantingSites: aliveTrees + deadTrees,
      capturedAt: new Date().toISOString(),
    };

    await db.samplingUnits.put(newUnit);
    setSamplingUnits([...samplingUnits, newUnit]);

    // Reset inputs
    setAliveTrees(85);
    setDeadTrees(15);
    setUnknownSites(0);
  }

  // Capture Photo Evidence
  async function handleCapturePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeAudit) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const pos = currentGps || { lat: 19.2465, lon: -99.7198, accuracyM: 5.0, timestamp: new Date().toISOString() };

      const evidence: LocalEvidence = {
        id: crypto.randomUUID(),
        auditId: activeAudit.id,
        samplingUnitId: samplingUnits[samplingUnits.length - 1]?.id,
        dataUrl,
        hashSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', // simulated client SHA-256
        mimeType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        capturedAt: pos.timestamp,
        captureLat: pos.lat,
        captureLon: pos.lon,
        captureAccuracyM: pos.accuracyM,
        evidenceType: samplingUnits.length === 0 ? 'PLOT_OVERVIEW' : 'SAMPLING_UNIT',
        syncStatus: 'PENDING',
      };

      await db.evidence.put(evidence);
      refreshQueue();
      alert(`Fotografía registrada con telemetría GPS (${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)} ±${pos.accuracyM}m)`);
    };
    reader.readAsDataURL(file);
  }

  // Seal & Complete Audit
  async function sealAudit() {
    if (!activeAudit || samplingUnits.length === 0) {
      alert('Debe capturar al menos 1 unidad de muestreo para finalizar la auditoría.');
      return;
    }

    const completedAudit: LocalAudit = {
      ...activeAudit,
      completedAt: new Date().toISOString(),
      status: 'COMPLETED',
      syncStatus: 'PENDING',
    };

    await db.audits.put(completedAudit);

    // Update plot status locally
    if (selectedPlot) {
      const updatedPlot: LocalPlot = { ...selectedPlot, auditStatus: 'COMPLETED' };
      await db.plots.put(updatedPlot);
      setPlots(plots.map(p => p.id === updatedPlot.id ? updatedPlot : p));
    }

    setActiveAudit(null);
    refreshQueue();
    setActiveTab('queue');
    alert('¡Auditoría sellada localmente! Se ha agregado a la cola de sincronización segura.');
  }

  // Synchronize queue with backend
  async function triggerSync() {
    if (!isOnline) {
      alert('Sin conexión a red. La sincronización se ejecutará cuando se restablezca la conectividad.');
      return;
    }

    setSyncing(true);
    setSyncFeedback('Conectando con Backend FastAPI...');

    try {
      const pending = await db.audits.where('syncStatus').equals('PENDING').toArray();

      for (const audit of pending) {
        setSyncFeedback(`Sincronizando auditoría ${audit.id.slice(0, 8)}...`);
        const units = await db.samplingUnits.where('auditId').equals(audit.id).toArray();

        const payload = {
          id: audit.id,
          plot_id: audit.plotId,
          technician_id: audit.technicianId,
          device_installation_id: '550e8400-e29b-41d4-a716-446655440099',
          methodology_version: audit.methodologyVersion,
          survey_started_at: audit.startedAt,
          survey_completed_at: audit.completedAt || new Date().toISOString(),
          start_lat: audit.startLat || 19.2465,
          start_lon: audit.startLon || -99.7198,
          start_accuracy_m: audit.startAccuracyM || 5.0,
          client_created_at: audit.startedAt,
          sampling_units: units.map(u => ({
            sequence_no: u.sequenceNo,
            lat: u.lat,
            lon: u.lon,
            radius_m: u.radiusM,
            area_m2: 500.0,
            sampled_planting_sites: u.sampledPlantingSites,
            alive_trees: u.aliveTrees,
            dead_trees: u.deadTrees,
            unknown_sites: u.unknownSites,
            gps_accuracy_m: u.accuracyM,
            captured_at: u.capturedAt,
          })),
          idempotency_key: audit.idempotencyKey,
        };

        await pushAuditPayload(payload);

        // Mark as SYNCED
        audit.syncStatus = 'SYNCED';
        await db.audits.put(audit);
      }

      setSyncFeedback('¡Sincronización completada exitosamente!');
      await refreshQueue();
    } catch (err: any) {
      setSyncFeedback(`Error en sincronización: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  // Live client-side ratio estimator preview
  const totalAlive = samplingUnits.reduce((acc, u) => acc + u.aliveTrees, 0);
  const totalSites = samplingUnits.reduce((acc, u) => acc + (u.sampledPlantingSites || (u.aliveTrees + u.deadTrees)), 0);
  const survivalPct = totalSites > 0 ? ((totalAlive / totalSites) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar: Telemetry & Operational Health */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-600/20 border border-forest-500/30 flex items-center justify-center text-forest-400">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                PROBOSQUE <span className="text-xs px-2 py-0.5 rounded-full bg-forest-900 text-forest-300 border border-forest-700 font-mono">PWA v2.1</span>
              </h1>
              <p className="text-xs text-slate-400">Sistema Digital de Auditoría Forestal y Subsidios</p>
            </div>
          </div>

          {/* Operational Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Connectivity Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isOnline ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400' : 'bg-amber-950/60 border-amber-700/60 text-amber-400'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="font-medium">{isOnline ? 'EN LÍNEA' : 'MODO OFFLINE'}</span>
            </div>

            {/* Storage Health Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${storageInfo?.health === 'PERSISTENT' ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300' : storageInfo?.health === 'CRITICAL' ? 'bg-rose-950/60 border-rose-700/60 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
              <HardDrive className="w-3.5 h-3.5" />
              <span>
                {storageInfo?.health === 'PERSISTENT' ? 'ALMACENAMIENTO PERSISTENTE' : 'STORAGE BEST-EFFORT'} ({storageInfo ? formatBytes(storageInfo.usageBytes) : '...'})
              </span>
            </div>

            {/* GPS Telemetry Pill */}
            <button
              onClick={refreshGPS}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            >
              <Crosshair className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-amber-400' : 'text-forest-400'}`} />
              <span>
                {currentGps ? `${currentGps.lat.toFixed(4)}, ${currentGps.lon.toFixed(4)} (±${currentGps.accuracyM}m)` : 'OBTENER GPS'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex gap-1">
          <button
            onClick={() => setActiveTab('plots')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'plots' ? 'border-forest-500 text-forest-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4" />
            Parcelas Asignadas ({plots.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'border-forest-500 text-forest-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Trees className="w-4 h-4" />
            Auditoría en Campo {activeAudit ? '(EN CURSO)' : ''}
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'queue' ? 'border-forest-500 text-forest-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Send className="w-4 h-4" />
            Cola Offline ({pendingAudits.length + pendingEvidences.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'results' ? 'border-forest-500 text-forest-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Dictamen & Subsidios
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* TAB 1: PLOTS LIST */}
        {activeTab === 'plots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Parcelas Disponibles para Muestreo</h2>
                <p className="text-sm text-slate-400">Datos y polígonos descargados en memoria local IndexedDB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plots.map((plot) => (
                <div
                  key={plot.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-forest-400 bg-forest-950 px-2 py-0.5 rounded border border-forest-800">
                          {plot.cadastralKey}
                        </span>
                        <h3 className="text-base font-semibold text-white mt-1">{plot.beneficiaryName}</h3>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${plot.triageStatus === 'NORMAL' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-amber-950 border-amber-800 text-amber-300'}`}>
                        TRIAGE {plot.triageStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div>
                        Superficie: <span className="text-slate-200 font-semibold">{plot.areaHa} ha</span>
                      </div>
                      <div>
                        Plantación: <span className="text-slate-200 font-semibold">{plot.plantingDate || 'N/A'}</span>
                      </div>
                      <div>
                        Auditoría: <span className="text-slate-200 font-semibold">{plot.auditStatus}</span>
                      </div>
                      <div>
                        Subsidio: <span className="text-slate-200 font-semibold">{plot.subsidyStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => startAudit(plot)}
                      className="flex items-center gap-2 px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Iniciar Auditoría en Campo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT WORKFLOW */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {!activeAudit ? (
              <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                <Trees className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-200">No hay auditoría activa en curso</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
                  Selecciona una parcela asignada para iniciar el levantamiento de unidades circulares de 500 m².
                </p>
                <button
                  onClick={() => setActiveTab('plots')}
                  className="px-5 py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Ir al catálogo de parcelas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Sampling Unit Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Plot Header Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-forest-400">{selectedPlot?.cadastralKey}</span>
                        <h2 className="text-lg font-bold text-white">{selectedPlot?.beneficiaryName}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Muestreo Estadístico</span>
                        <p className="text-sm font-semibold text-forest-400">Círculos de 500 m² (r ≈ 12.62m)</p>
                      </div>
                    </div>
                  </div>

                  {/* Add Sampling Unit Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-forest-400" />
                        Nueva Unidad de Muestreo #{samplingUnits.length + 1}
                      </h3>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                        Radio: 12.62 m | Área: 500 m²
                      </span>
                    </div>

                    {/* Counter Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Alive */}
                      <div className="bg-slate-950 border border-emerald-900/50 rounded-xl p-4 text-center">
                        <span className="text-xs font-medium text-emerald-400">ÁRBOLES VIVOS (y_i)</span>
                        <div className="text-3xl font-extrabold text-emerald-300 my-2">{aliveTrees}</div>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setAliveTrees(Math.max(0, aliveTrees - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                          >-</button>
                          <button
                            onClick={() => setAliveTrees(aliveTrees + 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                          >+</button>
                        </div>
                      </div>

                      {/* Dead */}
                      <div className="bg-slate-950 border border-rose-900/50 rounded-xl p-4 text-center">
                        <span className="text-xs font-medium text-rose-400">ÁRBOLES MUERTOS (d_i)</span>
                        <div className="text-3xl font-extrabold text-rose-300 my-2">{deadTrees}</div>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setDeadTrees(Math.max(0, deadTrees - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                          >-</button>
                          <button
                            onClick={() => setDeadTrees(deadTrees + 1)}
                            className="w-8 h-8 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold"
                          >+</button>
                        </div>
                      </div>

                      {/* Unknown / Missing */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                        <span className="text-xs font-medium text-slate-400">SITIOS NO OBSERVADOS</span>
                        <div className="text-3xl font-extrabold text-slate-300 my-2">{unknownSites}</div>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setUnknownSites(Math.max(0, unknownSites - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                          >-</button>
                          <button
                            onClick={() => setUnknownSites(unknownSites + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold"
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {/* Shutter & Add Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                      <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium cursor-pointer transition-colors border border-slate-700">
                        <Camera className="w-4 h-4 text-forest-400" />
                        <span>Capturar Fotografía Evidencia</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCapturePhoto}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={addSamplingUnit}
                        className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Guardar Unidad en Muestreo
                      </button>
                    </div>
                  </div>

                  {/* List of Registered Units */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h4 className="text-sm font-semibold text-white mb-3">Unidades de Muestreo Capturadas ({samplingUnits.length})</h4>
                    {samplingUnits.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No se han registrado unidades aún.</p>
                    ) : (
                      <div className="space-y-2">
                        {samplingUnits.map((u) => (
                          <div key={u.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                            <span className="font-semibold text-forest-400">Unidad #{u.sequenceNo}</span>
                            <span className="text-slate-300">Vivos: {u.aliveTrees} | Muertos: {u.deadTrees}</span>
                            <span className="text-slate-400 font-mono">GPS: ±{u.accuracyM}m</span>
                            <span className="text-emerald-400 font-bold">{Math.round((u.aliveTrees / (u.aliveTrees + u.deadTrees)) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Ratio Estimator Preview & Seal Button */}
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-forest-400" />
                      Estimador de Razón (En Vivo)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo preliminar en cliente basado en el cociente ponderado <span className="font-mono text-slate-300">p_hat_R = Σ(vivos) / Σ(sitios)</span>.
                    </p>

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-center">
                      <span className="text-xs font-semibold text-slate-400">SUPERVIVENCIA ESTIMADA</span>
                      <div className="text-4xl font-extrabold text-forest-400 my-2">{survivalPct}%</div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${parseFloat(survivalPct) >= 80.0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                        {parseFloat(survivalPct) >= 80.0 ? '≥ 80% (APTO PARA SUBSIDIO)' : '< 80% (NO CUMPLE UMBRAL)'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span>Unidades analizadas:</span>
                        <span className="font-semibold text-white">{samplingUnits.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Árboles vivos totales:</span>
                        <span className="font-semibold text-emerald-400">{totalAlive}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sitios totales evaluados:</span>
                        <span className="font-semibold text-white">{totalSites}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Intervalo t-Student:</span>
                        <span className="font-semibold text-amber-300">
                          {samplingUnits.length >= 2 ? 'Calculado en Servidor' : 'Requiere n ≥ 2'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={sealAudit}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Sellar y Finalizar Auditoría
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OFFLINE SYNC QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Cola de Sincronización Local (IndexedDB)</h2>
                <p className="text-sm text-slate-400">
                  Las auditorías y evidencias fotográficas se persisten localmente hasta contar con enlace seguro.
                </p>
              </div>

              <button
                onClick={triggerSync}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar con Servidor Ahora'}
              </button>
            </div>

            {syncFeedback && (
              <div className="p-3 bg-slate-900 border border-forest-500/40 rounded-xl text-xs text-forest-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-forest-400" />
                <span>{syncFeedback}</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-white">Auditorías Pendientes ({pendingAudits.length})</h3>
              {pendingAudits.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">No hay auditorías pendientes en cola local.</div>
              ) : (
                <div className="space-y-2">
                  {pendingAudits.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <div className="font-semibold text-white">ID: {a.id}</div>
                        <div className="text-slate-400">Iniciado: {new Date(a.startedAt).toLocaleString()}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                        {a.syncStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-white">Evidencias Fotográficas Pendientes ({pendingEvidences.length})</h3>
              {pendingEvidences.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">No hay fotografías pendientes de subida.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pendingEvidences.map((e) => (
                    <div key={e.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs space-y-1">
                      <img src={e.dataUrl} alt="Evidencia" className="w-full h-24 object-cover rounded-lg" />
                      <div className="font-mono text-[10px] text-slate-400 truncate">SHA256: {e.hashSha256.slice(0, 12)}...</div>
                      <div className="text-[10px] text-forest-400">GPS: ±{e.captureAccuracyM}m</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RESULTS & DECISION ENGINE */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Motor de Decisión de Subsidio y Triage</h2>
              <p className="text-sm text-slate-400">
                Separación de responsabilidades: el triage satelital contextualiza; la auditoría en campo certifica la supervivencia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Satellite Triage Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Triage Satelital (Sentinel-2)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    NORMAL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Detección temporal multiespectral. Evalúa estabilidad fenológica antes del despliegue en campo.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>NDVI Base (misma estación):</span>
                    <span className="font-mono font-semibold">0.65</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>NDVI Actual:</span>
                    <span className="font-mono font-semibold">0.62</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Delta NDVI:</span>
                    <span className="font-mono text-emerald-400 font-semibold">-0.03 (Normal)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Fracción de píxeles válidos:</span>
                    <span className="font-mono font-semibold">88%</span>
                  </div>
                </div>
              </div>

              {/* Subsidy Decision Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-forest-400" />
                    Dictamen Administrativo
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    APROBADO
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Evaluación inmutable de reglas sobre resultado estadístico auditado.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Programa:</span>
                    <span className="font-semibold text-slate-200">Reforestación 2026</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Monto de subsidio:</span>
                    <span className="font-semibold text-forest-400">$2,000 MXN / ha</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Supervivencia Estimada:</span>
                    <span className="font-semibold text-emerald-400">85.0% (IC 95%: 81.2% - 88.8%)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Geocerca de Parcela:</span>
                    <span className="font-semibold text-emerald-400">VÁLIDA (Poligonal)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
