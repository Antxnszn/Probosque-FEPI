import Dexie, { type Table } from 'dexie';
import type { PlotRecord, AuditRecord, SamplingUnitRecord, EvidenceRecord, TimelineEvent } from '../types';

export class ProbosqueDexieDB extends Dexie {
  plots!: Table<PlotRecord, string>;
  audits!: Table<AuditRecord, string>;
  samplingUnits!: Table<SamplingUnitRecord, string>;
  evidence!: Table<EvidenceRecord, string>;
  timeline!: Table<TimelineEvent, string>;

  constructor() {
    super('ProbosqueFieldDB_v2');
    this.version(1).stores({
      plots: 'id, cadastralKey, municipality, triageStatus, auditStatus, subsidyStatus, assignedTechnicianId',
      audits: 'id, plotId, technicianId, status, syncStatus',
      samplingUnits: 'id, auditId, sequenceNo',
      evidence: 'id, auditId, samplingUnitId, syncStatus',
      timeline: 'id, plotId, date',
    });
  }
}

export const db = new ProbosqueDexieDB();

export const INITIAL_PLOTS: PlotRecord[] = [
  {
    id: 'plot-pb-00451',
    cadastralKey: 'PB-2026-00451',
    beneficiaryName: 'Braulio Estrada Morales',
    municipality: 'Zinacantepec',
    region: 'Región VII Valle de Toluca',
    areaHa: 4.82,
    plantingDate: '2024-06-15',
    assignedTechnicianId: 'tech-juan-perez',
    assignedTechnicianName: 'Ing. Juan Pérez',
    triageStatus: 'ANOMALY',
    auditStatus: 'COMPLETADA',
    subsidyStatus: 'PENDIENTE',
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
    },
    ndviBase: 0.65,
    ndviCurrent: 0.42,
    deltaNdvi: -0.23,
    satelliteObservationDate: '2026-10-02',
    satelliteQuality: 'ALTA',
    survivalRate: 84.2,
    confidenceIntervalLow: 79.1,
    confidenceIntervalHigh: 88.7,
    sampledUnitsCount: 5,
    totalObservedTrees: 243,
    aliveTreesCount: 205,
    deadTreesCount: 38,
    ruleVersion: 'REFORESTACION_2026_V1.2',
    subsidyAmountMxn: 9640, // 4.82 ha * $2000
    evaluatedAt: '2026-10-07 09:43',
    reviewedBy: 'Dra. Elena Ramos (Supervisor)',
  },
  {
    id: 'plot-pb-00452',
    cadastralKey: 'PB-2026-00452',
    beneficiaryName: 'Comunidad Indígena San Lucas',
    municipality: 'Amanalco de Becerra',
    region: 'Región VIII Valle de Bravo',
    areaHa: 6.15,
    plantingDate: '2024-07-20',
    assignedTechnicianId: 'tech-juan-perez',
    assignedTechnicianName: 'Ing. Juan Pérez',
    triageStatus: 'NORMAL',
    auditStatus: 'EN_CURSO',
    subsidyStatus: 'PENDIENTE',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.9850, 19.0420],
          [-99.9800, 19.0420],
          [-99.9800, 19.0465],
          [-99.9850, 19.0465],
          [-99.9850, 19.0420],
        ]
      ]
    },
    ndviBase: 0.68,
    ndviCurrent: 0.67,
    deltaNdvi: -0.01,
    satelliteObservationDate: '2026-10-03',
    satelliteQuality: 'ALTA',
    survivalRate: undefined,
    sampledUnitsCount: 2,
    totalObservedTrees: 98,
    aliveTreesCount: 88,
    deadTreesCount: 10,
    subsidyAmountMxn: 12300,
  },
  {
    id: 'plot-pb-00453',
    cadastralKey: 'PB-2026-00453',
    beneficiaryName: 'Ejido El Capulín',
    municipality: 'Temascaltepec',
    region: 'Región VI Coatepec Harinas',
    areaHa: 3.50,
    plantingDate: '2024-06-30',
    assignedTechnicianId: 'tech-juan-perez',
    assignedTechnicianName: 'Ing. Juan Pérez',
    triageStatus: 'NORMAL',
    auditStatus: 'PENDIENTE',
    subsidyStatus: 'PENDIENTE',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-100.045, 19.035],
          [-100.040, 19.035],
          [-100.040, 19.039],
          [-100.045, 19.039],
          [-100.045, 19.035],
        ]
      ]
    },
    ndviBase: 0.61,
    ndviCurrent: 0.60,
    deltaNdvi: -0.01,
    satelliteObservationDate: '2026-10-04',
    satelliteQuality: 'ALTA',
    subsidyAmountMxn: 7000,
  },
  {
    id: 'plot-pb-00454',
    cadastralKey: 'PB-2026-00454',
    beneficiaryName: 'Sociedad Cooperativa Monte Alto',
    municipality: 'Valle de Bravo',
    region: 'Región VIII Valle de Bravo',
    areaHa: 8.40,
    plantingDate: '2024-05-10',
    assignedTechnicianId: 'tech-juan-perez',
    assignedTechnicianName: 'Ing. Juan Pérez',
    triageStatus: 'INCONCLUSIVE',
    auditStatus: 'CON_INCIDENCIA',
    subsidyStatus: 'EN_REVISION',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-100.125, 19.185],
          [-100.118, 19.185],
          [-100.118, 19.192],
          [-100.125, 19.192],
          [-100.125, 19.185],
        ]
      ]
    },
    ndviBase: 0.58,
    ndviCurrent: 0.49,
    deltaNdvi: -0.09,
    satelliteObservationDate: '2026-09-28',
    satelliteQuality: 'NUBOSA',
    survivalRate: 71.4,
    confidenceIntervalLow: 62.0,
    confidenceIntervalHigh: 79.5,
    sampledUnitsCount: 4,
    totalObservedTrees: 182,
    aliveTreesCount: 130,
    deadTreesCount: 52,
    subsidyAmountMxn: 16800,
  },
  {
    id: 'plot-pb-00455',
    cadastralKey: 'PB-2026-00455',
    beneficiaryName: 'Rancho La Escondida',
    municipality: 'Villa del Carbón',
    region: 'Región IV Cuautitlán Izcalli',
    areaHa: 5.20,
    plantingDate: '2024-08-01',
    assignedTechnicianId: 'tech-carlos-gomez',
    assignedTechnicianName: 'Biól. Carlos Gómez',
    triageStatus: 'NORMAL',
    auditStatus: 'COMPLETADA',
    subsidyStatus: 'APROBADO',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.455, 19.725],
          [-99.450, 19.725],
          [-99.450, 19.730],
          [-99.455, 19.730],
          [-99.455, 19.725],
        ]
      ]
    },
    ndviBase: 0.69,
    ndviCurrent: 0.71,
    deltaNdvi: 0.02,
    satelliteObservationDate: '2026-10-01',
    satelliteQuality: 'ALTA',
    survivalRate: 91.5,
    confidenceIntervalLow: 87.8,
    confidenceIntervalHigh: 94.2,
    sampledUnitsCount: 6,
    totalObservedTrees: 310,
    aliveTreesCount: 284,
    deadTreesCount: 26,
    subsidyAmountMxn: 10400,
    ruleVersion: 'REFORESTACION_2026_V1.2',
    evaluatedAt: '2026-10-05 14:10',
    reviewedBy: 'Ing. Roberto Silva (Director)',
  },
  {
    id: 'plot-pb-00456',
    cadastralKey: 'PB-2026-00456',
    beneficiaryName: 'Predio El Encinal',
    municipality: 'Ocuilan',
    region: 'Región X Ixtapan de la Sal',
    areaHa: 2.90,
    plantingDate: '2024-07-12',
    assignedTechnicianId: 'tech-carlos-gomez',
    assignedTechnicianName: 'Biól. Carlos Gómez',
    triageStatus: 'ANOMALY',
    auditStatus: 'COMPLETADA',
    subsidyStatus: 'RECHAZADO',
    polygonGeojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-99.410, 18.960],
          [-99.405, 18.960],
          [-99.405, 18.965],
          [-99.410, 18.965],
          [-99.410, 18.960],
        ]
      ]
    },
    ndviBase: 0.64,
    ndviCurrent: 0.38,
    deltaNdvi: -0.26,
    satelliteObservationDate: '2026-10-02',
    satelliteQuality: 'ALTA',
    survivalRate: 64.8,
    confidenceIntervalLow: 58.2,
    confidenceIntervalHigh: 71.0,
    sampledUnitsCount: 4,
    totalObservedTrees: 195,
    aliveTreesCount: 126,
    deadTreesCount: 69,
    subsidyAmountMxn: 5800,
    ruleVersion: 'REFORESTACION_2026_V1.2',
    evaluatedAt: '2026-10-06 11:30',
    reviewedBy: 'Dra. Elena Ramos (Supervisor)',
  }
];

export const INITIAL_TIMELINE: TimelineEvent[] = [
  {
    id: 't-1',
    plotId: 'plot-pb-00451',
    date: '02 Oct 2026 08:30',
    title: 'Triage Satelital Ejecutado',
    description: 'Sentinel-2 L2A detectó caída fenológica (ΔNDVI: -0.23). Clasificación ANOMALY registrada automáticamente.',
    actor: 'Motor Sentinel GEE',
    type: 'TRIAGE',
  },
  {
    id: 't-2',
    plotId: 'plot-pb-00451',
    date: '04 Oct 2026 09:15',
    title: 'Parcela Asignada a Auditoría de Campo',
    description: 'Priorización por anomalía fenológica. Asignada para levantamiento muestral con regla de 5 unidades circulares de 500 m².',
    actor: 'Admin / Sistema Automático',
    type: 'ASSIGNMENT',
  },
  {
    id: 't-3',
    plotId: 'plot-pb-00451',
    date: '06 Oct 2026 11:42',
    title: 'Auditoría Capturada en Modo Offline',
    description: 'Técnico Ing. Juan Pérez capturó 5 unidades muestrales y 8 fotografías georreferenciadas sin conexión celular.',
    actor: 'Ing. Juan Pérez (PWA)',
    type: 'OFFLINE_AUDIT',
  },
  {
    id: 't-4',
    plotId: 'plot-pb-00451',
    date: '07 Oct 2026 09:42',
    title: 'Auditoría Sincronizada con Backend',
    description: 'Recepción por API FastAPI. Idempotencia validada y hashes SHA-256 de 8 evidencias fotográficas verificados.',
    actor: 'Worker Sincronización',
    type: 'SYNC',
  },
  {
    id: 't-5',
    plotId: 'plot-pb-00451',
    date: '07 Oct 2026 09:43',
    title: 'Resultado Estadístico Inmutable Calculado',
    description: 'Estimador de razón Cochran: Supervivencia 84.2%, IC 95%: [79.1%, 88.7%]. Cumple umbral mínimo de 80%.',
    actor: 'Motor Bioestadístico FastAPI',
    type: 'CALCULATION',
  },
  {
    id: 't-6',
    plotId: 'plot-pb-00451',
    date: '07 Oct 2026 10:15',
    title: 'Revisión Administrativa Iniciada',
    description: 'Revisión de telemetría GPS, 1 advertencia por precisión de 32m en unidad #3 aceptada por tolerancia de canopia.',
    actor: 'Dra. Elena Ramos (Supervisor)',
    type: 'REVIEW',
  }
];

export async function initDatabase() {
  const plotCount = await db.plots.count();
  if (plotCount === 0) {
    await db.plots.bulkAdd(INITIAL_PLOTS);
    await db.timeline.bulkAdd(INITIAL_TIMELINE);
  }
}
