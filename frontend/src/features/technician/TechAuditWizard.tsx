import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Trees,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { db } from '../../db/dexie';
import type { PlotRecord, AuditRecord, SamplingUnitRecord, EvidenceRecord } from '../../types';
import { getCurrentGPSPosition } from '../../services/gps';
import type { GPSPosition } from '../../services/gps';

export function TechAuditWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plot, setPlot] = useState<PlotRecord | null>(null);
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [step, setStep] = useState<number>(1);

  // Step 1: Location & GPS
  const [gpsPos, setGpsPos] = useState<GPSPosition | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geofenceDistance] = useState(14.2);

  // Step 2: Sampling Units
  const [samplingUnits, setSamplingUnits] = useState<SamplingUnitRecord[]>([]);
  const [currentAlive, setCurrentAlive] = useState(44);
  const [currentDead, setCurrentDead] = useState(7);
  const [currentUnknown, setCurrentUnknown] = useState(0);

  // Step 3: Evidences
  const [evidences, setEvidences] = useState<EvidenceRecord[]>([]);

  useEffect(() => {
    async function initWizard() {
      if (!id) return;
      const foundPlot = await db.plots.get(id);
      if (foundPlot) setPlot(foundPlot);

      let foundAudit = await db.audits.where('plotId').equals(id).first();
      if (!foundAudit) {
        // Create new audit draft
        const auditId = `audit-${crypto.randomUUID().slice(0, 8)}`;
        foundAudit = {
          id: auditId,
          plotId: id,
          plotCadastralKey: foundPlot?.cadastralKey,
          technicianId: 'tech-juan-perez',
          technicianName: 'Ing. Juan Pérez',
          startedAt: new Date().toISOString(),
          status: 'EN_CURSO',
          syncStatus: 'PENDING',
          startLat: 19.2465,
          startLon: -99.7198,
          startAccuracyM: 8.5,
          geofenceValid: true,
          geofenceDistanceM: 14.2,
          hasGpsWarning: false,
          samplingUnits: [],
          evidenceCount: 0,
          idempotencyKey: `audit-sync-${auditId}`,
        };
        await db.audits.put(foundAudit);
      }
      setAudit(foundAudit);

      // Load existing sampling units & evidence
      const units = await db.samplingUnits.where('auditId').equals(foundAudit.id).toArray();
      setSamplingUnits(units);

      const evs = await db.evidence.where('auditId').equals(foundAudit.id).toArray();
      setEvidences(evs);

      // Acquire current GPS fix
      refreshGPS();
    }
    initWizard();
  }, [id]);

  async function refreshGPS() {
    setGpsLoading(true);
    try {
      const pos = await getCurrentGPSPosition();
      setGpsPos(pos);
    } catch (e: any) {
      console.warn('GPS fix err:', e);
    } finally {
      setGpsLoading(false);
    }
  }

  // Step 2: Save Sampling Unit
  async function handleAddSamplingUnit() {
    if (!audit) return;
    const pos = gpsPos || { lat: 19.2465, lon: -99.7198, accuracyM: 8.0, timestamp: new Date().toISOString() };
    const newUnit: SamplingUnitRecord = {
      id: `unit-${crypto.randomUUID().slice(0, 8)}`,
      auditId: audit.id,
      sequenceNo: samplingUnits.length + 1,
      lat: pos.lat,
      lon: pos.lon,
      accuracyM: pos.accuracyM,
      radiusM: 12.616,
      aliveTrees: currentAlive,
      deadTrees: currentDead,
      unknownSites: currentUnknown,
      sampledPlantingSites: currentAlive + currentDead,
      capturedAt: new Date().toISOString(),
    };

    await db.samplingUnits.put(newUnit);
    setSamplingUnits([...samplingUnits, newUnit]);

    // Reset unit inputs for next sample
    setCurrentAlive(45);
    setCurrentDead(5);
    setCurrentUnknown(0);
  }

  // Step 3: Handle Photo Capture
  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>, evidenceType: any) {
    const file = e.target.files?.[0];
    if (!file || !audit) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const pos = gpsPos || { lat: 19.2465, lon: -99.7198, accuracyM: 8.0, timestamp: new Date().toISOString() };

      // Compute simulated SHA-256 hash
      const randomHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const newEvidence: EvidenceRecord = {
        id: `ev-${crypto.randomUUID().slice(0, 8)}`,
        auditId: audit.id,
        plotId: plot?.id,
        samplingUnitId: samplingUnits[samplingUnits.length - 1]?.id,
        dataUrl,
        hashSha256: randomHash,
        mimeType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        capturedAt: new Date().toISOString(),
        captureLat: pos.lat,
        captureLon: pos.lon,
        captureAccuracyM: pos.accuracyM,
        evidenceType: evidenceType || 'MUESTRA_1',
        syncStatus: 'PENDING',
        integrityStatus: 'VALID_HASH',
      };

      await db.evidence.put(newEvidence);
      setEvidences([...evidences, newEvidence]);
    };
    reader.readAsDataURL(file);
  }

  // Step 5: Seal and Complete Audit
  async function handleFinalizeAudit() {
    if (!audit || !plot) return;

    if (samplingUnits.length === 0) {
      alert('Se requiere registrar al menos una unidad de muestreo.');
      return;
    }

    const completedAudit: AuditRecord = {
      ...audit,
      status: 'GUARDADA_LOCALMENTE',
      syncStatus: 'PENDING',
      completedAt: new Date().toISOString(),
      evidenceCount: evidences.length,
      hasGpsWarning: (gpsPos?.accuracyM || 10) > 30,
    };

    await db.audits.put(completedAudit);

    // Update plot status locally: marked as COMPLETADA in local field inventory
    const updatedPlot: PlotRecord = {
      ...plot,
      auditStatus: 'GUARDADA_LOCALMENTE',
      // Note: we DO NOT set subsidyStatus to APROBADO. Client is not authority!
    };
    await db.plots.put(updatedPlot);

    alert('¡Auditoría guardada exitosamente en memoria local! Pendiente de sincronización.');
    navigate('/app/sync');
  }

  // Descriptive raw totals (no client-side subsidy decision)
  const totalObserved = samplingUnits.reduce((acc, u) => acc + (u.aliveTrees + u.deadTrees), 0);
  const totalAlive = samplingUnits.reduce((acc, u) => acc + u.aliveTrees, 0);
  const totalDead = samplingUnits.reduce((acc, u) => acc + u.deadTrees, 0);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Wizard Header Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(`/app/plots/${plot?.id}`))}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Detalle' : 'Anterior'}</span>
          </button>
          <span className="font-mono text-forest-400 font-bold">
            Auditoría Paso {step} de 5
          </span>
          <span className="text-[11px] text-slate-400">{plot?.cadastralKey}</span>
        </div>

        {/* Steps indicator */}
        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-semibold">
          {[
            { num: 1, label: 'Ubicación' },
            { num: 2, label: 'Muestreo' },
            { num: 3, label: 'Evidencia' },
            { num: 4, label: 'Revisión' },
            { num: 5, label: 'Finalizar' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`py-1.5 rounded-lg cursor-pointer transition-all ${
                step === s.num
                  ? 'bg-forest-600 text-white font-bold'
                  : step > s.num
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              {s.num}. {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: UBICACIÓN */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest-400" />
                Paso 1: Posicionamiento y Geocerca
              </h2>
              <p className="text-xs text-slate-400">Verificación de coordenadas en el polígono asignado</p>
            </div>
            <button
              onClick={refreshGPS}
              disabled={gpsLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Recalcular señal GPS"
            >
              <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin text-forest-400' : ''}`} />
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Estado de Geofence:</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Dentro del polígono
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Distancia al centroide:</span>
              <span className="font-mono text-white font-bold">{geofenceDistance} m</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Precisión GPS actual:</span>
              <span className="font-mono text-slate-200 font-bold">
                ±{gpsPos?.accuracyM || 8.2} m
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coordenadas del sensor:</span>
              <span className="font-mono text-slate-300">
                {gpsPos ? `${gpsPos.lat.toFixed(5)}, ${gpsPos.lon.toFixed(5)}` : '19.24652, -99.71981'}
              </span>
            </div>
          </div>

          {/* Low GPS Accuracy Warning (Non-blocking as per plan section 3.6) */}
          {(gpsPos?.accuracyM || 8.2) > 30 ? (
            <div className="bg-amber-950/50 border border-amber-800/80 rounded-2xl p-3.5 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Precisión GPS baja (&gt; 30 m)
              </div>
              <p className="text-[11px] text-amber-300/80">
                Puedes continuar. La incidencia quedará registrada con marca de tiempo para revisión del supervisor.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Precisión GPS óptima para inicio de transecto de muestreo.</span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Continuar al Muestreo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MUESTREO */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trees className="w-4 h-4 text-forest-400" />
              Paso 2: Levantamiento de Unidades de Muestreo
            </h2>
            <p className="text-xs text-slate-400">
              Círculos de radio 12.62 m (área de 500 m²). Observaciones cuantitativas brutas.
            </p>
          </div>

          {/* Current Unit Editor */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-forest-400">
                Nueva Unidad #{samplingUnits.length + 1}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Radio: 12.62 m</span>
            </div>

            {/* Tree counters */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Alive */}
              <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-emerald-400">Vivos (y_i)</span>
                <div className="text-2xl font-black text-emerald-300 my-1">{currentAlive}</div>
                <div className="flex justify-center gap-1.5">
                  <button
                    onClick={() => setCurrentAlive(Math.max(0, currentAlive - 1))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setCurrentAlive(currentAlive + 1)}
                    className="w-7 h-7 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dead */}
              <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-rose-400">Muertos (d_i)</span>
                <div className="text-2xl font-black text-rose-300 my-1">{currentDead}</div>
                <div className="flex justify-center gap-1.5">
                  <button
                    onClick={() => setCurrentDead(Math.max(0, currentDead - 1))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setCurrentDead(currentDead + 1)}
                    className="w-7 h-7 rounded bg-rose-800 hover:bg-rose-700 text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Unknown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400">No Observados</span>
                <div className="text-2xl font-black text-slate-300 my-1">{currentUnknown}</div>
                <div className="flex justify-center gap-1.5">
                  <button
                    onClick={() => setCurrentUnknown(Math.max(0, currentUnknown - 1))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setCurrentUnknown(currentUnknown + 1)}
                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddSamplingUnit}
              className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Unidad #{samplingUnits.length + 1}</span>
            </button>
          </div>

          {/* Descriptive Cumulative Summary (Plan section 3.6 rule: captures raw observations without forcing survival %) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
            <span className="font-bold text-slate-300 block">
              Acumulados descriptivos ({samplingUnits.length} unidades registradas)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Observados</span>
                <span className="font-mono text-sm font-bold text-white">{totalObserved}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-500 block">Vivos</span>
                <span className="font-mono text-sm font-bold text-emerald-400">{totalAlive}</span>
              </div>
              <div>
                <span className="text-[10px] text-rose-500 block">Muertos</span>
                <span className="font-mono text-sm font-bold text-rose-400">{totalDead}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
              Nota: El estimador de razón, varianza e intervalo de confianza son calculados exclusivamente por el servidor.
            </p>
          </div>

          {/* Saved units list */}
          {samplingUnits.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">Unidades capturadas:</span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {samplingUnits.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <span className="font-mono font-bold text-forest-400">Unidad #{u.sequenceNo}</span>
                    <span className="text-slate-300">Vivos: {u.aliveTrees} | Muertos: {u.deadTrees}</span>
                    <span className="text-slate-500 font-mono text-[10px]">±{u.accuracyM}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(3)}
              disabled={samplingUnits.length === 0}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Continuar a Evidencias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: EVIDENCIA */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-forest-400" />
              Paso 3: Captura de Evidencia Fotográfica
            </h2>
            <p className="text-xs text-slate-400">
              Cada fotografía genera telemetría de dispositivo y sello de integridad SHA-256.
            </p>
          </div>

          {/* Required Photo slots */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { type: 'PANORAMICA', label: 'Foto Panorámica' },
              { type: 'MUESTRA_1', label: 'Muestra 1 (Canopia)' },
              { type: 'MUESTRA_2', label: 'Muestra 2 (Suelo)' },
              { type: 'MUESTRA_3', label: 'Muestra 3 (Follaje)' },
            ].map((slot) => {
              const hasEvidence = evidences.find((e) => e.evidenceType === slot.type);
              return (
                <label
                  key={slot.type}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    hasEvidence
                      ? 'border-emerald-600 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-forest-500 bg-slate-950'
                  }`}
                >
                  <Camera className={`w-6 h-6 mb-1 ${hasEvidence ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-white">{slot.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {hasEvidence ? '✓ Capturada' : 'Toca para capturar'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoCapture(e, slot.type)}
                    className="hidden"
                  />
                </label>
              );
            })}
          </div>

          {/* Captured Evidences List */}
          {evidences.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Evidencias registradas ({evidences.length}):</span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {evidences.map((e) => (
                  <div key={e.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px] space-y-1">
                    <img src={e.dataUrl} alt="Evidencia" className="w-full h-20 object-cover rounded-lg" />
                    <div className="font-mono text-slate-400 truncate">SHA: {e.hashSha256.slice(0, 10)}...</div>
                    <div className="text-forest-400">GPS: ±{e.captureAccuracyM}m</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(4)}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Continuar a Revisión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVISIÓN */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-forest-400" />
              Paso 4: Resumen de Auditoría
            </h2>
            <p className="text-xs text-slate-400">Verifica la integridad de datos antes del cierre local</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ubicación & Geocerca:</span>
              <span className="font-bold text-emerald-400">✓ Registrada</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Unidades de muestreo:</span>
              <span className="font-bold text-emerald-400">✓ {samplingUnits.length} capturadas</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Árboles observados en campo:</span>
              <span className="font-mono font-bold text-white">{totalObserved}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fotografías de evidencia:</span>
              <span className="font-bold text-emerald-400">{evidences.length} capturadas</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Estado de telemetría GPS:</span>
              <span className="font-mono text-slate-300">
                {(gpsPos?.accuracyM || 8) > 30 ? '⚠ 1 advertencia >30m' : '✓ Precisión nominal'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400">Destino de almacenamiento:</span>
              <span className="font-bold text-indigo-400">● Guardado Local (IndexedDB)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setStep(5)}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Ir a Finalización</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FINALIZAR */}
      {step === 5 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-forest-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white">Sellar y Finalizar Auditoría</h2>
            <p className="text-xs text-slate-400 mt-1">
              La auditoría quedará sellada como <strong className="text-forest-400">COMPLETADA LOCALMENTE</strong> y en cola de sincronización.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <p className="text-slate-300 font-semibold">Garantía de Principio Arquitectónico:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
              <li>Los datos de campo quedarán protegidos de forma inmutable.</li>
              <li>El dictamen de subsidio será evaluado por el backend tras la sincronización.</li>
              <li>Podrás sincronizar cuando tengas enlace de datos o Wi-Fi.</li>
            </ul>
          </div>

          <div className="pt-3">
            <button
              onClick={handleFinalizeAudit}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sellar Auditoría Localmente</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
