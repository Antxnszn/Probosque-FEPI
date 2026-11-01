export type UserRole = 'TECHNICIAN' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  region?: string;
  assignedPlotsCount?: number;
  completedAuditsCount?: number;
  deviceModel?: string;
  lastSyncAt?: string;
}

export type TriageClassification = 'NORMAL' | 'ANOMALY' | 'INCONCLUSIVE' | 'PENDIENTE' | 'ERROR';
export type AuditWorkflowStatus = 'PENDIENTE' | 'EN_CURSO' | 'GUARDADA_LOCALMENTE' | 'COMPLETADA' | 'EN_REVISION' | 'CON_INCIDENCIA';
export type SubsidyDecisionStatus = 'PENDIENTE' | 'ELEGIBLE' | 'NO_ELEGIBLE' | 'APROBADO' | 'RECHAZADO' | 'EN_REVISION';
export type SyncStatus = 'PENDING' | 'UPLOADING' | 'SYNCED' | 'ERROR';

export interface PlotRecord {
  id: string;
  cadastralKey: string;
  beneficiaryName: string;
  municipality: string;
  region: string;
  areaHa: number;
  plantingDate: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  triageStatus: TriageClassification;
  auditStatus: AuditWorkflowStatus;
  subsidyStatus: SubsidyDecisionStatus;
  polygonGeojson: {
    type: string;
    coordinates: number[][][];
  };
  // Satellite telemetry
  ndviBase?: number;
  ndviCurrent?: number;
  deltaNdvi?: number;
  satelliteObservationDate?: string;
  satelliteQuality?: 'ALTA' | 'MEDIA' | 'NUBOSA';
  // Statistical results calculated by server
  survivalRate?: number; // e.g. 84.2%
  confidenceIntervalLow?: number; // 79.1%
  confidenceIntervalHigh?: number; // 88.7%
  sampledUnitsCount?: number;
  totalObservedTrees?: number;
  aliveTreesCount?: number;
  deadTreesCount?: number;
  // Administrative metadata
  ruleVersion?: string;
  subsidyAmountMxn?: number;
  evaluatedAt?: string;
  reviewedBy?: string;
}

export interface SamplingUnitRecord {
  id: string;
  auditId: string;
  sequenceNo: number;
  lat: number;
  lon: number;
  accuracyM: number;
  radiusM: number;
  aliveTrees: number;
  deadTrees: number;
  unknownSites: number;
  sampledPlantingSites: number;
  capturedAt: string;
}

export interface EvidenceRecord {
  id: string;
  auditId: string;
  plotId?: string;
  samplingUnitId?: string;
  dataUrl: string;
  hashSha256: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  receivedAt?: string;
  captureLat: number;
  captureLon: number;
  captureAccuracyM: number;
  evidenceType: 'PANORAMICA' | 'MUESTRA_1' | 'MUESTRA_2' | 'MUESTRA_3' | 'COPA' | 'SUELO' | 'GENERAL';
  syncStatus: SyncStatus;
  integrityStatus: 'VALID_HASH' | 'PENDING_VERIFICATION' | 'MISMATCH';
}

export interface AuditRecord {
  id: string;
  plotId: string;
  plotCadastralKey?: string;
  technicianId: string;
  technicianName?: string;
  startedAt: string;
  completedAt?: string;
  syncedAt?: string;
  status: AuditWorkflowStatus;
  syncStatus: SyncStatus;
  startLat: number;
  startLon: number;
  startAccuracyM: number;
  geofenceValid: boolean;
  geofenceDistanceM: number;
  hasGpsWarning?: boolean;
  samplingUnits: SamplingUnitRecord[];
  evidenceCount: number;
  notes?: string;
  idempotencyKey: string;
}

export interface TimelineEvent {
  id: string;
  plotId: string;
  date: string;
  title: string;
  description: string;
  actor: string;
  type: 'TRIAGE' | 'ASSIGNMENT' | 'OFFLINE_AUDIT' | 'SYNC' | 'CALCULATION' | 'REVIEW' | 'SUBSIDY_APPROVAL' | 'SUBSIDY_REJECTION';
}
