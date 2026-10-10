import { useState } from 'react';
import {
  Trees,
  Calculator,
  Leaf,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  EDOMEX_SPECIES_PROFILES,
  calculateCarbonEstimate,
  type CarbonCalculationInput,
  type CarbonCalculationResult,
} from '../../utils/carbonEquations';

interface CarbonCalculatorPanelProps {
  areaHa: number;
  perimeterM: number;
  isPolygonClosed: boolean;
  verticesCount: number;
  isOnline: boolean;
  onCarbonCalculated?: (result: CarbonCalculationResult) => void;
}

const CURRENT_YEAR = 2026;

export function CarbonCalculatorPanel({
  areaHa,
  perimeterM,
  isPolygonClosed,
  verticesCount,
  isOnline,
  onCarbonCalculated,
}: CarbonCalculatorPanelProps) {
  // Inputs
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('pinus_hartwegii');
  const [establishmentYear, setEstablishmentYear] = useState<number>(2022);
  const [densityType, setDensityType] = useState<'PER_HA' | 'TOTAL_COUNT'>('PER_HA');
  const [treeDensityPerHa, setTreeDensityPerHa] = useState<number>(1100);
  const [manualTotalTrees, setManualTotalTrees] = useState<number>(1100);
  const [meanDbhCm, setMeanDbhCm] = useState<number>(14.5);
  const [meanHeightM, setMeanHeightM] = useState<number>(7.8);
  const [inventoryPlotsCount, setInventoryPlotsCount] = useState<number>(4);

  // Calculation result state
  const [rawResult, setRawResult] = useState<CarbonCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Derived effective trees and result
  const effectiveTotalTrees =
    densityType === 'PER_HA' ? Math.round(treeDensityPerHa * (areaHa || 1)) : manualTotalTrees;
  const result = !isPolygonClosed || areaHa <= 0 ? null : rawResult;

  // Selected species profile
  const profile =
    EDOMEX_SPECIES_PROFILES.find((p) => p.id === selectedSpeciesId) ||
    EDOMEX_SPECIES_PROFILES[0];

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPolygonClosed || areaHa <= 0) return;

    setIsCalculating(true);

    setTimeout(() => {
      const input: CarbonCalculationInput = {
        speciesId: selectedSpeciesId,
        areaHa,
        establishmentYear,
        totalTreesCount: effectiveTotalTrees,
        meanDbhCm,
        meanHeightM: meanHeightM > 0 ? meanHeightM : undefined,
        inventoryPlotsCount: inventoryPlotsCount > 0 ? inventoryPlotsCount : undefined,
      };

      const calcResult = calculateCarbonEstimate(input);
      setRawResult(calcResult);
      setIsCalculating(false);
      if (onCarbonCalculated) {
        onCarbonCalculated(calcResult);
      }
    }, 250);
  };

  // ESTADO A: Sin Polígono
  if (!isPolygonClosed || verticesCount < 3 || areaHa <= 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <Trees className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Calculadora de Biomasa y Carbono</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Dibuja y cierra la parcela en el mapa para calcular automáticamente la superficie y
            estimar el potencial de carbono forestal.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left text-xs space-y-2 text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Guía de trazo de parcela:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
            <li>Haz clic en el mapa para colocar los vértices perimetrales.</li>
            <li>Coloca al menos 3 vértices dentro del Estado de México.</li>
            <li>Haz clic en <strong>"Cerrar Polígono"</strong> para habilitar la estimación.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ESTADO B & C & D: Polígono Cerrado y Formulario
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Estimación Alométrica de Carbono</h3>
              <p className="text-[11px] text-slate-400">Modelos alométricos CONAFOR / Probosque EdoMéx</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {profile.equationCode}
          </span>
        </div>

        {/* Real-time Surface indicator */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 text-[11px]">Superficie trazada:</span>
            <div className="font-bold text-emerald-400 text-sm">{areaHa.toFixed(2)} ha</div>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Perímetro perimetral:</span>
            <div className="font-semibold text-slate-200 text-sm">{perimeterM.toLocaleString()} m</div>
          </div>
        </div>
      </div>

      {/* Input Parameters Form */}
      <form onSubmit={handleCalculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Trees className="w-3.5 h-3.5 text-emerald-400" />
            Parámetros Dasonómicos del Rodal
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Ecuación V1.0</span>
        </div>

        {/* Species selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Especie Forestal Principal
          </label>
          <select
            value={selectedSpeciesId}
            onChange={(e) => setSelectedSpeciesId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            {EDOMEX_SPECIES_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.scientificName} ({p.commonName})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1 italic">{profile.ecosystem}</p>
        </div>

        {/* Tree density / count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">Densidad (árboles/ha)</label>
              <button
                type="button"
                onClick={() => setDensityType(densityType === 'PER_HA' ? 'TOTAL_COUNT' : 'PER_HA')}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                {densityType === 'PER_HA' ? 'Cambiar a total' : 'Cambiar a /ha'}
              </button>
            </div>
            {densityType === 'PER_HA' ? (
              <input
                type="number"
                min="100"
                max="4000"
                step="50"
                value={treeDensityPerHa}
                onChange={(e) => setTreeDensityPerHa(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            ) : (
              <input
                type="number"
                min="10"
                max="500000"
                value={manualTotalTrees}
                onChange={(e) => setManualTotalTrees(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">
              Total estimado: ~{effectiveTotalTrees.toLocaleString()} árboles
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Año de Establecimiento
            </label>
            <input
              type="number"
              min="1990"
              max={CURRENT_YEAR}
              value={establishmentYear}
              onChange={(e) => setEstablishmentYear(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Edad del rodal: ~{CURRENT_YEAR - establishmentYear} años
            </p>
          </div>
        </div>

        {/* Tree metrics: DBH and Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              DAP Promedio (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="2"
              max="150"
              value={meanDbhCm}
              onChange={(e) => setMeanDbhCm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 15.0"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Válido: {profile.validDbhRangeCm[0]}-{profile.validDbhRangeCm[1]} cm
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Altura Media (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="60"
              value={meanHeightM}
              onChange={(e) => setMeanHeightM(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 8.5"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Válido: {profile.validHeightRangeM[0]}-{profile.validHeightRangeM[1]} m
            </p>
          </div>
        </div>

        {/* Sampling sites */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Sitios de Muestreo en Campo (N)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={inventoryPlotsCount}
            onChange={(e) => setInventoryPlotsCount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[10px] text-slate-500 mt-0.5">
            Muestreo recomendado: al menos 3 a 5 unidades de muestreo
          </p>
        </div>

        {/* Calculate button */}
        <button
          type="submit"
          disabled={isCalculating || meanDbhCm <= 0}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          <span>{isCalculating ? 'Calculando biomasa...' : 'Calcular Estimación de Carbono'}</span>
        </button>
      </form>

      {/* ESTADO D: Resultado Disponible */}
      {result && (
        <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl p-4 space-y-3.5 shadow-xl animate-fadeIn">
          {/* Result Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span>Resultados de la Estimación</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                result.dataQualityLevel === 'ALTA'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : result.dataQualityLevel === 'MEDIA'
                  ? 'bg-amber-950 text-amber-400 border-amber-700'
                  : 'bg-slate-800 text-slate-300 border-slate-600'
              }`}
            >
              Calidad {result.dataQualityLevel}
            </span>
          </div>

          {/* Key Metric Highlight Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* CO2 Equivalent Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/60 col-span-2">
              <span className="text-[11px] text-slate-400 font-medium">
                Dióxido de Carbono Equivalente (CO₂e)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {result.totalCo2eTonnes.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-300">tCO₂e</span>
                <span className="text-[11px] text-slate-400 ml-auto font-mono">
                  ({result.co2eTonnesPerHa} t/ha)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Intervalo 90%: {result.confidenceIntervalLowTonnes.toLocaleString()} —{' '}
                {result.confidenceIntervalHighTonnes.toLocaleString()} tCO₂e (±{result.uncertaintyPercent}%)
              </p>
            </div>

            {/* Total Biomass */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400">Biomasa Seca Total</span>
              <div className="font-bold text-slate-100 text-sm font-mono mt-0.5">
                {result.totalDryBiomassTonnes.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-400">t m.s.</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {result.biomassTonnesPerHa} t/ha
              </span>
            </div>

            {/* Carbon Stock */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400">Stock de Carbono (tC)</span>
              <div className="font-bold text-slate-100 text-sm font-mono mt-0.5">
                {result.totalCarbonTonnes.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-slate-400">tC</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {result.carbonTonnesPerHa} tC/ha
              </span>
            </div>
          </div>

          {/* Methodological Details */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] space-y-1 text-slate-300">
            <div className="flex justify-between text-slate-400">
              <span>Metodología:</span>
              <span className="font-mono text-slate-200">{result.methodologyVersion}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Ecuación regional:</span>
              <span className="font-mono text-slate-200">{result.allometricEquationCode}</span>
            </div>
            <div className="text-[10px] text-slate-500 italic mt-1">{result.sourceCitation}</div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-amber-950/50 border border-amber-800/70 rounded-xl p-2.5 text-[11px] text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Observaciones del modelo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-200/90">
                {result.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scientific Disclaimer & Mode */}
          <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-950 p-2 rounded-lg border border-slate-800/60 space-y-1">
            <div><strong>Aviso de rigor:</strong> {result.disclaimer}</div>
            <div className="text-[9px] font-mono text-slate-400">
              Estado: {isOnline ? 'En línea (sincronizable con servidor)' : 'Modo offline (estimación preliminar local)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
