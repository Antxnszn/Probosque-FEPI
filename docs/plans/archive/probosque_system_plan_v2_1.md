# Technical Implementation Plan — Probosque Forest Audit and Subsidy System

**Author:** Roberto Navarro  
**Original plan date:** September 28, 2026  
**Revision date:** October 6, 2026  
**Version:** 2.1  
**Status:** Revised technical draft — implementation baseline pending scientific and operational validation

---

## 1. Executive Summary

The objective of this plan is to modernize the complete audit and forest-subsidy workflow for Probosque, replacing the analog process of field counting, paper capture and duplicate Excel entry with a digital, traceable and offline-capable system.

The architecture remains hybrid, but the decision model changes materially. The first version treated satellite measurements as a restrictive gate that could collapse environmental observations into an automatic subsidy outcome. Version 2 separates three concerns that must not be conflated:

1. **Satellite triage:** identifies plots whose vegetation signal is anomalous or whose satellite evidence is insufficient. It prioritizes and contextualizes field work; it does not certify tree survival by itself.
2. **Field audit:** remains the authoritative source for the program's survival measurement. The audit is based on explicit sampling units, counts and statistical estimation rather than a single aggregate count.
3. **Carbon assessment:** is an independent analytical product using Sentinel-2 and GEDI where data quality and spatial coverage permit. It does not decide subsidy eligibility.

The resulting workflow is:

```text
                    ┌──────────────────────────┐
                    │       SATELLITE          │
                    │   Triage / anomaly      │
                    │  Sentinel-2 + quality   │
                    └────────────┬─────────────┘
                                 │
                   NORMAL / ANOMALY / INCONCLUSIVE
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │       FIELD PWA          │
                    │  Offline audit + GPS +   │
                    │  sampling + evidence     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   SCIENTIFIC AUDIT       │
                    │ survival estimate + CI   │
                    │ methodology version      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   SUBSIDY RULES ENGINE   │
                    │ program/rule version     │
                    │ reviewer + traceability  │
                    └──────────────────────────┘

             Independently:

       Sentinel-2 + GEDI + field inventory
                    │
                    ▼
             CARBON ASSESSMENT
          biomass + uncertainty
```

### Scope decision: one responsive PWA, not a native mobile application

The field layer will be implemented as a **Progressive Web App (PWA)** using **React + Vite + TypeScript + TailwindCSS**. There will be no Flutter, React Native or other native mobile application in the target architecture.

The PWA must be designed around the actual constraints of field browsers:

- offline-capable application shell;
- local persistence in IndexedDB;
- offline queue for audits and evidence;
- GPS acquisition through the browser Geolocation API;
- camera capture through browser-supported media/input capabilities;
- bounded offline map packs;
- synchronization when connectivity is available;
- graceful degradation when browser capabilities or background execution are unavailable.

The backend remains the system of record.

**Operational PWA baseline:** field technicians are required to use the installed PWA, not a normal browser tab, for production audits. At application startup the client requests persistent storage with `navigator.storage.persist()`, reads `navigator.storage.persisted()` and `navigator.storage.estimate()`, and exposes a visible storage-health indicator. The application must never imply that browser storage is indestructible: WebKit/Safari can evict origin data under quota pressure, storage pressure or prolonged non-interaction, while persistent storage can exempt an origin from ordinary eviction behavior when granted.

**Synchronization baseline:** Background Sync is an optional optimization, not a correctness dependency. The reliable path is foreground synchronization on app open/resume, explicit retry and connectivity recovery because the Background Synchronization API is not uniformly available across browsers.

---

## 2. General Architecture

### 2.1 Target architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIELD PWA — LAYER 2                                │
│ React · Vite · TypeScript · TailwindCSS · IndexedDB · MapLibre             │
│                                                                             │
│ Plot assignment → offline map → GPS/geofence → sampling → photos → queue  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTPS / JSON / multipart
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND — LAYER 3                                      │
│ FastAPI · PostgreSQL/PostGIS · Redis · Celery · MinIO/S3                  │
│                                                                             │
│ Auth · Plot management · Audit API · Sync API · Decision engine · Admin UI │
└───────────────┬───────────────────────────────┬─────────────────────────────┘
                │                               │
                │                               │ asynchronous jobs
                ▼                               ▼
┌───────────────────────────┐       ┌────────────────────────────────────────┐
│     SATELLITE SERVICES    │       │          EVIDENCE / STORAGE            │
│ Python · GEE · Sentinel-2 │       │ MinIO/S3 · SHA-256 · metadata          │
│ temporal triage            │       │ immutable audit evidence              │
└───────────────┬───────────┘       └────────────────────────────────────────┘
                │
                ├───────────────┐
                ▼               ▼
        TRIAGE ASSESSMENT   CARBON ASSESSMENT
        NORMAL/ANOMALY/      Sentinel-2 + GEDI
        INCONCLUSIVE         + field inventory
```

### 2.2 Architectural principles

| Principle | Implementation rule |
|---|---|
| Backend is source of truth | The server owns final persisted state and administrative outcomes. |
| Evidence is immutable | Completed audits, photos and satellite assessment records are append-only; corrections are revisions/amendments. |
| Workflow state is separate from evidence | `triage_status`, `audit_status`, `subsidy_status` and `sync_status` are independent concerns. |
| Satellite is triage, not census | Sentinel-2 detects vegetation patterns/anomalies; it does not directly certify survival. |
| Field audit is statistical | A field audit records explicit sampling units and produces an estimate plus uncertainty. |
| Carbon is independent | Biomass/CO₂e results do not participate directly in subsidy approval. |
| Offline by design | The PWA remains usable without connectivity and resumes synchronization later. |
| Installed-PWA operational mode | Production field audits run only from the installed/standalone PWA experience. |
| Storage health is explicit | Persistent-storage request, quota estimate and storage-health state are visible before and during field work. |
| Browser metadata is supplementary | Photo EXIF is optional corroborating evidence; capture GPS/time are first-class event data captured by the application. |
| Browser background sync is optional | Correctness does not depend on Background Sync; foreground retry is mandatory. |
| No invented spatial resolution | Reprojecting/resampling an image does not create information beyond its native spatial resolution. |
| Explainable first | Version 2 uses explicit, inspectable rules; ML is deferred until a labeled dataset exists. |
| Calibrated parameters | Thresholds, equations and methodological assumptions are versioned configuration, not hidden constants. |

---

## 3. Technology Stack and Dependencies

### 3.1 Satellite and geospatial processing

| Component | Technology | Role |
|---|---|---|
| Language | Python 3.12+ | Scientific and service code |
| Satellite platform | Google Earth Engine | Remote processing of Sentinel-2/GEDI data |
| Sentinel-2 | `COPERNICUS/S2_SR_HARMONIZED` | Surface reflectance |
| Cloud probability | `COPERNICUS/S2_CLOUD_PROBABILITY` | Pixel-level cloud screening |
| GEDI L2A | `LARSE/GEDI/GEDI02_A_002_MONTHLY` and/or vector collection | Height/structure metrics |
| GEDI L4A | `LARSE/GEDI/GEDI04_A_002_MONTHLY` and/or vector collection | Aboveground biomass density estimates |
| Geometry | Shapely + GeoPandas | Validation, repair, CRS handling |
| Numerical | NumPy + Pandas | Statistical calculations and calibration datasets |
| Raster processing | rasterio/xarray | Optional local processing only |
| Orchestration | Celery | Long-running analysis jobs |
| Broker | Redis | Job queue / transient state |
| Dependency management | uv | Reproducible environments |

**Implementation rule:** Earth Engine is the primary compute engine when the required dataset and operation are supported there. The backend should receive compact scalar/summary results rather than downloading full scenes by default.

### 3.2 Field PWA

| Component | Technology | Role |
|---|---|---|
| UI | React | Application UI |
| Build | Vite | Development/build tooling |
| Language | TypeScript | Static typing |
| Styles | TailwindCSS | UI system |
| Routing | React Router | PWA navigation |
| Server state | TanStack Query | API state and cache |
| Local DB | Dexie + IndexedDB | Offline domain data and sync queue |
| Validation | Zod | Shared runtime validation at the edge |
| Maps | MapLibre GL JS | Interactive map |
| Offline maps | PMTiles + Cache Storage/Service Worker | Bounded offline basemap packs |
| PWA | Workbox / `vite-plugin-pwa` | Service worker and precaching |
| Camera | Browser media/input APIs | Evidence capture |
| Location | Geolocation API | GPS points and accuracy |
| Crypto | Web Crypto API | Local hashes/signatures where applicable |

**PWA operational constraints:**

1. Field audits require the installed PWA/standalone display mode in the supported device/browser matrix.
2. On startup and before beginning a field audit, the app checks `navigator.storage.persisted()` and requests `navigator.storage.persist()` when not already persistent. `navigator.storage.estimate()` is used to display approximate usage/quota. The app stores a local `storageHealth` state (`PERSISTENT`, `BEST_EFFORT`, `CRITICAL`).
3. The audit workflow blocks or requires an explicit administrator-approved exception when storage health is `CRITICAL`. It must warn before starting an audit when persistent storage cannot be confirmed.
4. Photo geolocation is **not** sourced primarily from EXIF. At capture time the application records GPS latitude, longitude and accuracy in the evidence event record. EXIF is retained only as optional corroboration because browser capture/re-encoding may omit or strip it.
5. Background execution cannot be assumed to be uniformly available across browsers/devices. Synchronization therefore has two modes: preferred background retry where supported, and deterministic foreground retry whenever the application is opened, resumed or detects connectivity.

### 3.3 Backend and infrastructure

| Component | Technology | Role |
|---|---|---|
| API | FastAPI | REST API |
| Validation | Pydantic v2 | Request/response contracts |
| Database | PostgreSQL + PostGIS | System of record + geospatial queries |
| ORM | SQLAlchemy 2 + GeoAlchemy2 | Persistence layer |
| Migrations | Alembic | Schema evolution |
| Queue | Celery + Redis | Asynchronous work |
| Object storage | MinIO / S3-compatible | Evidence photographs and exports |
| Authentication | OAuth2/OIDC-compatible provider or JWT service | Identity and sessions |
| ASGI | Uvicorn | Application server |
| Containers | Docker + Compose | Development and deployment |
| CI/CD | GitHub Actions | Build/test/deploy |
| Error monitoring | Sentry | Application errors |
| Logs/metrics | Structured logs + Prometheus/Grafana where appropriate | Observability |

### 3.4 Technology decisions removed from v1

- Flutter/Dart/Drift are removed from the target field architecture.
- Native device attestation such as Android Play Integrity is not a core control because a browser PWA cannot provide the same hardware guarantees.
- Mapbox-specific offline packaging is replaced by an implementation based on MapLibre + PMTiles to avoid coupling the field workflow to one proprietary map SDK.

---

## 4. Data Model

The v2 model distinguishes master data, immutable evidence, derived analyses, workflow state and administrative decisions.

### 4.1 Remote schema — PostgreSQL + PostGIS

The schema explicitly defines the master entities previously referenced but not declared. The examples below are representative; production identifiers, PII fields and retention rules remain subject to Probosque policy.

```sql
-- -------------------------------------------------------------------
-- USERS / TECHNICIANS / BENEFICIARIES
-- -------------------------------------------------------------------
CREATE TABLE users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username           VARCHAR(120) UNIQUE NOT NULL,
    display_name       VARCHAR(200) NOT NULL,
    role               VARCHAR(30) NOT NULL,
        -- TECHNICIAN | REVIEWER | ADMIN
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE technicians (
    id                 UUID PRIMARY KEY REFERENCES users(id),
    employee_code      VARCHAR(80) UNIQUE NOT NULL,
    active             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE beneficiaries (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_key       VARCHAR(100) UNIQUE NOT NULL,
    display_name       VARCHAR(200) NOT NULL,
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE device_installations (
    id                 UUID PRIMARY KEY,
    technician_id      UUID NOT NULL REFERENCES technicians(id),
    public_key_jwk     JSONB,
    key_algorithm      VARCHAR(40),
    registered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ
);

CREATE INDEX idx_device_installations_technician ON device_installations(technician_id);
```

**Schema rules:** master records are mutable according to role policy, while completed audits, evidence objects and analytical assessment records are append-only. The database must enforce this distinction through privileges and/or triggers; application convention alone is insufficient.

The following schema is representative. Exact constraints and enumerations must be implemented through Alembic migrations and application-level validators. The catalog of allometric equations is created before carbon assessments because it is referenced by a foreign key.

```sql
-- -------------------------------------------------------------------
-- PLOTS
-- -------------------------------------------------------------------
CREATE TABLE plots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadastral_key       VARCHAR(50) UNIQUE NOT NULL,
    beneficiary_id      UUID NOT NULL REFERENCES beneficiaries(id),
    planting_date       DATE,
    geom                GEOMETRY(MultiPolygon, 4326) NOT NULL,
    area_ha             DECIMAL(10,4) GENERATED ALWAYS AS (ST_Area(geom::geography) / 10000.0) STORED,

    triage_status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING | NORMAL | ANOMALY | INCONCLUSIVE | ERROR
    audit_status        VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
        -- NOT_STARTED | IN_PROGRESS | COMPLETED | UNDER_REVIEW | INVALID
    subsidy_status      VARCHAR(24) NOT NULL DEFAULT 'PENDING',
        -- PENDING | ELIGIBLE | NOT_ELIGIBLE | APPROVED | REJECTED | MANUAL_REVIEW

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plots_geom ON plots USING GIST(geom);
CREATE INDEX idx_plots_triage ON plots(triage_status);
CREATE INDEX idx_plots_audit ON plots(audit_status);
CREATE INDEX idx_plots_subsidy ON plots(subsidy_status);

-- -------------------------------------------------------------------
-- FIELD AUDIT: HEADER / IMMUTABLE OBSERVATION
-- -------------------------------------------------------------------
CREATE TABLE audits (
    id                      UUID PRIMARY KEY,
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    technician_id           UUID NOT NULL REFERENCES technicians(id),

    survey_started_at       TIMESTAMPTZ NOT NULL,
    survey_completed_at     TIMESTAMPTZ,
    methodology_version     VARCHAR(40) NOT NULL,


    start_lat               DECIMAL(10,7),
    start_lon               DECIMAL(10,7),
    start_accuracy_m        DECIMAL(7,2),
    end_lat                 DECIMAL(10,7),
    end_lon                 DECIMAL(10,7),
    end_accuracy_m          DECIMAL(7,2),

    geofence_valid           BOOLEAN NOT NULL DEFAULT FALSE,
    geofence_method          VARCHAR(40),

    device_installation_id   UUID NOT NULL REFERENCES device_installations(id),
    client_created_at        TIMESTAMPTZ NOT NULL,
    received_at              TIMESTAMPTZ,

    record_hash_sha256       VARCHAR(64),
    revision_of              UUID REFERENCES audits(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_plot ON audits(plot_id);
CREATE INDEX idx_audits_technician ON audits(technician_id);

-- -------------------------------------------------------------------
-- SERVER-COMPUTED FIELD AUDIT RESULT
-- -------------------------------------------------------------------
CREATE TABLE audit_results (
    id                      UUID PRIMARY KEY,
    audit_id                UUID UNIQUE NOT NULL REFERENCES audits(id),
    methodology_version     VARCHAR(40) NOT NULL,
    denominator_definition  VARCHAR(80) NOT NULL,
    estimator_method        VARCHAR(40) NOT NULL,
        -- RATIO_ESTIMATOR | OTHER_APPROVED_METHOD
    sampling_units_count    INTEGER NOT NULL,
    alive_total             INTEGER NOT NULL,
    denominator_total       INTEGER NOT NULL,
    estimated_survival_pct  DECIMAL(6,3) NOT NULL,
    ci_low_pct              DECIMAL(6,3),
    ci_high_pct             DECIMAL(6,3),
    ci_method               VARCHAR(40),
        -- STUDENT_T | NOT_AVAILABLE
    confidence_level_pct    DECIMAL(5,2),
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculator_version      VARCHAR(40) NOT NULL
);

-- -------------------------------------------------------------------
-- IMMUTABILITY: database-enforced production hardening pattern
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_append_only_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Append-only record cannot be updated/deleted: %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------
-- FIELD AUDIT: INDIVIDUAL SAMPLING UNIT
-- -------------------------------------------------------------------
CREATE TABLE audit_sampling_units (
    id                      UUID PRIMARY KEY,
    audit_id                UUID NOT NULL REFERENCES audits(id),
    sequence_no             INTEGER NOT NULL,

    center                  GEOMETRY(Point, 4326) NOT NULL,
    radius_m                DECIMAL(7,3) NOT NULL DEFAULT 12.62,
    area_m2                 DECIMAL(9,3) NOT NULL DEFAULT 500.0,

    sampled_planting_sites  INTEGER,
    alive_trees             INTEGER NOT NULL,
    dead_trees              INTEGER NOT NULL,
    unknown_sites           INTEGER NOT NULL DEFAULT 0,

    gps_accuracy_m          DECIMAL(7,2),
    captured_at             TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_sampling_counts CHECK (
        alive_trees >= 0 AND dead_trees >= 0 AND unknown_sites >= 0
    )
);

CREATE INDEX idx_sampling_units_geom ON audit_sampling_units USING GIST(center);
CREATE INDEX idx_sampling_units_audit ON audit_sampling_units(audit_id);

-- -------------------------------------------------------------------
-- EVIDENCE PHOTOGRAPHS
-- -------------------------------------------------------------------
CREATE TABLE evidence_photos (
    id                      UUID PRIMARY KEY,
    audit_id                UUID NOT NULL REFERENCES audits(id),
    sampling_unit_id        UUID REFERENCES audit_sampling_units(id),

    object_key              VARCHAR(500) NOT NULL,
    object_version_id       VARCHAR(200),
    mime_type               VARCHAR(100) NOT NULL,
    file_size_bytes         BIGINT NOT NULL,
    hash_sha256             VARCHAR(64) NOT NULL,

    -- Primary capture context recorded by the PWA at shutter/capture time
    capture_lat             DECIMAL(10,7),
    capture_lon             DECIMAL(10,7),
    capture_accuracy_m      DECIMAL(7,2),
    captured_at_client      TIMESTAMPTZ,
    capture_context_hash    VARCHAR(64),
    capture_signature       TEXT,
    challenge_id            UUID,
    received_at_server      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exif_timestamp          TIMESTAMPTZ,
    exif_lat                DECIMAL(10,7),
    exif_lon                DECIMAL(10,7),
    exif_accuracy_m         DECIMAL(7,2),

    evidence_type           VARCHAR(30) NOT NULL,
        -- PLOT_OVERVIEW | SAMPLING_UNIT | DETAIL | OTHER
    metadata_valid          BOOLEAN,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------
-- ONE-TIME SYNC CHALLENGES / NONCES
-- -------------------------------------------------------------------
CREATE TABLE sync_challenges (
    id                      UUID PRIMARY KEY,
    device_installation_id  UUID NOT NULL REFERENCES device_installations(id),
    nonce                   VARCHAR(128) UNIQUE NOT NULL,
    issued_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at               TIMESTAMPTZ NOT NULL,
    consumed_at              TIMESTAMPTZ
);

CREATE INDEX idx_sync_challenges_device ON sync_challenges(device_installation_id, issued_at DESC);

-- -------------------------------------------------------------------
-- SATELLITE TRIAGE ASSESSMENTS
-- -------------------------------------------------------------------
CREATE TABLE satellite_triage_assessments (
    id                      UUID PRIMARY KEY,
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    methodology_version     VARCHAR(40) NOT NULL,

    baseline_start          DATE,
    baseline_end            DATE,
    current_start           DATE,
    current_end             DATE,

    observation_count       INTEGER,
    valid_pixel_fraction    DECIMAL(7,4),
    cloud_fraction          DECIMAL(7,4),
    shadow_fraction         DECIMAL(7,4),

    baseline_ndvi            DECIMAL(7,4),
    current_ndvi             DECIMAL(7,4),
    ndvi_delta               DECIMAL(7,4),
    ndvi_anomaly_score       DECIMAL(10,6),

    mean_evi                 DECIMAL(7,4),
    mean_ndre                DECIMAL(7,4),

    triage_status             VARCHAR(20) NOT NULL,
        -- NORMAL | ANOMALY | INCONCLUSIVE
    reason_codes              JSONB NOT NULL DEFAULT '[]',
    source_dataset            VARCHAR(200),
    processing_metadata       JSONB,

    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_triage_plot_date ON satellite_triage_assessments(plot_id, created_at DESC);

-- -------------------------------------------------------------------
-- ALLOMETRIC EQUATION CATALOG
-- -------------------------------------------------------------------
CREATE TABLE allometric_equations (
    id                      VARCHAR(80) PRIMARY KEY,
    species_scope           VARCHAR(150) NOT NULL,
    region_scope            VARCHAR(150),
    variable_definition     VARCHAR(100) NOT NULL,
    equation_expression     TEXT NOT NULL,
    units                   VARCHAR(100) NOT NULL,
    source_citation         TEXT NOT NULL,
    source_version          VARCHAR(80),
    r2                      DECIMAL(6,4),
    rmse                    DECIMAL(12,6),
    applicable_min_height_m DECIMAL(9,3),
    applicable_max_height_m DECIMAL(9,3),
    applicable_min_dbh_cm   DECIMAL(9,3),
    applicable_max_dbh_cm   DECIMAL(9,3),
    approved_for_use        BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from              DATE,
    valid_until             DATE
);

-- -------------------------------------------------------------------
-- CARBON ASSESSMENTS
-- -------------------------------------------------------------------
CREATE TABLE carbon_assessments (
    id                      UUID PRIMARY KEY,
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    methodology_version     VARCHAR(40) NOT NULL,
    method                  VARCHAR(40) NOT NULL,
        -- GEDI_L4A | FIELD_ALLOMETRY | HYBRID

    area_ha                 DECIMAL(10,4) NOT NULL, -- server snapshot from plots.area_ha

    agbd_mean_mg_ha         DECIMAL(12,4),
    agbd_se_mg_ha           DECIMAL(12,4),
    agbd_pi_lower_mg_ha     DECIMAL(12,4),
    agbd_pi_upper_mg_ha     DECIMAL(12,4),
    valid_pixel_fraction    DECIMAL(7,4),

    rh100_mean_m            DECIMAL(9,4),
    rh75_mean_m             DECIMAL(9,4),
    valid_gedi_observations  INTEGER,

    allometric_equation_id  VARCHAR(80) REFERENCES allometric_equations(id),
    field_tree_density_ha   DECIMAL(10,2),

    dry_biomass_t_ha        DECIMAL(12,4),
    total_dry_biomass_t     DECIMAL(14,4),
    carbon_fraction          DECIMAL(6,4),
    total_carbon_t           DECIMAL(14,4),
    co2e_factor               DECIMAL(8,5),
    total_co2e_t              DECIMAL(14,4),

    uncertainty_low_t        DECIMAL(14,4),
    uncertainty_high_t       DECIMAL(14,4),
    confidence_level         VARCHAR(20),
    warnings                 JSONB NOT NULL DEFAULT '[]',

    source_metadata          JSONB,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carbon_plot ON carbon_assessments(plot_id);

-- -------------------------------------------------------------------
-- SUBSIDY DECISIONS — ADMINISTRATIVE RESULT
-- -------------------------------------------------------------------
CREATE TABLE subsidy_decisions (
    id                      UUID PRIMARY KEY,
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    audit_id                UUID NOT NULL REFERENCES audits(id),
    audit_result_id         UUID NOT NULL REFERENCES audit_results(id),

    program_id              VARCHAR(80) NOT NULL,
    rules_version           VARCHAR(40) NOT NULL,
    decision                VARCHAR(30) NOT NULL,
        -- APPROVED | REJECTED | MANUAL_REVIEW
    decision_basis          JSONB NOT NULL,
    reason_codes            JSONB NOT NULL DEFAULT '[]',

    decided_by              UUID REFERENCES users(id),
    decided_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subsidy_plot ON subsidy_decisions(plot_id, decided_at DESC);

-- Apply append-only enforcement only after every referenced table exists.
CREATE TRIGGER trg_audits_immutable
BEFORE UPDATE OR DELETE ON audits
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_sampling_units_immutable
BEFORE UPDATE OR DELETE ON audit_sampling_units
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_evidence_immutable
BEFORE UPDATE OR DELETE ON evidence_photos
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_audit_results_immutable
BEFORE UPDATE OR DELETE ON audit_results
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_triage_immutable
BEFORE UPDATE OR DELETE ON satellite_triage_assessments
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_carbon_immutable
BEFORE UPDATE OR DELETE ON carbon_assessments
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_subsidy_decisions_immutable
BEFORE UPDATE OR DELETE ON subsidy_decisions
FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

-- In addition, revoke UPDATE/DELETE privileges from the normal API role
-- for these tables. Corrections are new revision/amendment records;
-- they are never in-place edits. Exact role names are deployment-specific.

-- -------------------------------------------------------------------
-- SYNC LOG
-- -------------------------------------------------------------------
CREATE TABLE sync_log (
    id                      UUID PRIMARY KEY,
    device_installation_id  UUID NOT NULL REFERENCES device_installations(id),
    idempotency_key         VARCHAR(120) UNIQUE NOT NULL,
    payload_hash_sha256     VARCHAR(64),
    received_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at             TIMESTAMPTZ,
    status                   VARCHAR(24) NOT NULL,
        -- RECEIVED | PROCESSING | COMPLETED | CONFLICT | ERROR
    conflict_detail         JSONB,
    server_reference        UUID
);
```

### 4.2 Local schema — IndexedDB via Dexie

The local database mirrors only what the technician needs to operate offline and sync later. It is not a second business authority.

```ts
export type LocalSyncStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'SYNCED'
  | 'ERROR';

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
  capturedAt: string;
}

export interface LocalEvidence {
  id: string;
  auditId: string;
  samplingUnitId?: string;
  blobRef: string;
  hashSha256: string;
  mimeType: string;
  sizeBytes: number;

  // Capture context is primary; EXIF is optional corroboration.
  capturedAt?: string;
  captureLat?: number;
  captureLon?: number;
  captureAccuracyM?: number;
  captureContextHash?: string;
  captureSignature?: string;
  challengeId?: string;

  syncStatus: LocalSyncStatus;
}

export interface LocalDeviceState {
  deviceInstallationId: string;
  isInstalledPwa: boolean;
  storageHealth: 'PERSISTENT' | 'BEST_EFFORT' | 'CRITICAL';
  storageUsageBytes?: number;
  storageQuotaBytes?: number;
  lastStorageCheckAt?: string;
}
```

The PWA must persist each completed form interaction and each sampling unit before moving to the next workflow step. Losing the browser tab or connectivity must not discard already-completed observations.

---

## 5. Synchronization Protocol

### 5.1 Guiding principle

> **The backend is the source of truth, but immutable field evidence is not merged destructively.**

There are two different conflict types:

- **Duplicate submission:** the same audit/event is sent twice. Resolve idempotently using a client-generated UUID and an idempotency key.
- **Competing administrative state:** a client holds stale plot metadata or a plot was already completed by another technician. The server rejects or marks the competing action; it does not overwrite an immutable completed audit.

This removes the need for a general-purpose local/server version-merge algorithm for immutable audit evidence.

### 5.2 Synchronization flow

```text
PWA
 │
 │ 1. Save audit/sampling/photo locally
 │    IndexedDB = PENDING
 │
 │ 2. Connectivity available / app resumed
 ▼
POST /api/v1/sync/audits
 │
 │ 3. Server validates:
 │    - authentication
 │    - schema
 │    - idempotency key
 │    - plot assignment
 │    - geofence evidence
 │    - methodology version
 │    - challenge/nonce freshness (when signatures enabled)
 │    - signature over canonical event envelope (when enabled)
 │
 ├── duplicate → return existing server reference
 │
 ├── valid → persist immutable audit/event
 │
 └── invalid → return actionable error without mutating evidence
 │
 ▼
POST /api/v1/sync/evidence
 │
 │ 4. Upload each photo independently
 │    server recalculates SHA-256
 │
 ▼
SYNCED
```

### 5.3 Challenge/nonce protocol

The “server nonce” mentioned elsewhere is now a concrete API contract. It is useful only when it is short-lived, single-use, bound to a registered device installation and included in the signed canonical event envelope.

**`POST /api/v1/sync/challenges`**

Request:
```json
{
  "device_installation_id": "uuid"
}
```

Response:
```json
{
  "challenge_id": "uuid",
  "nonce": "server-generated-random-value",
  "expires_at": "2026-10-06T19:00:00Z"
}
```

The server marks the challenge consumed after successful verification. Expired/reused challenges are rejected. The signature is an additional replay/tamper-resistance control, not proof of physical presence.

### 5.4 Photo handling

1. Audit JSON is uploaded before evidence files.
2. Each evidence file receives a client hash and server-side recalculation.
3. The server stores object metadata including MIME type, size, capture metadata and server receipt time.
4. A failed photo does not require resending the entire audit.
5. The audit is considered operationally complete only when all mandatory evidence is either uploaded or an explicit exception is recorded.

**Important:** SHA-256 proves byte-level integrity after receipt. It does **not** prove that a photo was physically captured at the stated place or time. PWA antifraud controls must therefore be described as evidence strengthening, not hardware-level attestation.

### 5.5 Retry strategy

The client uses bounded exponential backoff with jitter. A practical sequence is:

```text
Attempt 1: immediate
Attempt 2: ~30 s
Attempt 3: ~2 min
Attempt 4: ~10 min
Attempt 5: ~1 h
Then: retain in ERROR and retry when the app is reopened or manually triggered
```

The exact timer is configurable. The sync worker must be idempotent, so repeating a request is safe.

---

## 6. Satellite Triage Pipeline — Sentinel-2

### 6.1 Purpose

Satellite triage answers a narrower question than the original plan:

> **Is there sufficient and sufficiently stable vegetation evidence for this plot, or is there a spatial/temporal anomaly that deserves attention in the field audit?**

It must not answer:

> **Did exactly 80% of planted trees survive?**

The second question is answered by the field audit methodology.

### 6.2 Logical architecture

```text
Plot polygon
     │
     ▼
Geometry validation
     │
     ▼
Sentinel-2 SR + Cloud Probability
     │
     ├── pixel cloud mask
     ├── shadow mask
     ├── valid-data fraction
     └── seasonal window selection
     │
     ▼
Temporal composite
     │
     ├── baseline: same season / comparable phenology
     └── current: same seasonal window
     │
     ▼
Spectral metrics
     │
     ├── mean / median NDVI
     ├── NDVI temporal change
     ├── EVI or red-edge metric where useful
     └── spatial anomaly statistics
     │
     ▼
Quality gate
     │
     ├── enough valid pixels?
     ├── enough observations?
     └── stable acquisition conditions?
     │
     ▼
Explainable triage engine
     │
     ├── NORMAL
     ├── ANOMALY
     └── INCONCLUSIVE
```

### 6.3 Sentinel-2 data strategy

Use `COPERNICUS/S2_SR_HARMONIZED` as the main surface-reflectance collection and pair it with `COPERNICUS/S2_CLOUD_PROBABILITY` for pixel-level cloud screening. Scene-level `CLOUDY_PIXEL_PERCENTAGE` is an initial filter only; it is not sufficient as the final data-quality mask.

The pipeline records:

- acquisition date(s);
- number of usable observations;
- valid pixel fraction;
- cloud fraction;
- shadow fraction;
- baseline metric(s);
- current metric(s);
- temporal delta/anomaly;
- dataset identifier and processing version.

### 6.4 Baseline and temporal comparison

The original plan compared arbitrary planting-date imagery against current imagery. Version 2 instead uses a **comparable seasonal window** whenever possible.

Preferred hierarchy:

1. same-season multi-date baseline from historical observations;
2. previous-year same-season baseline;
3. another documented reference period only when the above is unavailable.

The system must record the baseline method. A baseline selected from a different phenological regime must not be silently treated as equivalent.

### 6.5 Triage decision rules

There is no automatic subsidy rejection in Level 1.

Initial rule concept:

```text
IF data quality is insufficient
    → INCONCLUSIVE
ELSE IF vegetation signal shows persistent, severe and spatially coherent decline
    → ANOMALY
ELSE
    → NORMAL
```

The thresholds for “severe”, “persistent” and “coherent” are calibration parameters. The provisional values such as ΔNDVI = −0.15 or −0.30 from v1 are retained only as **candidate calibration values** until compared against labeled field outcomes.

### 6.6 Why NDVI > 0.4 is not survival

NDVI responds to vegetation reflectance at the pixel scale. A 10 m Sentinel-2 pixel can contain young trees, bare soil, grass, weeds, litter and shadow simultaneously. Therefore:

```text
fraction of pixels with NDVI > 0.4
        ≠
percentage of trees that survived
```

The field survival result must remain derived from tree/planting-site observations and the approved sampling methodology.

### 6.7 Earth Engine implementation rule

The pipeline should minimize client/server round trips. Build one summary dictionary containing the required metrics and retrieve it once per analysis whenever practical, instead of calling `.getInfo()` independently for collection size, dates, statistics and metadata.

A simplified pattern is:

```python
summary = ee.Dictionary({
    "mean_ndvi": ndvi.reduceRegion(...).get("NDVI"),
    "valid_fraction": valid_mask.reduceRegion(...).get("valid"),
    "observation_count": collection.size(),
    "image_id": image.get("system:index"),
})

result = summary.getInfo()
```

The exact implementation must respect Earth Engine execution limits and should use Celery for jobs that exceed a normal request/response budget.

---

## 7. Field Audit PWA

### 7.1 Functional flow

```text
Login
  ↓
Assigned plots
  ↓
Download plot + bounded offline map pack
  ↓
Open plot
  ↓
Acquire GPS + validate position
  ↓
Start audit
  ↓
Create sampling unit(s)
  ↓
Capture counts + coordinates + optional evidence
  ↓
Repeat until methodology requirement is met
  ↓
Estimate survival + confidence interval
  ↓
Capture mandatory overview/detail photos
  ↓
Review audit
  ↓
Seal audit as immutable event
  ↓
Queue for synchronization
```

### 7.2 Geofencing

The original centroid-only rule is replaced by polygon-aware validation.

The PWA sends:

- latitude/longitude;
- horizontal accuracy reported by the browser/device;
- capture timestamp;
- plot identifier;
- sampling-unit coordinates where applicable.

The server evaluates the GPS point against the plot polygon and/or distance to the polygon boundary. Distance to the centroid is retained only as a diagnostic field, not the main geofence criterion.

The result should be represented as:

```text
geofence_status = VALID | WARNING | INVALID
```

The threshold is configurable by operational area and calibrated against field GPS performance under forest canopy.

### 7.3 Sampling methodology

The original 500 m² circular sampling concept is retained but is explicitly modeled as **multiple sampling units**, not one aggregate count.

A 500 m² circle corresponds to approximately 12.62 m radius:

$$r = \sqrt{500/\pi} \approx 12.62\,m$$

Each unit records at minimum:

- sampling-unit center;
- radius;
- expected/sample planting sites, where applicable;
- alive trees;
- dead trees;
- unknown/missing sites;
- GPS accuracy;
- capture time;
- associated evidence photographs.

The production design must define how units are selected (random/systematic/stratified) and whether 3–5 circles are sufficient for the required confidence.

### 7.4 Survival estimator

Because sampling units may contain different numbers of planting sites, the production estimator must not default to the unweighted mean of unit-level proportions. The MVP default is the **ratio estimator**:

$$\hat p_R = \frac{\sum_{i=1}^{n} y_i}{\sum_{i=1}^{n} x_i}$$

where $y_i$ is the number of surviving trees and $x_i$ is the approved denominator for sampling unit $i$.

An approximate standard error for the ratio estimator under simple random sampling of units is computed from the residuals:

$$e_i = y_i - \hat p_R x_i$$

$$SE(\hat p_R) \approx \sqrt{\frac{s_e^2}{n\bar{x}^2}}$$

where $s_e^2$ is the sample variance of $e_i$ and $\bar{x}$ is the sample mean of $x_i$.

With small numbers of sampling units, the confidence interval uses the Student $t$ critical value with $n-1$ degrees of freedom:

$$CI = \hat p_R \pm t_{n-1,1-\alpha/2}SE(\hat p_R)$$

For $n<2$, no variance-based confidence interval is reported. Any finite-population correction or stratified design adjustment required by the approved Probosque sampling design must supersede this MVP approximation.

The denominator must be explicitly defined with Probosque. The system should support both observed planted sites and expected planting positions where missing plants count as non-surviving.

**Server-side calculation rule:** the PWA submits only raw sampling-unit observations. `estimated_survival_pct`, `ci_low_pct` and `ci_high_pct` are computed on the server after all units are persisted and must not be accepted from the client as authoritative values.

### 7.5 Confidence interval and methodology versioning

Every completed audit stores, in `audit_results`:

- point estimate;
- lower confidence bound;
- upper confidence bound;
- number of sampling units;
- total alive and denominator counts;
- estimator method;
- confidence-level and interval method;
- sampling methodology version;
- denominator definition;
- calculator version.

The database and API treat this result as server-derived, immutable analytical output linked to the raw sampling units.

### 7.6 Anti-fraud controls compatible with a PWA

The target is **tamper evidence and auditability**, not impossible-to-spoof hardware attestation.

Controls:

| Control | What it establishes |
|---|---|
| Server timestamp | When the backend received the evidence |
| Client capture timestamp | Claimed local capture time |
| Capture GPS/time event | Primary app-recorded capture context at the moment the evidence is captured |
| EXIF/GPS metadata | Additional corroborating metadata when available |
| SHA-256 | File integrity |
| Polygon geofence | Spatial plausibility |
| GPS accuracy | Quality of reported location |
| Device installation ID | Correlates events to a registered PWA installation |
| Audit idempotency key | Prevents duplicate submission |
| Server challenge/nonce | Makes replay of old signed event payloads harder when bound to a one-time signed envelope |
| WebAuthn/passkey (optional) | Stronger technician identity where operationally viable |

No control above should be described as proof that the technician was physically present if the browser environment can be manipulated.

---

## 8. Project Structure

```text
probosque/
├── frontend/                        # Layer 2 — PWA
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   ├── routes/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── plots/
│   │   │   ├── audits/
│   │   │   ├── sampling/
│   │   │   ├── evidence/
│   │   │   └── sync/
│   │   ├── db/
│   │   │   └── dexie.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── gps.ts
│   │   │   ├── camera.ts
│   │   │   ├── geofence.ts
│   │   │   └── sync.ts
│   │   ├── map/
│   │   │   ├── maplibre.ts
│   │   │   └── offlinePacks.ts
│   │   └── validation/
│   └── tests/
│
├── backend/                         # Layer 3
│   ├── pyproject.toml
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── plots.py
│   │   │   ├── audits.py
│   │   │   ├── sync.py
│   │   │   ├── decisions.py
│   │   │   └── satellite/
│   │   ├── services/
│   │   │   ├── audit_service.py
│   │   │   ├── sync_service.py
│   │   │   ├── geofence_service.py
│   │   │   ├── decision_service.py
│   │   │   └── evidence_service.py
│   │   ├── tasks/
│   │   └── utils/
│   └── tests/
│
├── satellite/
│   ├── pyproject.toml
│   ├── src/
│   │   ├── sentinel/
│   │   │   ├── collection.py
│   │   │   ├── cloud_mask.py
│   │   │   ├── temporal_metrics.py
│   │   │   └── triage.py
│   │   ├── gedi/
│   │   │   ├── l2a.py
│   │   │   ├── l4a.py
│   │   │   └── quality.py
│   │   └── carbon/
│   │       ├── calculator.py
│   │       ├── uncertainty.py
│   │       └── equations.py
│   └── tests/
│
├── infra/
│   ├── docker-compose.yml
│   ├── deploy/
│   └── scripts/
│
└── docs/
    ├── architecture.md
    ├── field_methodology.md
    ├── sync_protocol.md
    ├── satellite_methodology.md
    ├── carbon_methodology.md
    └── decision_rules.md
```

---

## 9. Implementation Roadmap by Phase

The original 20-week plan is retained as a reference only. For a single developer, the revised baseline is **28 weeks**, with a practical range of **26–30 weeks** depending on Probosque decisions, field access and scientific validation. The sequence is intentionally less overlapped: backend → satellite → PWA → carbon.

### Phase 0 — Scientific and technical spikes (Weeks 1–2)

| Work | Deliverable |
|---|---|
| Sampling design review | Written denominator definition, ratio-estimator specification, Student-t CI method, and candidate sample-size design |
| Sentinel spike | One real plot → cloud mask → seasonal baseline → current metrics → triage record |
| GEDI spike | One real plot → valid L2A/L4A observations → quality/coverage test → applicability report for young plots |
| PWA feasibility spike | Installed PWA → IndexedDB → storage persistence check → GPS → camera capture → offline persistence → supported browser/device matrix |
| Decision log | Documented assumptions that remain pending approval |

**Gate:** no production subsidy rule is connected to satellite-derived survival; no quantitative carbon output is approved for young plots without a field-validity path.

### Phase 1 — Backend foundation (Weeks 3–6)

| Work | Deliverable |
|---|---|
| Infrastructure | Postgres/PostGIS + Redis + MinIO + CI |
| Master data | `users`, `technicians`, `beneficiaries`, device installations |
| Data model | Plots + immutable audits + sampling units + server-computed audit results + evidence + workflow states |
| Auth | Technician/reviewer/admin roles and session management |
| Sync API | Idempotent audit/evidence ingestion + challenge/nonce endpoint |
| Integrity/geofence | Server-side SHA-256 verification and polygon-aware geofence service |
| Audit trail | Immutable evidence plus explicit revision/amendment model |

**Success criterion:** a complete offline audit payload can be validated, recalculated and persisted on the server without satellite or carbon dependencies.

### Phase 2 — Satellite triage v1 (Weeks 7–9)

| Work | Deliverable |
|---|---|
| Sentinel ingestion | S2 SR Harmonized + Cloud Probability |
| Temporal logic | Same-season baseline/current windows |
| Metrics | NDVI + quality indicators; optional EVI/red-edge metric |
| Decision engine | NORMAL / ANOMALY / INCONCLUSIVE |
| Historical backtest | Labeled catastrophic-loss and control dataset |

**Success criterion:** the pipeline produces an explainable triage record with data-quality diagnostics and a calibrated validation dataset.

### Phase 3 — Field PWA (Weeks 10–14)

| Work | Deliverable |
|---|---|
| PWA shell | Installable/responsive application |
| Storage controls | Persistent-storage request, quota/usage indicator, storage-health gate |
| Offline data | IndexedDB + plot caching |
| Offline map | Bounded PMTiles packs |
| Audit workflow | GPS → sampling units → counts → evidence capture with capture context |
| Local queue | Deterministic sync queue and recovery |

**Success criterion:** a technician can complete and review an audit with no connectivity from the installed PWA, with all critical observations durable locally.

### Phase 4 — Sync, evidence and field hardening (Weeks 15–17)

| Work | Deliverable |
|---|---|
| Sync hardening | Idempotent push + independent evidence upload + challenge verification |
| Integrity | Server-side SHA-256 validation + immutable object metadata |
| Geofence | Polygon-aware validation + GPS accuracy policy |
| Error recovery | Retry/backoff/manual recovery |
| Device tests | Low-memory, storage-pressure and interrupted-session tests |

**Success criterion:** repeated/offline/partial-sync scenarios recover without duplicated or silently overwritten audits.

### Phase 5 — Carbon assessment (Weeks 18–21)

| Work | Deliverable |
|---|---|
| Young-plot policy | Field allometry is the default quantitative path for young reforestation plots unless GEDI applicability is empirically demonstrated |
| GEDI L2A/L4A | Structure/AGBD extraction with correct units, quality and coverage diagnostics |
| Allometry catalog | Equations approved by species/region/range |
| Field density integration | Use observed planting/tree density where required |
| Uncertainty | Statistical/model-based interval or explicit limitation |

**Gate:** no allometric equation or GEDI-derived plot-level CO₂e path enters production until source, units, domain, young-plot applicability and uncertainty treatment are verified.

### Phase 6 — Pilot and calibration (Weeks 22–25)

Pilot with representative plots and multiple technicians. Separate objectives:

- usability and field completion;
- PWA storage/sync reliability;
- geofence behavior under canopy;
- statistical repeatability of sampling;
- prospective satellite triage;
- carbon method comparability against field inventory where applicable.

The satellite catastrophic-loss recall claim must rely on the historical backtest and an appropriately sized prospective confirmation set, not on 10 plots.

### Phase 7 — Production hardening and administration (Weeks 26–28)

| Work | Deliverable |
|---|---|
| Deployment | Production environment + backup/restore strategy |
| Monitoring | Errors, API latency, Celery failures, queue depth, sync and storage metrics |
| Admin dashboard | Plot map + triage + audit + subsidy states |
| Rules engine | Versioned subsidy decision rules |
| Exports | Program-required reports and audit trail |
| Documentation | Runbooks, field instructions, methodology documents |

**Schedule rule:** if the product must be delivered faster than 26 weeks, explicitly reduce scope rather than compressing the scientific validation or evidence/integrity work.

## 10. Edge Cases and Risks

### 10.1 Field/PWA

| Case | Mitigation |
|---|---|
| Forest canopy degrades GPS accuracy | Record accuracy; configurable warning threshold; do not silently discard coordinate quality |
| Browser kills tab or device loses battery | Persist every completed unit/evidence item to IndexedDB before navigation |
| No connectivity for several days | Queue remains durable; sync resumes on next app activation |
| IndexedDB/storage eviction risk | Require installed PWA, request persistent storage, show storage health and block/flag field work when health is critical |
| Browser lacks a background sync feature | Foreground retry is the baseline; Background Sync is optional |
| EXIF missing after browser capture/re-encoding | Record capture GPS/time/accuracy as first-class event data; treat EXIF as corroboration only |
| Large photo uploads | Compress within acceptable evidence quality limits and upload independently |
| Limited storage | Enforce evidence size policy and show storage-health warnings before starting an audit |
| Offline map becomes too large | Use bounded region packs and explicit pack lifecycle/expiration |

### 10.2 Satellite

| Case | Mitigation |
|---|---|
| Persistent clouds/shadows | Pixel-level masks + temporal window expansion + INCONCLUSIVE state |
| Seasonal variation | Same-season/phenological baseline |
| Young plantations / mixed pixels | Triage only; never convert NDVI threshold to tree-survival percentage |
| Small plot | Report valid-pixel/sample-size diagnostics; do not manufacture higher native resolution |
| GEE unavailable | Retry asynchronously; preserve PENDING/ERROR state; do not invent a result |
| No reliable baseline | INCONCLUSIVE rather than arbitrary comparison |

### 10.3 GEDI / carbon

| Case | Mitigation |
|---|---|
| No valid GEDI observations | Do not substitute an arbitrary regional height for quantitative carbon without an approved method; report unavailable/low-confidence result |
| Sparse GEDI sampling | Report valid-pixel/footprint fraction and use spatial coverage criteria |
| GEDI recency differs by product/version | Record exact product/version and observation window; label `HISTORICAL_WINDOW` vs `CURRENT_WINDOW` explicitly |
| Unknown/mixed species | Require a validated allometric method or fall back to an explicitly non-species-specific product such as GEDI L4A where appropriate |
| Equation outside calibration range | Block quantitative use or mark as out-of-domain |
| Uncertainty unavailable | Do not synthesize `(1 - R²) × 100` as uncertainty; return a qualitative limitation instead |

### 10.4 Administrative / decision engine

| Case | Mitigation |
|---|---|
| Audit completed but evidence incomplete | Keep subsidy status in MANUAL_REVIEW/PENDING until required evidence policy is satisfied |
| Rule threshold changes | Create a new `rules_version`; do not mutate historical decisions |
| Correction required | Create a revision/amendment linked to the original audit; do not edit immutable evidence in place |
| Two technicians audit same plot | Preserve both submitted records and route the plot to review according to program policy |

---

## 11. Audit Result Calculation and Rules Boundary

The field audit API accepts raw observations only. The server persists sampling units and then computes the `audit_results` record transactionally. The client cannot submit an authoritative survival percentage or confidence interval.

Example internal service contract:

```python
def finalize_audit(audit_id: UUID) -> AuditResult:
    units = repository.list_sampling_units(audit_id)
    # validate methodology/denominator policy
    # compute ratio estimator
    # compute Student-t interval when n >= 2
    # persist immutable audit_results record
    # return server-derived result
```

`plots.area_ha` is derived from the canonical PostGIS geometry. APIs may return the derived value, but clients must not be allowed to override it.

## 12. Subsidy Decision Engine

The administrative decision is a separate, versioned rule evaluation over an approved field-audit result. It must not be implemented as a generated database boolean.

Example flow:

```text
Completed field audit
        │
        ├── methodology valid?
        ├── mandatory evidence complete?
        ├── geofence policy satisfied?
        └── survival estimate available?
                │
                ▼
          Rules Engine
                │
                ├── program_id
                ├── rules_version
                ├── threshold
                ├── denominator definition
                └── CI policy
                │
                ▼
       APPROVED / REJECTED / MANUAL_REVIEW
```

A critical policy decision is whether the program evaluates the **point estimate** of survival or a **conservative confidence bound** (for example, the lower confidence bound) against the 80% threshold. The system supports either policy, but the selected rule must be explicit, versioned and approved by Probosque.

The stored decision basis should be sufficient to reproduce the decision without rerunning a satellite analysis.

---

## 13. Pending Design Decisions

The following are genuine decisions that should remain explicit rather than being hidden inside implementation constants.

1. **Official survival denominator:** planted trees, expected planting positions, or another program-specific definition.
2. **Sampling design:** number of circles, spatial selection rule and required confidence level.
3. **Satellite triage calibration:** exact anomaly thresholds and minimum data-quality gates.
4. **Earth Engine billing/licensing:** confirm Probosque's eligibility, organizational account model and production quota/billing requirements.
5. **Offline map source:** confirm data licensing, geographic pack size and refresh frequency.
6. **Authentication:** existing institutional identity provider versus application-managed identity.
7. **Production deployment:** Cloud Run/managed containers first; Kubernetes only if the operational requirement justifies the extra complexity.
8. **Carbon methodology:** select the official calculation path and approved sources/equations before publishing quantitative CO₂e values.
9. **GEDI recency policy:** define how to label and accept product/version-specific observation windows in 2026 reports; do not assume every GEDI release has the same temporal coverage.
10. **PWA browser/storage policy:** approve the supported device/browser matrix, installed-PWA requirement, persistent-storage health threshold and exception policy.
11. **Retention/legal policy:** define how long evidence photographs, audit revisions and decision records must be retained.

---

# Module: Spatial Processing Pipeline — Sentinel-2 + GEDI

**Version:** 2.1  
**Date:** October 6, 2026  
**Status:** Revised technical module — methodology validation required

---

## 14. Context and Technical Rationale

The spatial module continues to provide two analytical products:

- **Level 1 — Satellite Triage:** Sentinel-2 vegetation/anomaly analysis for prioritization and contextual evidence.
- **Level 2 — Carbon Assessment:** aboveground biomass structure/density estimates when the relevant satellite data and methodology support them.

It no longer claims that Sentinel-2 NDVI directly measures survival, and it no longer uses an arbitrary NDVI-based tree-density proxy as a production carbon calculation.

### Changes from v1

| v1 assumption | v2 decision |
|---|---|
| NDVI > 0.4 = survival | Removed. NDVI threshold is a spectral feature only. |
| Satellite REJECT/PASS | Replaced with NORMAL/ANOMALY/INCONCLUSIVE triage. |
| Single image | Replaced by quality-filtered temporal composites. |
| Scene cloud percentage only | Pixel-level cloud/shadow/data-quality masking. |
| GEDI RH metrics treated as tree height | RH metrics are structural relative-height measurements, interpreted at footprint/pixel level. |
| `rh100 / 100` | Removed. Earth Engine GEDI L2A RH bands are in meters. |
| `.size()` as "shot coverage" | Removed as a spatial coverage proxy. Use valid observations/pixels and explicit coverage metrics. |
| Height allometry + NDVI density proxy | Removed from production default. Use field inventory or an approved model/product. |
| `(1-R²)×100` uncertainty | Removed. Use actual prediction/sampling uncertainty where available. |
| CO₂e drives subsidy | Removed. Carbon is independent. |

---

## 15. Level 1 — Satellite Triage

### 15.1 Inputs

- plot polygon;
- date window;
- same-season baseline/reference window;
- acceptable cloud probability;
- methodology version.

### 15.2 Processing

1. Validate and normalize geometry.
2. Query Sentinel-2 SR Harmonized.
3. Join or otherwise apply Sentinel-2 Cloud Probability.
4. Mask cloud and shadow pixels.
5. Reject windows with insufficient valid observations.
6. Build baseline and current temporal composites.
7. Calculate NDVI and selected complementary metrics.
8. Compute temporal deltas/anomaly metrics.
9. Evaluate quality gates.
10. Emit `NORMAL`, `ANOMALY` or `INCONCLUSIVE` with reason codes.

### 15.3 Recommended metrics

**MVP:**

- median NDVI;
- baseline NDVI;
- current NDVI;
- NDVI delta;
- valid pixel fraction;
- cloud fraction;
- shadow fraction;
- observation count.

**Optional after validation:**

- EVI;
- red-edge vegetation index (e.g. NDRE);
- spatial fragmentation/anomaly statistics.

The additional metrics should be added only when they improve pilot performance or interpretability.

### 15.4 Level 1 API

**`POST /api/v1/satellite/triage`**

```python
class SatelliteTriageRequest(BaseModel):
    plot_id: UUID
    start_date: date
    end_date: date
    baseline_start_date: date | None = None
    baseline_end_date: date | None = None
    max_cloud_probability: float = Field(default=40.0, ge=0, le=100)
    min_valid_pixel_fraction: float = Field(default=0.70, ge=0, le=1)
```

Example response:

```json
{
  "assessment_id": "550e8400-e29b-41d4-a716-446655440001",
  "plot_id": "550e8400-e29b-41d4-a716-446655440000",
  "triage_status": "ANOMALY",
  "reason_codes": ["PERSISTENT_NDVI_DECLINE"],
  "metrics": {
    "baseline_ndvi": 0.61,
    "current_ndvi": 0.39,
    "ndvi_delta": -0.22,
    "valid_pixel_fraction": 0.91,
    "cloud_fraction": 0.04,
    "shadow_fraction": 0.03,
    "observation_count": 6
  },
  "methodology_version": "TRIAGE-1.0"
}
```

The response intentionally does not contain `survival_pct` or `favorable_assessment`.

---

## 16. Level 2 — Carbon Assessment

### 16.1 Objective

Produce a defensible estimate of aboveground biomass density and, only when a validated carbon-conversion methodology is configured, carbon/CO₂e.

The preferred hierarchy is:

```text
1. Approved field inventory + validated local allometry
                     ↓
2. GEDI L4A AGBD where coverage/quality are adequate
                     ↓
3. Hybrid method only if explicitly calibrated
                     ↓
4. No quantitative CO₂e result when evidence is insufficient
```

### 16.2 GEDI L2A — canopy structure

Use `LARSE/GEDI/GEDI02_A_002_MONTHLY` for raster-oriented workflows or the vector product when individual footprints are required. The Earth Engine catalog describes the L2A product as relative-height metrics at an average footprint of about 25 m; RH values are reported in meters.

Quality masking must operate on the dataset's quality bands/fields according to the selected product representation. The implementation must not treat a raster band as an image-level property filter.

Important interpretation rule:

> `RH100` is a waveform relative-height metric at a GEDI footprint/pixel. It must not automatically be described as the height of an individual tree.

### 16.3 GEDI temporal coverage

GEDI is not a continuous current wall-to-wall sensor. The temporal coverage depends on the exact product/version and distribution path. For example, the Earth Engine catalog currently exposes the V2.1 L4A monthly raster through 2025-07-01, while NASA's ORNL DAAC documents an L4A Version 3 product with temporal coverage extending to the present. The implementation therefore records the **actual product, version and observation window used** rather than assuming that all GEDI assets are historical or current.

Therefore every carbon result stores:

- GEDI dataset/product version;
- observation period actually used;
- source acquisition date/range;
- number of valid observations;
- valid coverage fraction;
- data recency status (`CURRENT_WINDOW`, `HISTORICAL_WINDOW`, `UNAVAILABLE`).

The system must never display a GEDI result without its source observation window. A result older than the program's reporting reference date must be visibly labeled as historical/contextual.

### 16.4 Young reforestation plots — explicit policy

For young reforestation plots (operationally **1–5 years as a provisional program rule**), GEDI is **not the default quantitative source** for plot-level biomass/CO₂e. The reasons are practical rather than a claim that GEDI is universally invalid: footprints are about 25 m, sampling is sparse, and L4A models are intended to generalize across regions and plant functional types rather than to act as a local census of newly established plantations.

Accordingly:

1. quantitative carbon for young plots defaults to field inventory + validated local/regional allometry;
2. GEDI may be retained as contextual structure/biomass evidence;
3. GEDI may enter a quantitative hybrid method only after a local validation study demonstrates acceptable applicability and coverage;
4. the 1–5 year cutoff is a **program/implementation rule to be validated**, not a universal biological threshold.

### 16.5 Prefer GEDI L4A when applicable

GEDI L4A provides aboveground biomass density (`agbd`) in Mg/ha and includes prediction standard error and prediction interval fields. When the plot has adequate valid L4A observations, this is preferable to inventing a height-to-biomass conversion from RH100.

The implementation stores at least:

```text
agbd_mean_mg_ha
agbd_se_mg_ha
agbd_pi_lower_mg_ha
agbd_pi_upper_mg_ha
valid_pixel_fraction
```

The plot-level aggregation must be accompanied by a representativeness/coverage diagnostic. A small number of valid GEDI footprints does not establish complete plot coverage.

### 16.6 Field allometry

When the official methodology requires a local allometric equation, it must be selected from the `allometric_equations` catalog using:

- species or species group;
- region/ecoregion;
- variable availability (DBH, height, wood density, etc.);
- calibration range;
- source/version;
- approved status.

The calculator must **fail closed** when an equation is outside its validity range or its units are ambiguous.

### 16.7 Tree density

The v1 rule that assigned 300/550/800/1100 trees/ha from NDVI quintiles is removed.

Valid inputs for tree density are, in order:

1. field inventory/planting records;
2. an approved external inventory layer;
3. a calibrated model whose training/validation data are documented.

If none is available, the system must not manufacture a quantitative tree-density estimate for official carbon reporting.

### 16.8 Carbon conversion

Carbon conversion is parameterized:

$$C = AGB \times f_C$$

and, for stoichiometric conversion from elemental carbon to CO₂:

$$CO_2e = C \times \frac{44.01}{12.01}$$

The carbon fraction `f_C` must be a configured methodological parameter tied to the applicable standard/program. It is not hard-coded to 0.50 merely because that value appeared in v1.

### 16.9 Uncertainty

The v1 uncertainty formula

$$U = (1-R^2)\times100$$

is removed.

Depending on the method, uncertainty should be represented through:

- sampling error;
- prediction interval supplied by the biomass product;
- model prediction standard error;
- propagated measurement/model uncertainty;
- sensitivity analysis where a required input is not directly observed.

When no defensible interval is available, the API must say so rather than return a fabricated percentage.

---

## 17. GEDI Service — Revised Pattern

A simplified structure for GEDI L2A monthly raster is:

```python
class GediL2AService:
    COLLECTION = "LARSE/GEDI/GEDI02_A_002_MONTHLY"

    def extract_structure(self, aoi):
        collection = ee.ImageCollection(self.COLLECTION).filterBounds(aoi)

        # Example only: exact mask must follow the selected product's
        # current band definitions and quality methodology.
        def quality_mask(img):
            return (
                img
                .updateMask(img.select("quality_flag").eq(1))
                .updateMask(img.select("degrade_flag").eq(0))
            )

        valid = collection.map(quality_mask)

        composite = valid.select(["rh100", "rh75"]).median()
        stats = composite.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=25,
            maxPixels=1e9,
        )

        return stats
```

**Key correction:** no `/100` conversion is applied to RH100/RH75 because the Earth Engine catalog reports these bands in meters.

The production implementation must additionally calculate valid-observation/pixel coverage and persist the exact dataset/methodology version.

---

## 18. Biomass Calculator — Revised Pattern

### 18.1 GEDI L4A path

```python
@dataclass
class CarbonResult:
    method: str
    dry_biomass_t_ha: float | None
    total_dry_biomass_t: float | None
    carbon_t: float | None
    co2e_t: float | None
    lower_t: float | None
    upper_t: float | None
    confidence_level: str
    warnings: list[str]


def calculate_from_gedi_l4a(
    mean_agbd_mg_ha: float,
    area_ha: float,  # server-populated from canonical plot geometry; never client-authoritative
    agbd_pi_lower_mg_ha: float | None,
    agbd_pi_upper_mg_ha: float | None,
    carbon_fraction: float | None,
    co2e_factor: float = 44.01 / 12.01,
) -> CarbonResult:
    """
    Uses GEDI L4A aboveground biomass density directly.
    No synthetic tree-density model is introduced here.
    """
    total_biomass_t = mean_agbd_mg_ha * area_ha

    carbon_t = None
    co2e_t = None
    lower_t = None
    upper_t = None

    if carbon_fraction is not None:
        carbon_t = total_biomass_t * carbon_fraction
        co2e_t = carbon_t * co2e_factor

        if agbd_pi_lower_mg_ha is not None:
            lower_t = agbd_pi_lower_mg_ha * area_ha * carbon_fraction * co2e_factor
        if agbd_pi_upper_mg_ha is not None:
            upper_t = agbd_pi_upper_mg_ha * area_ha * carbon_fraction * co2e_factor

    warnings = []
    if carbon_fraction is None:
        warnings.append("Carbon fraction is not configured; biomass is reported without CO2e conversion.")

    return CarbonResult(
        method="GEDI_L4A",
        dry_biomass_t_ha=mean_agbd_mg_ha,
        total_dry_biomass_t=total_biomass_t,
        carbon_t=carbon_t,
        co2e_t=co2e_t,
        lower_t=lower_t,
        upper_t=upper_t,
        confidence_level="DATA_DEPENDENT",
        warnings=warnings,
    )
```

### 18.2 Field allometry path

For species-specific field allometry, the calculator requires only variables that the selected equation actually uses. A generic equation must not be assumed to be valid for every species or region.

```text
Field inventory
    ↓
Validate species/region/range
    ↓
Select approved equation
    ↓
Calculate biomass per tree/plot
    ↓
Aggregate to t/ha
    ↓
Propagate measurement/model uncertainty
    ↓
Optional C / CO2e conversion
```

### 18.3 Numerical sanity check from v1

The equation used in v1:

$$AGB_{tree}=0.0509\times h^{2.5124}$$

with $h=18.45$m gives approximately 77.2 kg/tree. At 800 trees/ha, that is approximately 61.7 t/ha, not 20.4 t/ha. Therefore the example JSON from v1 was numerically inconsistent with its own declared formula.

Version 2 removes that example from production documentation and requires all sample responses to be generated from executable tests so the displayed numbers match the code.

---

## 19. Level 2 API

**`POST /api/v1/satellite/carbon`**

Request concept:

```python
class CarbonRequest(BaseModel):
    plot_id: UUID
    start_date: date | None = None
    end_date: date | None = None
    method: Literal["GEDI_L4A", "FIELD_ALLOMETRY", "HYBRID"] = "GEDI_L4A"
    species: str | None = None
    field_tree_density_ha: float | None = Field(default=None, gt=0)
    carbon_fraction: float | None = Field(default=None, gt=0, le=1)
```

Example response shape:

```json
{
  "assessment_id": "7f3a9100-c4e2-4b1d-b923-889900112233",
  "plot_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GEDI_L4A",
  "carbon_summary": {
    "area_ha": 5.0,
    "agbd_mean_mg_ha": 62.4,
    "agbd_se_mg_ha": 8.1,
    "agbd_pi_lower_mg_ha": 48.0,
    "agbd_pi_upper_mg_ha": 79.6,
    "total_dry_biomass_t": 312.0,
    "total_carbon_t": null,
    "total_co2e_t": null
  },
  "gedi": {
    "valid_observations": 17,
    "valid_pixel_fraction": 0.31,
    "source_period_end": "2025-07-01"
  },
  "quality": {
    "confidence_level": "DATA_DEPENDENT",
    "warnings": [
      "GEDI coverage is spatially sparse; result is not wall-to-wall plot census."
    ]
  },
  "methodology_version": "CARBON-1.0"
}
```

The numeric values above are illustrative schema values only and must not be presented as a real plot result.

---

## 20. Spatial Module Structure

```text
backend/app/
├── api/v1/satellite/
│   ├── router.py
│   ├── triage.py
│   └── carbon.py
│
├── services/satellite/
│   ├── sentinel_service.py
│   ├── gedi_l2a_service.py
│   ├── gedi_l4a_service.py
│   ├── triage_engine.py
│   ├── biomass_service.py
│   └── uncertainty_service.py
│
├── schemas/satellite/
│   ├── triage.py
│   └── carbon.py
│
└── models/
    ├── satellite_triage_assessment.py
    └── carbon_assessment.py
```

---

## 21. Spatial Module Quality Gates

An assessment is not considered quantitatively usable merely because the API returned a number.

### Level 1 gates

- geometry valid;
- minimum valid-pixel fraction met;
- enough observations in the baseline/current windows;
- cloud/shadow fraction recorded;
- comparable seasonal baseline documented.

### Level 2 gates

- GEDI product/version documented;
- valid observation/pixel count recorded;
- spatial coverage diagnostic recorded;
- biomass method approved;
- allometric equation approved and within calibration domain;
- uncertainty available or limitation explicitly reported;
- GEDI observation period/version visible in metadata; historical/current status is explicit.
- for young plots, a field-allometry path exists or GEDI applicability is explicitly validated.

---

## 22. Reference Mathematical Formulas

### 22.1 NDVI

$$NDVI = \frac{NIR - Red}{NIR + Red} = \frac{B8 - B4}{B8 + B4}$$

This is a vegetation spectral index, not a tree-survival estimator.

### 22.2 Temporal change

$$\Delta NDVI = NDVI_{current} - NDVI_{baseline}$$

Interpretation is contextual and season-dependent. A negative value is not by itself evidence of subsidy non-compliance.

### 22.3 Field survival estimate

For equal-area sampling units under the chosen MVP approximation:

$$p_i = \frac{alive_i}{denominator_i}$$

$$\hat p = \frac{1}{n}\sum_{i=1}^{n} p_i$$

The production confidence interval must follow the approved sampling design.

### 22.4 GEDI biomass density

For GEDI L4A:

$$AGBD_{plot} = \overline{AGBD}_{Mg/ha}\times A_{ha}$$

Since $1\,Mg = 1\,t$, the result is expressed in metric tons of aboveground biomass.

### 22.5 Carbon conversion

$$C = AGB\times f_C$$

where $f_C$ is a methodology-specific carbon fraction.

### 22.6 CO₂ equivalent

$$CO_2e = C\times\frac{44.01}{12.01}$$

The carbon fraction and reporting scope must be explicitly documented.

---

## 23. Implementation Acceptance Criteria

The v2 system is not considered ready for production subsidy use until all of the following are true:

### Architecture

- one responsive PWA is the field client;
- backend is the system of record;
- audit evidence is immutable/revisioned rather than overwritten;
- triage, audit and subsidy states are separate.

### Field science

- sampling units are stored independently;
- denominator definition is approved;
- survival estimate and uncertainty are reproducible from stored observations;
- survival result fields are computed server-side and cannot be supplied by the client;
- methodology version is persisted.

### Satellite

- pixel-level cloud/shadow handling is active;
- seasonal baseline logic is documented;
- triage is NORMAL/ANOMALY/INCONCLUSIVE;
- no satellite-derived `survival_pct` is used as a direct subsidy gate.

### Carbon

- at least one approved biomass methodology is documented;
- no arbitrary NDVI tree-density mapping remains in production code;
- uncertainty is not derived from `(1-R²)×100`;
- GEDI units and the exact observation period/product version are correctly reported;
- young-plot carbon falls back to field allometry unless GEDI applicability has been validated;
- sample values in API documentation are generated/verified against tests.

### Security/evidence

- SHA-256 is calculated server-side;
- server receipt timestamps are stored;
- photo capture GPS/time/accuracy are stored independently of EXIF;
- geofence result records GPS accuracy and method;
- replay/duplicate submission is controlled by idempotency;
- limitations of browser-based antifraud controls are documented.

### Pilot

- audit time and sync success meet operational targets;
- satellite triage has a validated confusion matrix;
- catastrophic-loss recall target is defined and measured from an adequately sized backtest/prospective validation design;
- the PWA storage-health and installed-mode requirements pass field tests;
- carbon output is accepted as an analytical estimate rather than represented as carbon-credit MRV unless a separate MRV methodology is formally adopted.

---

## 24. Revision Log — v1.0 → v2.0

| Area | Change |
|---|---|
| Field client | Flutter/Drift replaced by React/Vite/TypeScript/Tailwind + IndexedDB PWA |
| Architecture | Satellite removed from direct subsidy gate |
| State machine | Single `status` replaced by independent triage/audit/subsidy states |
| Audit model | Single tree-count aggregate replaced by multiple sampling units |
| Statistics | Added estimated survival + confidence interval + methodology version |
| Geofence | Centroid distance replaced by polygon-aware validation + GPS accuracy |
| Sync | Removed unnecessary generic version conflict model for immutable evidence; added idempotency/revisions |
| Photos | SHA-256 retained but explicitly limited to integrity verification |
| Sentinel-2 | Added pixel-level cloud probability and shadow/data-quality handling |
| Sentinel-2 | Removed `NDVI > 0.4 = survival` business logic |
| Sentinel-2 | Same-season temporal baseline preferred over arbitrary planting/current comparison |
| Sentinel-2 | Removed 5 m "super-resolution" claim as a native resolution increase |
| GEDI | Corrected RH units: meters, not centimeters |
| GEDI | Quality flags handled as product fields/bands rather than image properties where applicable |
| GEDI | Removed `size()` as spatial coverage percentage proxy |
| GEDI | Added historical observation-date labeling |
| Carbon | GEDI L4A AGBD prioritized when applicable |
| Carbon | Removed NDVI-based tree-density proxy |
| Carbon | Removed `(1-R²)×100` uncertainty formula |
| Carbon | Allometric equations must be catalogued, sourced, versioned and range-checked |
| Carbon | Carbon calculation decoupled from subsidy decision |
| Examples | Removed inconsistent v1 numerical example and added executable-sanity requirement |
| Schedule | Added scientific spike phase and reordered work so methodology precedes production claims |

---

## 25. External Technical References to Verify During Implementation

The implementation should keep an explicit bibliography with access date and dataset version. At minimum, verify the current documentation for:

- Google Earth Engine — Sentinel-2 Surface Reflectance Harmonized dataset.
- Google Earth Engine — Sentinel-2 Cloud Probability dataset.
- Google Earth Engine — GEDI L2A Vector and Monthly Raster products.
- Google Earth Engine — GEDI L4A Aboveground Biomass Density products/version actually exposed in the production GEE account.
- NASA GEDI mission documentation and product user guides, including the L4A Version 3 documentation where applicable.
- The exact scientific publication/source for every local allometric equation adopted by Probosque.
- The applicable Probosque/IPCC carbon methodology and carbon fraction.
- MDN/WebKit documentation for persistent storage and Background Sync behavior.
- NASA ORNL DAAC GEDI L4A Version 3 documentation and Google Earth Engine GEDI catalog/version actually used in production.


## 26. Revision Log — v2.0 → v2.1

| Area | Change |
|---|---|
| PWA storage | Added installed-PWA operational requirement, persistent-storage request, quota/usage monitoring and storage-health state |
| Photo evidence | Moved capture GPS/time/accuracy into first-class event metadata; EXIF is optional corroboration |
| Sync security | Added concrete challenge/nonce table and `POST /api/v1/sync/challenges` contract |
| Device identity | Added `device_installations` with optional per-installation public key for signed event envelopes |
| Master schema | Explicitly defined `users`, `technicians`, `beneficiaries` and device installations |
| Geometry | `plots.area_ha` is now derived from canonical PostGIS geometry |
| Audit results | Added server-computed immutable `audit_results` table; client cannot supply authoritative survival/CI values |
| Statistics | Replaced unweighted mean as MVP default with ratio estimator and Student-t CI for small sample counts |
| Satellite validation | Added historical backtest requirement; a 10-plot pilot is explicitly insufficient to claim ≥95% recall |
| Carbon | Young 1–5 year reforestation policy now defaults to field allometry pending validation |
| GEDI temporal status | Corrected blanket “historical” statement: actual product/version/window must be stored; GEE V2.1 and NASA L4A V3 have different coverage |
| Schedule | Rebased single-developer roadmap to 28 weeks, with 26–30 week range and less overlap |
| Numbering | Fixed duplicate Section 11 and renumbered the document consistently |

---

*This version intentionally leaves several parameters open because they require validation with Probosque's operational rules, field data and scientific references. Those unknowns are captured as explicit configuration/approval gates rather than hidden assumptions.*