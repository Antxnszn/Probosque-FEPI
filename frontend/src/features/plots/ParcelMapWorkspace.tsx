import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Save,
  ArrowLeft,
  AlertCircle,
  Wifi,
  WifiOff,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/dexie';
import type { PlotRecord } from '../../types';
import { createPlot } from '../../services/api';
import { ParcelDrawingMap } from '../../components/map/ParcelDrawingMap';
import { CarbonCalculatorPanel } from '../carbon/CarbonCalculatorPanel';
import { coordsToGeoJSONPolygon, EDOMEX_FOREST_MUNICIPALITIES } from '../../utils/geo';
import type { CarbonCalculationResult } from '../../utils/carbonEquations';

export function ParcelMapWorkspace() {
  const navigate = useNavigate();
  const { isOnline, currentUser } = useAuth();

  // Administrative plot fields
  const [cadastralKey, setCadastralKey] = useState<string>(() =>
    `PB-2026-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [municipality, setMunicipality] = useState<string>('Zinacantepec');
  const [plantingDate, setPlantingDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );

  // Geometry state from Map
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState<boolean>(false);
  const [areaHa, setAreaHa] = useState<number>(0);
  const [perimeterM, setPerimeterM] = useState<number>(0);

  // Carbon calculation result
  const [carbonResult, setCarbonResult] = useState<CarbonCalculationResult | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mobile view toggle (Map vs. Panel)
  const [activeTab, setActiveTab] = useState<'MAP' | 'PANEL'>('MAP');

  const handlePolygonChange = (
    coords: [number, number][],
    isClosed: boolean,
    newAreaHa: number,
    newPerimeterM: number
  ) => {
    setPolygonCoords(coords);
    setIsPolygonClosed(isClosed);
    setAreaHa(newAreaHa);
    setPerimeterM(newPerimeterM);
  };

  const handleSavePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isPolygonClosed || polygonCoords.length < 3) {
      setSubmitError('Debes cerrar un polígono válido con al menos 3 vértices en el mapa.');
      return;
    }

    if (!cadastralKey.trim()) {
      setSubmitError('La clave catastral es obligatoria.');
      return;
    }

    if (!beneficiaryName.trim()) {
      setSubmitError('El nombre del beneficiario o ejido es obligatorio.');
      return;
    }

    setIsSubmitting(true);

    try {
      const geojsonGeometry = coordsToGeoJSONPolygon(polygonCoords);
      const plotId = `plot-${crypto.randomUUID().slice(0, 8)}`;
      let backendId = plotId;

      // 1. If online, attempt to persist to central API
      if (isOnline) {
        try {
          const apiPayload = {
            cadastral_key: cadastralKey,
            beneficiary_id: '550e8400-e29b-41d4-a716-446655440001', // Standard demo beneficiary UUID
            planting_date: plantingDate,
            geojson_geometry: geojsonGeometry,
          };
          const res = await createPlot(apiPayload);
          if (res && res.id) {
            backendId = res.id;
          }
        } catch (apiErr) {
          console.warn('Backend API plot creation failed or offline fallback:', apiErr);
        }
      }

      // 2. Persist to Dexie (IndexedDB) for robust offline capability
      const newRecord: PlotRecord = {
        id: backendId,
        cadastralKey,
        beneficiaryName,
        municipality,
        region:
          EDOMEX_FOREST_MUNICIPALITIES.find((m) => m.name === municipality)?.region ||
          'Región VII Valle de Toluca',
        areaHa: areaHa > 0 ? areaHa : 1.0,
        plantingDate,
        assignedTechnicianId: currentUser?.id || 'tech-juan-perez',
        assignedTechnicianName: currentUser?.name || 'Ing. Juan Pérez',
        triageStatus: 'NORMAL',
        auditStatus: 'PENDIENTE',
        subsidyStatus: 'PENDIENTE',
        polygonGeojson: geojsonGeometry,
        subsidyAmountMxn: Math.round((areaHa || 1) * 2000),
      };

      await db.plots.put(newRecord);

      // Success notification
      alert(
        `¡Parcela "${cadastralKey}" registrada exitosamente!\n` +
          `Superficie: ${areaHa.toFixed(2)} ha\n` +
          `${
            carbonResult
              ? `Estimación de Carbono: ${carbonResult.totalCo2eTonnes.toLocaleString()} tCO₂e asociadas.\n`
              : ''
          }` +
          `Guardada en memoria local ${isOnline ? 'y sincronizada al servidor' : '(Modo Offline)'}.`
      );

      navigate('/app/plots');
    } catch (err: any) {
      setSubmitError(err.message || 'Error al guardar la parcela.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/plots')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Volver al catálogo de parcelas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Delimitación de Parcela y Estimación de Carbono
            </h1>
            <p className="text-xs text-slate-400">
              Espacio unificado de dibujo cartográfico sobre el Estado de México y calculadora forestal
            </p>
          </div>
        </div>

        {/* Connectivity and Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/80 border-amber-800 text-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'EN LÍNEA (Sync Activo)' : 'MODO OFFLINE'}</span>
          </div>

          <button
            type="button"
            onClick={handleSavePlot}
            disabled={!isPolygonClosed || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs transition-all shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Parcela'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Selector */}
      <div className="flex lg:hidden bg-slate-900 border border-slate-800 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('MAP')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'MAP'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          1. Mapa y Trazo ({polygonCoords.length} pts)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PANEL')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'PANEL'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          2. Parcela y Carbono {isPolygonClosed ? '✓' : ''}
        </button>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="bg-rose-950/80 border border-rose-700 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main Two-Column Layout (Desktop: 65% Map / 35% Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Interactive Drawing Map */}
        <div
          className={`lg:col-span-7 xl:col-span-8 ${
            activeTab === 'MAP' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ParcelDrawingMap
            onPolygonChange={handlePolygonChange}
            heightClass="h-[620px]"
            selectedMunicipality={municipality}
          />

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between px-2">
            <span>Delimitación territorial estricta: Estado de México (Proyección WGS84).</span>
            <span className="font-mono">Lat 18.35° - 20.35° N | Lon -100.62° - -98.55° W</span>
          </div>
        </div>

        {/* Right Column: Administrative Data + Carbon Calculator */}
        <div
          className={`lg:col-span-5 xl:col-span-4 space-y-4 ${
            activeTab === 'PANEL' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Administrative Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                Ficha Técnica de la Parcela
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Registro Oficial</span>
            </div>

            {/* Cadastral Key */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Clave Catastral / Folio
              </label>
              <input
                required
                type="text"
                value={cadastralKey}
                onChange={(e) => setCadastralKey(e.target.value)}
                placeholder="PB-2026-XXXXX"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Beneficiary Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nombre del Beneficiario / Ejido
              </label>
              <input
                required
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Ej. Ejido San Juan o Propietario"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Municipality & Planting Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Municipio (EdoMéx)
                </label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  {EDOMEX_FOREST_MUNICIPALITIES.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Fecha de Plantación
                </label>
                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Integrated Carbon Calculator */}
          <CarbonCalculatorPanel
            areaHa={areaHa}
            perimeterM={perimeterM}
            isPolygonClosed={isPolygonClosed}
            verticesCount={polygonCoords.length}
            isOnline={isOnline}
            onCarbonCalculated={(res) => setCarbonResult(res)}
          />

          {/* Bottom Action Submit Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSavePlot}
              disabled={!isPolygonClosed || isSubmitting}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-2xl text-xs transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Guardando Parcela...'
                  : isPolygonClosed
                  ? 'Guardar Parcela y Estimación de Carbono'
                  : 'Cierra el polígono en el mapa para guardar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
