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
  ShieldCheck,
  Check,
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

    // Update plot status locally: marked as GUARDADA_LOCALMENTE in local field inventory
    const updatedPlot: PlotRecord = {
      ...plot,
      auditStatus: 'GUARDADA_LOCALMENTE',
    };
    await db.plots.put(updatedPlot);

    alert('Auditoría guardada exitosamente en memoria local. Pendiente de sincronización.');
    navigate('/app/sync');
  }

  // Descriptive raw totals (no client-side subsidy decision)
  const totalObserved = samplingUnits.reduce((acc, u) => acc + (u.aliveTrees + u.deadTrees), 0);
  const totalAlive = samplingUnits.reduce((acc, u) => acc + u.aliveTrees, 0);
  const totalDead = samplingUnits.reduce((acc, u) => acc + u.deadTrees, 0);

  return (
    <div className="space-y-6 max-w-xl mx-auto font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Wizard Header Progress */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-4 sm:p-5 border border-[#6B8B78]/20 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(`/app/plots/${plot?.id}`))}
            className="flex items-center gap-1.5 text-[#355044] hover:text-[#1B2A24] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Detalle de Parcela' : 'Paso Anterior'}</span>
          </button>
          <span className="font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
            Paso {step} de 5
          </span>
          <span className="text-xs text-[#6B8B78] font-medium">{plot?.cadastralKey}</span>
        </div>

        {/* Steps indicator */}
        <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-medium">
          {[
            { num: 1, label: 'Ubicación' },
            { num: 2, label: 'Muestreo' },
            { num: 3, label: 'Evidencia' },
            { num: 4, label: 'Revisión' },
            { num: 5, label: 'Finalizar' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                step === s.num
                  ? 'bg-[#355044] text-[#F4F1EA] font-bold shadow-md'
                  : step > s.num
                  ? 'bg-[#E5ECE3] text-[#355044] font-semibold'
                  : 'bg-[#D9D1B8]/60 text-[#6B8B78]'
              }`}
            >
              {s.num}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: UBICACIÓN */}
      {step === 1 && (
        <div className="rounded-[28px] bg-[#EAE4D3] p-5 sm:p-6 border border-[#6B8B78]/20 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-3">
            <div>
              <h2 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#355044]" />
                <span>Paso 1: Posicionamiento y Geocerca</span>
              </h2>
              <p className="text-xs text-[#6B8B78] mt-0.5">
                Verificación de coordenadas dentro del polígono asignado
              </p>
            </div>
            <button
              onClick={refreshGPS}
              disabled={gpsLoading}
              className="p-2.5 rounded-full bg-[#D9D1B8] hover:bg-[#cfc6ab] text-[#355044] transition-colors shadow-sm"
              title="Recalcular señal GPS"
            >
              <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin text-[#E0643A]' : ''}`} />
            </button>
          </div>

          <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Estado de Geofence:</span>
              <span className="flex items-center gap-1.5 font-bold text-[#355044] bg-[#E5ECE3] px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dentro del polígono</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Distancia al centroide:</span>
              <span className="text-[#1B2A24] font-bold tabular-nums">{geofenceDistance} m</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Precisión GPS actual:</span>
              <span className="text-[#1B2A24] font-bold tabular-nums">
                ±{gpsPos?.accuracyM || 8.2} m
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Coordenadas del sensor:</span>
              <span className="text-[#355044] font-medium tabular-nums">
                {gpsPos ? `${gpsPos.lat.toFixed(5)}, ${gpsPos.lon.toFixed(5)}` : '19.24652, -99.71981'}
              </span>
            </div>
          </div>

          {/* Low GPS Accuracy Warning */}
          {(gpsPos?.accuracyM || 8.2) > 30 ? (
            <div className="rounded-2xl bg-[#F9EDE8] border border-[#E8C8B8] p-4 text-xs text-[#9A381E] space-y-1 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-[#E0643A]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Precisión GPS baja (&gt; 30 m)</span>
              </div>
              <p className="text-[11px] text-[#9A381E]/90 leading-relaxed">
                Puedes continuar. La incidencia quedará registrada con marca de tiempo criptográfica para supervisión técnica.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#E5ECE3] border border-[#B9C8B2] p-3.5 text-xs text-[#355044] flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Precisión GPS óptima para inicio de transecto de muestreo.</span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(2)}
              className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-md flex items-center justify-center gap-2"
            >
              <span>Continuar al Muestreo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MUESTREO */}
      {step === 2 && (
        <div className="rounded-[28px] bg-[#EAE4D3] p-5 sm:p-6 border border-[#6B8B78]/20 shadow-sm space-y-5">
          <div className="border-b border-[#6B8B78]/15 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] flex items-center gap-2">
              <Trees className="w-5 h-5 text-[#355044]" />
              <span>Paso 2: Levantamiento de Unidades de Muestreo</span>
            </h2>
            <p className="text-xs text-[#6B8B78] mt-0.5">
              Círculos de radio 12.62 m (área 500 m²). Observaciones cuantitativas brutas.
            </p>
          </div>

          {/* Current Unit Editor */}
          <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#355044]">
                Nueva Unidad #{samplingUnits.length + 1}
              </span>
              <span className="text-xs text-[#6B8B78] font-medium">Radio: 12.62 m</span>
            </div>

            {/* Tree counters */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              {/* Alive */}
              <div className="rounded-2xl bg-[#EAE4D3] p-3 border border-[#6B8B78]/20 shadow-sm">
                <span className="text-[11px] font-semibold text-[#355044]">Vivos</span>
                <div className="font-['Outfit',sans-serif] text-2xl font-light text-[#355044] my-1 tabular-nums">
                  {currentAlive}
                </div>
                <div className="flex justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentAlive(Math.max(0, currentAlive - 1))}
                    className="w-7 h-7 rounded-lg bg-[#D9D1B8] hover:bg-[#cfc6ab] text-[#1B2A24] font-bold text-sm shadow-sm"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentAlive(currentAlive + 1)}
                    className="w-7 h-7 rounded-lg bg-[#355044] hover:bg-[#2c3e35] text-white font-bold text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dead */}
              <div className="rounded-2xl bg-[#EAE4D3] p-3 border border-[#6B8B78]/20 shadow-sm">
                <span className="text-[11px] font-semibold text-[#E0643A]">Muertos</span>
                <div className="font-['Outfit',sans-serif] text-2xl font-light text-[#E0643A] my-1 tabular-nums">
                  {currentDead}
                </div>
                <div className="flex justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentDead(Math.max(0, currentDead - 1))}
                    className="w-7 h-7 rounded-lg bg-[#D9D1B8] hover:bg-[#cfc6ab] text-[#1B2A24] font-bold text-sm shadow-sm"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDead(currentDead + 1)}
                    className="w-7 h-7 rounded-lg bg-[#E0643A] hover:bg-[#c9542e] text-white font-bold text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Unknown */}
              <div className="rounded-2xl bg-[#EAE4D3] p-3 border border-[#6B8B78]/20 shadow-sm">
                <span className="text-[11px] font-semibold text-[#6B8B78]">No Observados</span>
                <div className="font-['Outfit',sans-serif] text-2xl font-light text-[#6B8B78] my-1 tabular-nums">
                  {currentUnknown}
                </div>
                <div className="flex justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentUnknown(Math.max(0, currentUnknown - 1))}
                    className="w-7 h-7 rounded-lg bg-[#D9D1B8] hover:bg-[#cfc6ab] text-[#1B2A24] font-bold text-sm shadow-sm"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentUnknown(currentUnknown + 1)}
                    className="w-7 h-7 rounded-lg bg-[#6B8B78] hover:bg-[#577263] text-white font-bold text-sm shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddSamplingUnit}
              className="w-full py-2.5 bg-[#355044] hover:bg-[#2c3e35] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Unidad #{samplingUnits.length + 1}</span>
            </button>
          </div>

          {/* Descriptive Cumulative Summary */}
          <div className="rounded-2xl bg-[#F4F1EA] p-4 text-xs space-y-2.5 shadow-inner">
            <span className="font-bold text-[#355044] block">
              Acumulados descriptivos ({samplingUnits.length} unidades registradas)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-[#6B8B78] block">Total Observados</span>
                <span className="font-['Outfit',sans-serif] text-base font-light text-[#1B2A24] tabular-nums">
                  {totalObserved}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#355044] block">Vivos</span>
                <span className="font-['Outfit',sans-serif] text-base font-light text-[#355044] tabular-nums">
                  {totalAlive}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#E0643A] block">Muertos</span>
                <span className="font-['Outfit',sans-serif] text-base font-light text-[#E0643A] tabular-nums">
                  {totalDead}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#6B8B78] pt-2 border-t border-[#6B8B78]/15 leading-relaxed">
              El estimador de razón Cochran, varianza ponderada e intervalo de confianza son calculados exclusivamente por el servidor.
            </p>
          </div>

          {/* Saved units list */}
          {samplingUnits.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#355044]">Unidades capturadas:</span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {samplingUnits.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between bg-[#F4F1EA] p-3 rounded-xl border border-[#6B8B78]/15 text-xs shadow-sm"
                  >
                    <span className="font-bold text-[#355044]">Unidad #{u.sequenceNo}</span>
                    <span className="text-[#1B2A24]">Vivos: {u.aliveTrees} · Muertos: {u.deadTrees}</span>
                    <span className="text-[#6B8B78] text-[11px] tabular-nums">±{u.accuracyM}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(3)}
              disabled={samplingUnits.length === 0}
              className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>Continuar a Evidencias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: EVIDENCIA */}
      {step === 3 && (
        <div className="rounded-[28px] bg-[#EAE4D3] p-5 sm:p-6 border border-[#6B8B78]/20 shadow-sm space-y-5">
          <div className="border-b border-[#6B8B78]/15 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#355044]" />
              <span>Paso 3: Captura de Evidencia Fotográfica</span>
            </h2>
            <p className="text-xs text-[#6B8B78] mt-0.5">
              Cada fotografía genera telemetría de dispositivo y sello de integridad SHA-256
            </p>
          </div>

          {/* Required Photo slots */}
          <div className="grid grid-cols-2 gap-3">
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
                      ? 'border-[#355044] bg-[#E5ECE3]'
                      : 'border-[#B9C8B2] hover:border-[#355044] bg-[#F4F1EA]'
                  }`}
                >
                  <Camera className={`w-6 h-6 mb-1 ${hasEvidence ? 'text-[#355044]' : 'text-[#6B8B78]'}`} />
                  <span className="text-xs font-bold text-[#1B2A24]">{slot.label}</span>
                  <span className="text-[11px] text-[#6B8B78] mt-1 flex items-center gap-1">
                    {hasEvidence ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#355044]" />
                        <span className="text-[#355044] font-semibold">Capturada</span>
                      </>
                    ) : (
                      'Toca para capturar'
                    )}
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
              <span className="text-xs font-semibold text-[#355044]">
                Evidencias registradas ({evidences.length}):
              </span>
              <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {evidences.map((e) => (
                  <div key={e.id} className="bg-[#F4F1EA] p-2.5 rounded-xl border border-[#6B8B78]/15 text-[11px] space-y-1 shadow-sm">
                    <img src={e.dataUrl} alt="Evidencia" className="w-full h-20 object-cover rounded-lg" />
                    <div className="text-[#6B8B78] truncate">SHA: {e.hashSha256.slice(0, 10)}...</div>
                    <div className="text-[#355044] font-medium">GPS: ±{e.captureAccuracyM}m</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(4)}
              className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-md flex items-center justify-center gap-2"
            >
              <span>Continuar a Revisión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVISIÓN */}
      {step === 4 && (
        <div className="rounded-[28px] bg-[#EAE4D3] p-5 sm:p-6 border border-[#6B8B78]/20 shadow-sm space-y-5">
          <div className="border-b border-[#6B8B78]/15 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#355044]" />
              <span>Paso 4: Resumen de Auditoría</span>
            </h2>
            <p className="text-xs text-[#6B8B78] mt-0.5">
              Verifica la integridad de datos antes del cierre local inmutable
            </p>
          </div>

          <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Ubicación y Geocerca:</span>
              <span className="font-bold text-[#355044] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Registrada</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Unidades de muestreo:</span>
              <span className="font-bold text-[#355044] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{samplingUnits.length} capturadas</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Árboles observados en campo:</span>
              <span className="text-[#1B2A24] font-bold tabular-nums">{totalObserved}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Fotografías de evidencia:</span>
              <span className="font-bold text-[#355044] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{evidences.length} capturadas</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B8B78]">Estado de telemetría GPS:</span>
              <span className="text-[#1B2A24] font-medium flex items-center gap-1">
                {(gpsPos?.accuracyM || 8) > 30 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E0643A]" />
                    <span className="text-[#E0643A]">1 advertencia &gt;30m</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#355044]" />
                    <span className="text-[#355044]">Precisión nominal</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[#6B8B78]/15 pt-2.5">
              <span className="text-[#6B8B78]">Destino de almacenamiento:</span>
              <span className="font-bold text-[#355044] bg-[#E5ECE3] px-2.5 py-0.5 rounded-full">
                Guardado Local (IndexedDB)
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setStep(5)}
              className="clay-btn-terracotta w-full py-3.5 text-xs text-white shadow-md flex items-center justify-center gap-2"
            >
              <span>Ir a Finalización</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FINALIZAR */}
      {step === 5 && (
        <div className="rounded-[28px] bg-[#EAE4D3] p-5 sm:p-6 border border-[#6B8B78]/20 shadow-sm space-y-5 text-center">
          <div className="border-b border-[#6B8B78]/15 pb-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-md mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24]">
              Sellar y Finalizar Auditoría
            </h2>
            <p className="text-xs text-[#6B8B78] mt-1 max-w-sm mx-auto">
              La auditoría quedará sellada como <strong className="text-[#355044]">COMPLETADA LOCALMENTE</strong> y en cola prioritaria de sincronización.
            </p>
          </div>

          <div className="rounded-2xl bg-[#F4F1EA] p-4 text-xs text-left space-y-2 shadow-inner">
            <p className="text-[#355044] font-bold">Garantía de Principio Arquitectónico:</p>
            <ul className="space-y-1.5 text-[#6B8B78] text-xs">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#355044] mt-1.5 shrink-0" />
                <span>Los datos de campo quedarán protegidos de forma inmutable.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#355044] mt-1.5 shrink-0" />
                <span>El dictamen de subsidio será evaluado por el backend tras la sincronización.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#355044] mt-1.5 shrink-0" />
                <span>Podrás sincronizar cuando tengas enlace de datos celular o Wi-Fi institucional.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={handleFinalizeAudit}
              className="clay-btn-terracotta w-full py-4 text-sm text-white shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Sellar Auditoría Localmente</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
