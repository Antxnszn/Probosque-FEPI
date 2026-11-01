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
      <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/20 p-6 text-center space-y-4 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-md">
          <Trees className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24]">
            Calculadora de Biomasa y Carbono
          </h3>
          <p className="text-xs text-[#6B8B78] mt-1 max-w-sm mx-auto leading-relaxed">
            Dibuja y cierra la parcela en el mapa para calcular automáticamente la superficie y estimar el potencial de captura de carbono forestal.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F4F1EA] p-4 text-left text-xs space-y-2 text-[#6B8B78] shadow-inner">
          <div className="flex items-center gap-2 text-[#355044] font-semibold">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Guía de trazo de parcela:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-[#1B2A24]">
            <li>Haz clic en el mapa para colocar los vértices perimetrales.</li>
            <li>Coloca al menos 3 vértices dentro del Estado de México.</li>
            <li>Haz clic en <strong>"Cerrar Polígono"</strong> para habilitar la estimación alométrica.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ESTADO B & C & D: Polígono Cerrado y Formulario
  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header Section */}
      <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/20 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#355044] text-[#F4F1EA] shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24]">
                Estimación Alométrica de Carbono
              </h3>
              <p className="text-xs text-[#6B8B78]">Modelos alométricos CONAFOR / Probosque EdoMéx</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D9D1B8] text-[#355044]">
            {profile.equationCode}
          </span>
        </div>

        {/* Real-time Surface indicator */}
        <div className="grid grid-cols-2 gap-2.5 bg-[#F4F1EA] p-3 rounded-2xl shadow-inner text-xs">
          <div>
            <span className="text-[#6B8B78] block">Superficie trazada:</span>
            <div className="font-['Outfit',sans-serif] font-medium text-[#355044] text-lg tabular-nums">
              {areaHa.toFixed(2)} ha
            </div>
          </div>
          <div>
            <span className="text-[#6B8B78] block">Perímetro medido:</span>
            <div className="font-semibold text-[#1B2A24] text-sm tabular-nums mt-0.5">
              {perimeterM.toLocaleString()} m
            </div>
          </div>
        </div>
      </div>

      {/* Input Parameters Form */}
      <form onSubmit={handleCalculate} className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/20 p-5 space-y-4 text-xs shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-2.5">
          <span className="font-bold text-[#1B2A24] flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-[#355044]" />
            <span>Parámetros Dasonómicos del Rodal</span>
          </span>
          <span className="text-xs text-[#6B8B78] font-medium">Ecuación V1.0</span>
        </div>

        {/* Species selector */}
        <div>
          <label className="block text-xs font-semibold text-[#1B2A24] mb-1">
            Especie Forestal Principal
          </label>
          <select
            value={selectedSpeciesId}
            onChange={(e) => setSelectedSpeciesId(e.target.value)}
            className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] text-xs focus:outline-none focus:border-[#355044] shadow-inner cursor-pointer"
          >
            {EDOMEX_SPECIES_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.scientificName} ({p.commonName})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#6B8B78] mt-1">{profile.ecosystem}</p>
        </div>

        {/* Tree density / count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#1B2A24]">Densidad (árboles/ha)</label>
              <button
                type="button"
                onClick={() => setDensityType(densityType === 'PER_HA' ? 'TOTAL_COUNT' : 'PER_HA')}
                className="text-[11px] text-[#355044] font-semibold hover:underline cursor-pointer"
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
                className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
              />
            ) : (
              <input
                type="number"
                min="10"
                max="500000"
                value={manualTotalTrees}
                onChange={(e) => setManualTotalTrees(Number(e.target.value))}
                className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
              />
            )}
            <p className="text-[11px] text-[#6B8B78] mt-1">
              Total estimado: ~{effectiveTotalTrees.toLocaleString()} árboles
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1B2A24] mb-1">
              Año de Establecimiento
            </label>
            <input
              type="number"
              min="1990"
              max={CURRENT_YEAR}
              value={establishmentYear}
              onChange={(e) => setEstablishmentYear(Number(e.target.value))}
              className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
            />
            <p className="text-[11px] text-[#6B8B78] mt-1">
              Edad del rodal: ~{CURRENT_YEAR - establishmentYear} años
            </p>
          </div>
        </div>

        {/* Tree metrics: DBH and Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1B2A24] mb-1">
              DAP Promedio (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="2"
              max="150"
              value={meanDbhCm}
              onChange={(e) => setMeanDbhCm(Number(e.target.value))}
              className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
              placeholder="Ej. 15.0"
            />
            <p className="text-[11px] text-[#6B8B78] mt-1">
              Válido: {profile.validDbhRangeCm[0]}-{profile.validDbhRangeCm[1]} cm
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1B2A24] mb-1">
              Altura Media (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="60"
              value={meanHeightM}
              onChange={(e) => setMeanHeightM(Number(e.target.value))}
              className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
              placeholder="Ej. 8.5"
            />
            <p className="text-[11px] text-[#6B8B78] mt-1">
              Válido: {profile.validHeightRangeM[0]}-{profile.validHeightRangeM[1]} m
            </p>
          </div>
        </div>

        {/* Sampling sites */}
        <div>
          <label className="block text-xs font-semibold text-[#1B2A24] mb-1">
            Sitios de Muestreo en Campo (N)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={inventoryPlotsCount}
            onChange={(e) => setInventoryPlotsCount(Number(e.target.value))}
            className="w-full bg-[#F4F1EA] border border-[#D9D1B8] rounded-xl px-3.5 py-2.5 text-[#1B2A24] font-medium focus:outline-none focus:border-[#355044] shadow-inner"
          />
          <p className="text-[11px] text-[#6B8B78] mt-1">
            Muestreo recomendado: al menos 3 a 5 unidades de muestreo
          </p>
        </div>

        {/* Calculate button */}
        <button
          type="submit"
          disabled={isCalculating || meanDbhCm <= 0}
          className="clay-btn-terracotta w-full py-3 px-4 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <Calculator className="w-4 h-4" />
          <span>{isCalculating ? 'Calculando biomasa...' : 'Calcular Estimación de Carbono'}</span>
        </button>
      </form>

      {/* ESTADO D: Resultado Disponible */}
      {result && (
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/25 p-5 space-y-4 shadow-sm animate-fadeIn">
          {/* Result Header */}
          <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1B2A24]">
              <Leaf className="w-4 h-4 text-[#355044]" />
              <span>Resultados de la Estimación</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-0.5 rounded-full shadow-sm ${
                result.dataQualityLevel === 'ALTA'
                  ? 'bg-[#E5ECE3] text-[#355044]'
                  : result.dataQualityLevel === 'MEDIA'
                  ? 'bg-[#F9EDE8] text-[#9A381E]'
                  : 'bg-[#D9D1B8] text-[#1B2A24]'
              }`}
            >
              Calidad {result.dataQualityLevel}
            </span>
          </div>

          {/* Key Metric Highlight Cards */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {/* CO2 Equivalent Card */}
            <div className="bg-[#F4F1EA] p-4 rounded-2xl shadow-inner col-span-2 space-y-1">
              <span className="text-xs text-[#6B8B78] font-medium">
                Dióxido de Carbono Equivalente (CO₂e)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-['Outfit',sans-serif] text-3xl font-light text-[#355044] tabular-nums">
                  {result.totalCo2eTonnes.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#1B2A24]">tCO₂e</span>
                <span className="text-xs text-[#6B8B78] ml-auto tabular-nums">
                  ({result.co2eTonnesPerHa} t/ha)
                </span>
              </div>
              <p className="text-[11px] text-[#6B8B78] mt-1.5 tabular-nums">
                Intervalo 90%: {result.confidenceIntervalLowTonnes.toLocaleString()} —{' '}
                {result.confidenceIntervalHighTonnes.toLocaleString()} tCO₂e (±{result.uncertaintyPercent}%)
              </p>
            </div>

            {/* Total Biomass */}
            <div className="bg-[#F4F1EA] p-3.5 rounded-2xl shadow-inner space-y-0.5">
              <span className="text-[11px] text-[#6B8B78]">Biomasa Seca Total</span>
              <div className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
                {result.totalDryBiomassTonnes.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#6B8B78]">t m.s.</span>
              </div>
              <span className="text-[11px] text-[#6B8B78] block tabular-nums">
                {result.biomassTonnesPerHa} t/ha
              </span>
            </div>

            {/* Carbon Stock */}
            <div className="bg-[#F4F1EA] p-3.5 rounded-2xl shadow-inner space-y-0.5">
              <span className="text-[11px] text-[#6B8B78]">Stock de Carbono (tC)</span>
              <div className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] tabular-nums">
                {result.totalCarbonTonnes.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#6B8B78]">tC</span>
              </div>
              <span className="text-[11px] text-[#6B8B78] block tabular-nums">
                {result.carbonTonnesPerHa} tC/ha
              </span>
            </div>
          </div>

          {/* Methodological Details */}
          <div className="bg-[#F4F1EA] p-3 rounded-2xl shadow-inner text-xs space-y-1 text-[#6B8B78]">
            <div className="flex justify-between">
              <span>Metodología:</span>
              <span className="font-medium text-[#1B2A24]">{result.methodologyVersion}</span>
            </div>
            <div className="flex justify-between">
              <span>Ecuación regional:</span>
              <span className="font-medium text-[#1B2A24]">{result.allometricEquationCode}</span>
            </div>
            <div className="text-[11px] text-[#6B8B78] mt-1 pt-1 border-t border-[#6B8B78]/15 leading-relaxed">
              {result.sourceCitation}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-2xl bg-[#F9EDE8] border border-[#E8C8B8] p-3 text-xs text-[#9A381E] space-y-1 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-[#E0643A]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#E0643A]" />
                <span>Observaciones del modelo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#9A381E]/90">
                {result.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scientific Disclaimer & Mode */}
          <div className="text-[11px] text-[#6B8B78] leading-relaxed bg-[#F4F1EA] p-3 rounded-2xl shadow-inner space-y-1">
            <div><strong>Aviso de rigor:</strong> {result.disclaimer}</div>
            <div className="text-[10px] text-[#355044] font-medium pt-1 border-t border-[#6B8B78]/15">
              Estado: {isOnline ? 'En línea (sincronizable con servidor)' : 'Modo offline (estimación preliminar local)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
