import Dexie, { type Table } from 'dexie';

export type LocalSyncStatus = 'PENDING' | 'UPLOADING' | 'SYNCED' | 'ERROR';

export interface LocalPlot {
  id: string;
  cadastralKey: string;
  beneficiaryName: string;
  areaHa: number;
  plantingDate?: string;
  triageStatus: 'PENDING' | 'NORMAL' | 'ANOMALY' | 'INCONCLUSIVE' | 'ERROR';
  auditStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'UNDER_REVIEW' | 'INVALID';
  subsidyStatus: 'PENDING' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  polygonGeojson: any;
}

export interface LocalAudit {
  id: string;
  plotId: string;
  technicianId: string;
  methodologyVersion: string;
  startedAt: string;
  completedAt?: string;
  status: 'DRAFT' | 'COMPLETED';
  syncStatus: LocalSyncStatus;
  retryCount: number;
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  startLat?: number;
  startLon?: number;
  startAccuracyM?: number;
  geofenceValid?: boolean;
  geofenceMethod?: string;
  idempotencyKey: string;
}

export interface LocalSamplingUnit {
  id: string;
  auditId: string;
  sequenceNo: number;
  lat: number;
  lon: number;
  accuracyM?: number;
  radiusM: number;
  aliveTrees: number;
  deadTrees: number;
  unknownSites: number;
  sampledPlantingSites?: number;
  capturedAt: string;
}

export interface LocalEvidence {
  id: string;
  auditId: string;
  samplingUnitId?: string;
  dataUrl: string; // Base64 data URL for offline preview & sync
  hashSha256: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt?: string;
  captureLat?: number;
  captureLon?: number;
  captureAccuracyM?: number;
  evidenceType: 'PLOT_OVERVIEW' | 'SAMPLING_UNIT' | 'DETAIL' | 'OTHER';
  syncStatus: LocalSyncStatus;
}

export interface LocalDeviceState {
  id: string; // single row, e.g. 'CURRENT_DEVICE'
  deviceInstallationId: string;
  isInstalledPwa: boolean;
  storageHealth: 'PERSISTENT' | 'BEST_EFFORT' | 'CRITICAL';
  storageUsageBytes?: number;
  storageQuotaBytes?: number;
  lastStorageCheckAt?: string;
}

export class ProbosqueDexieDB extends Dexie {
  plots!: Table<LocalPlot, string>;
  audits!: Table<LocalAudit, string>;
  samplingUnits!: Table<LocalSamplingUnit, string>;
  evidence!: Table<LocalEvidence, string>;
  deviceState!: Table<LocalDeviceState, string>;

  constructor() {
    super('ProbosqueFieldDB');
    this.version(1).stores({
      plots: 'id, cadastralKey, auditStatus, triageStatus, subsidyStatus',
      audits: 'id, plotId, technicianId, status, syncStatus',
      samplingUnits: 'id, auditId, sequenceNo',
      evidence: 'id, auditId, samplingUnitId, syncStatus',
      deviceState: 'id',
    });
  }
}

export const db = new ProbosqueDexieDB();
