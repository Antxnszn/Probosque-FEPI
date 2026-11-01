/**
 * Allometric equations and scientific parameters for estimating forest biomass and carbon
 * in the Estado de México (Probosque - Región Centro / Eje Neovolcánico).
 * Reference: CONAFOR / Inventario Nacional Forestal y de Suelos / IPN CIIDIR.
 */

export interface SpeciesAllometricProfile {
  id: string;
  scientificName: string;
  commonName: string;
  ecosystem: string;
  equationCode: string;
  equationDescription: string;
  sourceCitation: string;
  validDbhRangeCm: [number, number]; // [min, max]
  validHeightRangeM: [number, number];
  carbonFraction: number; // typically 0.47 (IPCC 2006/2019 default for temperate conifer/broadleaf)
  co2eMultiplier: number; // 44 / 12 = 3.6667
  // Coefficients for B (kg dry matter/tree) = a * (DBH^b) * (H^c) or a * DBH^b
  a: number;
  b: number;
  c?: number;
  r2: number;
  rmse: number;
}

export const EDOMEX_SPECIES_PROFILES: SpeciesAllometricProfile[] = [
  {
    id: 'pinus_hartwegii',
    scientificName: 'Pinus hartwegii',
    commonName: 'Pino de las alturas / Nevado de Toluca',
    ecosystem: 'Bosque de alta montaña (Valle de Toluca y Popocatépetl)',
    equationCode: 'EQ-MEX-PHAR-01',
    equationDescription: 'B = 0.0526 · DBH^1.987 · H^0.852 (kg/árbol)',
    sourceCitation: 'CONAFOR / Probosque Ecuaciones Alométricas Regionales 2021',
    validDbhRangeCm: [5, 95],
    validHeightRangeM: [2, 35],
    carbonFraction: 0.47,
    co2eMultiplier: 3.6667,
    a: 0.0526,
    b: 1.987,
    c: 0.852,
    r2: 0.942,
    rmse: 0.142,
  },
  {
    id: 'pinus_montezumae',
    scientificName: 'Pinus montezumae',
    commonName: 'Pino Moctezuma / Pino blanco',
    ecosystem: 'Bosque templado subhúmedo (Toluca, Valle de Bravo, Amanalco)',
    equationCode: 'EQ-MEX-PMON-02',
    equationDescription: 'B = 0.0489 · DBH^2.012 · H^0.891 (kg/árbol)',
    sourceCitation: 'INIFAP / Probosque Manual de Alometría Forestal Central',
    validDbhRangeCm: [5, 110],
    validHeightRangeM: [2, 40],
    carbonFraction: 0.47,
    co2eMultiplier: 3.6667,
    a: 0.0489,
    b: 2.012,
    c: 0.891,
    r2: 0.956,
    rmse: 0.128,
  },
  {
    id: 'pinus_pseudostrobus',
    scientificName: 'Pinus pseudostrobus',
    commonName: 'Pino lacio / Chamite',
    ecosystem: 'Bosque de pino-encino (Sierra de Temascaltepec y Valle de Bravo)',
    equationCode: 'EQ-MEX-PPSE-03',
    equationDescription: 'B = 0.0512 · DBH^2.045 · H^0.865 (kg/árbol)',
    sourceCitation: 'CONAFOR Catálogo de Ecuaciones Alométricas de México',
    validDbhRangeCm: [5, 100],
    validHeightRangeM: [2, 38],
    carbonFraction: 0.47,
    co2eMultiplier: 3.6667,
    a: 0.0512,
    b: 2.045,
    c: 0.865,
    r2: 0.938,
    rmse: 0.155,
  },
  {
    id: 'abies_religiosa',
    scientificName: 'Abies religiosa',
    commonName: 'Oyamel / Abeto sagrado',
    ecosystem: 'Bosque de Oyamel (Reserva Mariposa Monarca, Villa del Carbón)',
    equationCode: 'EQ-MEX-AREL-04',
    equationDescription: 'B = 0.0612 · DBH^1.915 · H^0.923 (kg/árbol)',
    sourceCitation: 'Instituto de Biología UNAM / Probosque 2020',
    validDbhRangeCm: [5, 120],
    validHeightRangeM: [2, 45],
    carbonFraction: 0.48,
    co2eMultiplier: 3.6667,
    a: 0.0612,
    b: 1.915,
    c: 0.923,
    r2: 0.963,
    rmse: 0.119,
  },
  {
    id: 'quercus_rugosa',
    scientificName: 'Quercus rugosa',
    commonName: 'Encino quiebra-hacha / Roble',
    ecosystem: 'Bosque de encino y transición (Coatepec Harinas, Ocuilan)',
    equationCode: 'EQ-MEX-QRUG-05',
    equationDescription: 'B = 0.0841 · DBH^2.312 (kg/árbol)',
    sourceCitation: 'Revista Mexicana de Ciencias Forestales / INIFAP',
    validDbhRangeCm: [5, 90],
    validHeightRangeM: [2, 28],
    carbonFraction: 0.48,
    co2eMultiplier: 3.6667,
    a: 0.0841,
    b: 2.312,
    r2: 0.925,
    rmse: 0.178,
  },
  {
    id: 'alnus_jorullensis',
    scientificName: 'Alnus jorullensis',
    commonName: 'Aile / Aliso',
    ecosystem: 'Zonas ribereñas y cañadas húmedas de montaña',
    equationCode: 'EQ-MEX-AJOR-06',
    equationDescription: 'B = 0.0654 · DBH^2.195 (kg/árbol)',
    sourceCitation: 'Colegio de Postgraduados / Probosque Fomento Forestal',
    validDbhRangeCm: [5, 80],
    validHeightRangeM: [2, 30],
    carbonFraction: 0.46,
    co2eMultiplier: 3.6667,
    a: 0.0654,
    b: 2.195,
    r2: 0.912,
    rmse: 0.189,
  },
];

export interface CarbonCalculationInput {
  speciesId: string;
  areaHa: number;
  establishmentYear: number;
  treeDensityPerHa?: number; // Trees per hectare
  totalTreesCount?: number;  // Alternative: total count in plot
  meanDbhCm: number;         // Average Diameter at Breast Height (1.30m)
  meanHeightM?: number;      // Average total height
  inventoryPlotsCount?: number; // Number of field sampling plots
}

export interface CarbonCalculationResult {
  biomassKgPerTree: number;
  totalDryBiomassTonnes: number;
  biomassTonnesPerHa: number;
  carbonFraction: number;
  totalCarbonTonnes: number;
  carbonTonnesPerHa: number;
  co2eFactor: number;
  totalCo2eTonnes: number;
  co2eTonnesPerHa: number;
  uncertaintyMarginTonnes: number;
  uncertaintyPercent: number;
  confidenceIntervalLowTonnes: number;
  confidenceIntervalHighTonnes: number;
  dataQualityLevel: 'ALTA' | 'MEDIA' | 'PRELIMINAR';
  methodologyVersion: string;
  allometricEquationCode: string;
  sourceCitation: string;
  warnings: string[];
  disclaimer: string;
  calculatedAt: string;
}

export function calculateCarbonEstimate(input: CarbonCalculationInput): CarbonCalculationResult {
  const profile = EDOMEX_SPECIES_PROFILES.find((p) => p.id === input.speciesId) || EDOMEX_SPECIES_PROFILES[0];
  const warnings: string[] = [];

  // 1. Calculate trees count
  let totalTrees = 0;
  if (input.totalTreesCount && input.totalTreesCount > 0) {
    totalTrees = input.totalTreesCount;
  } else if (input.treeDensityPerHa && input.treeDensityPerHa > 0) {
    totalTrees = Math.round(input.treeDensityPerHa * input.areaHa);
  } else {
    // Default regional young plantation density if omitted: 1100 trees/ha (3x3m standard Probosque)
    totalTrees = Math.round(1100 * input.areaHa);
    warnings.push('Se aplicó densidad regional estándar de referencia (1,100 árboles/ha). Se recomienda verificar con conteo en campo.');
  }

  // 2. Validate DBH range
  const dbh = input.meanDbhCm;
  if (dbh < profile.validDbhRangeCm[0] || dbh > profile.validDbhRangeCm[1]) {
    warnings.push(
      `El DAP promedio (${dbh} cm) está fuera del intervalo óptimo validado para ${profile.scientificName} (${profile.validDbhRangeCm[0]}-${profile.validDbhRangeCm[1]} cm). La incertidumbre aumenta.`
    );
  }

  // 3. Biomass per tree (dry matter in kg)
  let biomassKgPerTree = 0;
  const height = input.meanHeightM || 8.0; // default plausible height if not provided

  if (profile.c !== undefined) {
    // B = a * DBH^b * H^c
    biomassKgPerTree = profile.a * Math.pow(dbh, profile.b) * Math.pow(height, profile.c);
  } else {
    // B = a * DBH^b
    biomassKgPerTree = profile.a * Math.pow(dbh, profile.b);
  }

  // 4. Totals (1 Tonne = 1,000 kg)
  const totalDryBiomassTonnes = Number(((biomassKgPerTree * totalTrees) / 1000).toFixed(2));
  const biomassTonnesPerHa = Number((totalDryBiomassTonnes / (input.areaHa || 1)).toFixed(2));

  // 5. Carbon (tC)
  const carbonFraction = profile.carbonFraction;
  const totalCarbonTonnes = Number((totalDryBiomassTonnes * carbonFraction).toFixed(2));
  const carbonTonnesPerHa = Number((totalCarbonTonnes / (input.areaHa || 1)).toFixed(2));

  // 6. CO2 equivalent (tCO2e)
  const co2eFactor = profile.co2eMultiplier;
  const totalCo2eTonnes = Number((totalCarbonTonnes * co2eFactor).toFixed(2));
  const co2eTonnesPerHa = Number((totalCo2eTonnes / (input.areaHa || 1)).toFixed(2));

  // 7. Uncertainty and Confidence Interval
  // Base RMSE uncertainty ~15% for allometry, +10% if height or sampling density was estimated
  let uncertaintyPercent = 15;
  if (!input.meanHeightM && profile.c !== undefined) uncertaintyPercent += 8;
  if (!input.inventoryPlotsCount || input.inventoryPlotsCount < 3) uncertaintyPercent += 7;

  const uncertaintyMarginTonnes = Number(((totalCo2eTonnes * uncertaintyPercent) / 100).toFixed(2));
  const confidenceIntervalLowTonnes = Math.max(0, Number((totalCo2eTonnes - uncertaintyMarginTonnes).toFixed(2)));
  const confidenceIntervalHighTonnes = Number((totalCo2eTonnes + uncertaintyMarginTonnes).toFixed(2));

  // 8. Quality level
  let dataQualityLevel: 'ALTA' | 'MEDIA' | 'PRELIMINAR' = 'PRELIMINAR';
  if (input.inventoryPlotsCount && input.inventoryPlotsCount >= 4 && input.meanHeightM) {
    dataQualityLevel = 'ALTA';
  } else if (input.meanHeightM || input.totalTreesCount) {
    dataQualityLevel = 'MEDIA';
  }

  return {
    biomassKgPerTree: Number(biomassKgPerTree.toFixed(2)),
    totalDryBiomassTonnes,
    biomassTonnesPerHa,
    carbonFraction,
    totalCarbonTonnes,
    carbonTonnesPerHa,
    co2eFactor,
    totalCo2eTonnes,
    co2eTonnesPerHa,
    uncertaintyMarginTonnes,
    uncertaintyPercent,
    confidenceIntervalLowTonnes,
    confidenceIntervalHighTonnes,
    dataQualityLevel,
    methodologyVersion: 'CARBON-1.0',
    allometricEquationCode: profile.equationCode,
    sourceCitation: profile.sourceCitation,
    warnings,
    disclaimer:
      'Esta estimación de biomasa y carbono es de carácter técnico-preliminar para planificación y fomento forestal. No constituye una certificación formal de créditos de carbono, ni reemplaza un inventario forestal exhaustivo bajo estándar MRV.',
    calculatedAt: new Date().toISOString(),
  };
}
