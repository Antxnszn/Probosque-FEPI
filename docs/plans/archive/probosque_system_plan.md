# Technical Implementation Plan — Probosque Forest Audit and Subsidy System

**Author:** Roberto Navarro  
**Date:** September 28, 2026  
**Version:** 1.0  
**Status:** Draft — Pending approval

---

## 1. Executive Summary

The objective of this plan is to modernize the complete audit and forest subsidy assignment workflow for Probosque. Currently, forestry technicians validate the survival of reforestation plots (threshold ≥ 80% to release a $2,000 MXN/ha subsidy) through an analog process: compensated ropes, manual paper counting, and double data entry in Excel. This creates high latency, environmental vulnerability of the data, and fraud risk.

I will implement a three-layer hybrid architecture that replaces this analog workflow with a digital, verifiable, offline-first system with automated satellite triage.

---

## 2. General Architecture

The solution operates as a restrictive state machine that collapses environmental data and telemetry into a boolean approval gate. It is structured in three layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 1 — SATELLITE TRIAGE                       │
│         Python · GEE/Sentinel Hub · Celery · Redis                  │
│                                                                     │
│   Sentinel-2 ──► NDVI/EVI ──► Temporal delta ──► Decision:          │
│                                                   REJECT / PASS     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ If it passes the filter
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                LAYER 2 — MOBILE AUDIT APP                           │
│           Flutter (Dart) · SQLite/Drift · Mapbox Offline            │
│                                                                     │
│   Geofencing ──► Binary form ──► Photos with EXIF+Hash ──►         │
│                                  Local sync queue                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ When connectivity is restored
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              LAYER 3 — BACKEND & INFRASTRUCTURE                     │
│     Python · FastAPI · PostgreSQL/PostGIS · Redis · MinIO           │
│                                                                     │
│   REST API ──► Conflict resolution ──► Persistence ──►             │
│                                         Admin dashboard             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack and Dependencies

### 3.1 Satellite Layer (Triage)

| Component | Technology | Minimum Version |
|---|---|---|
| Language | Python | 3.12+ |
| Satellite ingestion | Google Earth Engine (earthengine-api) | 1.x |
| Commercial alternative | Sentinel Hub (sentinelhub-py) | 3.x |
| Raster processing | rasterio, xarray | 1.3+, 2024.x |
| Geometries | Shapely, GeoPandas | 2.x, 0.14+ |
| Numerical computing | NumPy, Pandas | 1.26+, 2.x |
| Orchestration | Celery | 5.x |
| Message broker | Redis | 7.x |
| Dependency management | uv | latest |

**Rationale:** Python is the only ecosystem where mature geospatial libraries, official satellite APIs, and ML frameworks converge. I choose GEE because Sentinel-2 comes preprocessed (surface reflectance), which saves me all the atmospheric correction. If I need a commercial SLA in production, I can migrate to Sentinel Hub without changing the business logic.

### 3.2 Mobile App (Edge Computing)

| Component | Technology | Minimum Version |
|---|---|---|
| Framework | Flutter | 3.24+ |
| Language | Dart | 3.5+ |
| Local persistence | SQLite via Drift | 2.x |
| Offline maps | flutter_map + mbtiles | 6.x |
| GPS / Geolocation | geolocator | 12.x |
| Camera + EXIF | camera, native_exif | latest |
| Cryptographic hashing | crypto (Dart) | latest |
| Sync serialization | json_serializable, freezed | latest |

**Rationale:** I chose Flutter over React Native for an operational reason: forestry technicians use low-end Android devices (government budget). Flutter compiles to native ARM code without a JavaScript bridge, giving better performance on devices with 2–3 GB of RAM. Drift lets me define the SQLite schema in Dart with typed migrations and code generation, which is critical for synchronization because I need full control over versioning columns.

I ruled out WatermelonDB because, although it has sync primitives, it is tied to React Native and its sync engine assumes a pull-push pattern that does not fit my conflict resolution workflow (where the backend is the absolute source of truth and the edge never wins a conflict).

### 3.3 Backend & Infrastructure

| Component | Technology | Minimum Version |
|---|---|---|
| Language | Python | 3.12+ |
| API Framework | FastAPI | 0.115+ |
| Validation | Pydantic | 2.x |
| Database | PostgreSQL + PostGIS | 16 + 3.4 |
| ORM | SQLAlchemy 2.0 + GeoAlchemy2 | 2.0+, 0.15+ |
| Migrations | Alembic | 1.13+ |
| Task queue | Celery + Redis | 5.x + 7.x |
| Photo storage | MinIO (S3-compatible) | latest |
| Authentication | python-jose (JWT) + passlib | latest |
| ASGI server | Uvicorn | 0.30+ |
| Containers | Docker + Docker Compose | 25.x + 2.x |
| Dependency management | uv | latest |

**Rationale:** FastAPI gives me native async, automatic Pydantic validation, and OpenAPI documentation with no extra effort. PostgreSQL with PostGIS is the standard for geospatial data; there is no serious alternative. I use MinIO to store evidence photographs because they are legal documents that require versioning and durability — it is also S3-compatible, so if I migrate to AWS later, I won't change a single line of code.

### 3.4 Cross-Cutting Tools

| Need | Tool |
|---|---|
| CI/CD | GitHub Actions |
| Error monitoring | Sentry |
| Metrics / Observability | Prometheus + Grafana |
| Testing (backend) | pytest + pytest-asyncio + factory_boy |
| Testing (mobile) | Flutter test + integration_test |
| Python linting | ruff |
| Python formatting | ruff format |
| API documentation | Swagger UI (integrated in FastAPI) |

---

## 4. Data Model

### 4.1 Remote Schema (PostgreSQL + PostGIS)

```sql
-- Main table for plots/records
CREATE TABLE plots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadastral_key   VARCHAR(50) UNIQUE NOT NULL,
    beneficiary_id  UUID NOT NULL REFERENCES beneficiaries(id),
    area_ha         DECIMAL(10,4) NOT NULL,
    geom            GEOMETRY(Polygon, 4326) NOT NULL,  -- WGS84 polygon
    centroid        GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_Centroid(geom)) STORED,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending_triage',
        -- pending_triage | triage_approved | triage_rejected
        -- under_audit | audit_completed
        -- subsidy_approved | subsidy_rejected
    ndvi_baseline   DECIMAL(6,4),
    ndvi_latest     DECIMAL(6,4),
    ndvi_delta      DECIMAL(6,4),
    triage_date     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_plots_geom   ON plots USING GIST(geom);
CREATE INDEX idx_plots_status ON plots(status);

-- Field audits
CREATE TABLE audits (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    technician_id           UUID NOT NULL REFERENCES technicians(id),
    survey_date             TIMESTAMPTZ NOT NULL,
    total_trees             INTEGER NOT NULL,
    alive_trees             INTEGER NOT NULL,
    dead_trees              INTEGER NOT NULL,
    survival_pct            DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_trees > 0
             THEN (alive_trees::DECIMAL / total_trees) * 100
             ELSE 0
        END
    ) STORED,
    subsidy_approved        BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN total_trees > 0
             THEN (alive_trees::DECIMAL / total_trees) >= 0.80
             ELSE FALSE
        END
    ) STORED,
    gps_lat_start           DECIMAL(10,7) NOT NULL,
    gps_lon_start           DECIMAL(10,7) NOT NULL,
    gps_lat_end             DECIMAL(10,7) NOT NULL,
    gps_lon_end             DECIMAL(10,7) NOT NULL,
    distance_to_centroid_m  DECIMAL(8,2),  -- Geofencing validation
    geofence_valid          BOOLEAN NOT NULL DEFAULT FALSE,
    device_id               VARCHAR(100) NOT NULL,
    sync_status             VARCHAR(20) NOT NULL DEFAULT 'synced',
    sync_conflict           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    version                 INTEGER NOT NULL DEFAULT 1
);

-- Evidence photographs with cryptographic integrity
CREATE TABLE evidence_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id        UUID NOT NULL REFERENCES audits(id),
    file_key        VARCHAR(500) NOT NULL,  -- MinIO/S3 key
    hash_sha256     VARCHAR(64) NOT NULL,   -- File integrity
    exif_timestamp  TIMESTAMPTZ,
    exif_lat        DECIMAL(10,7),
    exif_lon        DECIMAL(10,7),
    type            VARCHAR(20) NOT NULL,   -- panoramic | detail | sample
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sync queue for tracking
CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       VARCHAR(100) NOT NULL,
    payload_hash    VARCHAR(64) NOT NULL,
    received_at     TIMESTAMPTZ DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'received',
        -- received | processing | completed | conflict | error
    conflict_detail JSONB,
    client_version  INTEGER NOT NULL,
    server_version  INTEGER
);
```

### 4.2 Local Schema (SQLite via Drift)

The local schema is a subset of the remote one, with additional sync control columns:

```dart
// Drift (Dart) definition
class LocalAudits extends Table {
  // Identifiers
  TextColumn get id => text()();            // UUID generated on client
  TextColumn get plotId => text()();
  TextColumn get technicianId => text()();

  // Audit data
  DateTimeColumn get surveyDate => dateTime()();
  IntColumn get totalTrees => integer()();
  IntColumn get aliveTrees => integer()();
  IntColumn get deadTrees => integer()();

  // GPS telemetry
  RealColumn get gpsLatStart => real()();
  RealColumn get gpsLonStart => real()();
  RealColumn get gpsLatEnd => real()();
  RealColumn get gpsLonEnd => real()();
  RealColumn get distanceToCentroidM => real()();
  BoolColumn get geofenceValid => boolean().withDefault(const Constant(false))();

  // Device control
  TextColumn get deviceId => text()();

  // ** Sync columns **
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
      // pending | queued | syncing | synced | conflict | error
  IntColumn get syncRetries => integer().withDefault(const Constant(0))();
  DateTimeColumn get syncLastAttempt => dateTime().nullable()();
  TextColumn get syncErrorDetail => text().nullable()();
  IntColumn get localVersion => integer().withDefault(const Constant(1))();

  // Timestamps
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
```

The key difference between both schemas is that the local one adds `syncStatus`, `syncRetries`, `syncLastAttempt`, `syncErrorDetail`, and `localVersion`. These columns do not exist on the remote side because there the data is already reconciled.

---

## 5. Asynchronous Synchronization Protocol

### 5.1 Guiding Principle

> **The backend is the absolute source of truth.** In case of conflict, the server always wins. The edge never overwrites data that the server has already modified.

This is a deliberate design: since we are handling government subsidies, I cannot allow a field device to modify data that has already been validated or rejected by the satellite pipeline.

### 5.2 Synchronization Flow

```
DEVICE (Edge)                                   SERVER (Backend)
      │                                                │
      │  1. Technician completes offline audit          │
      │     syncStatus = 'pending'                      │
      │                                                │
      │  2. Detects connectivity                        │
      │     syncStatus = 'queued'                       │
      │                                                │
      │  3. POST /api/v1/sync/push                      │
      │     Body: {audits[], photos[], localVersion}    │
      │────────────────────────────────────────────────►│
      │                                                │  4. Server validates:
      │                                                │     - Integrity hash
      │                                                │     - Geofence (distance to centroid)
      │                                                │     - Version (localVersion vs serverVersion)
      │                                                │
      │                              ┌─── No conflict  │  5a. If localVersion >= serverVersion:
      │                              │                 │      Accepts, increments version
      │◄─────── 200 OK ─────────────┘                 │      sync_log.status = 'completed'
      │  syncStatus = 'synced'                         │
      │                                                │
      │                              ┌─── Conflict     │  5b. If localVersion < serverVersion:
      │                              │                 │      Partially rejects
      │◄─── 409 Conflict ───────────┘                 │      sync_log.status = 'conflict'
      │  syncStatus = 'conflict'                       │      Returns: serverVersion + diff
      │                                                │
      │  6. GET /api/v1/sync/pull?since=<timestamp>    │
      │────────────────────────────────────────────────►│
      │◄──── Updated data from server ─────────────────│  7. Returns updated plots
      │  Overwrites conflicting local data              │     (triage statuses, subsidies, etc.)
      │  syncStatus = 'synced'                         │
      │                                                │
```

### 5.3 Photo Handling

Photos are synchronized separately from the audit JSON to avoid blocking the queue:

1. The audit JSON is uploaded first (lightweight, ~2–5 KB).
2. Then photos are uploaded one by one with `PUT /api/v1/sync/photo/{audit_id}/{photo_id}`.
3. Each photo carries its SHA-256 hash in the header. The server recalculates the hash and compares.
4. If a photo fails, it is retried with exponential backoff (3 attempts, max 5 min between retries).
5. The audit remains in `partially_synced` state until all photos are uploaded.

### 5.4 Retry Strategy

```
Attempt 1: immediate
Attempt 2: 30 seconds later
Attempt 3: 2 minutes later
Attempt 4: 10 minutes later
Attempt 5: 1 hour later
After attempt 5: syncStatus = 'error', requires manual intervention
```

---

## 6. Satellite Triage Pipeline

### 6.1 Logical Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Scheduler   │────►│  Celery Worker    │────►│  Google Earth    │
│  (Weekly     │     │  triage_task()    │     │  Engine API      │
│  cron)       │     │                   │     │                  │
└──────────────┘     └────────┬──────────┘     └──────────────────┘
                              │
                              ▼
                     ┌───────────────────┐
                     │  Temporal NDVI    │
                     │  Delta Calculation│
                     │                   │
                     │  NDVI_t0 (base-   │
                     │  line, planting   │
                     │  period)          │
                     │       vs          │
                     │  NDVI_tn (current)│
                     └────────┬──────────┘
                              │
                              ▼
                     ┌───────────────────┐
                     │  Decision Rules:  │
                     │                   │
                     │  Δ < -0.15 ──► REJECT  (catastrophic event)
                     │  Δ ≥ -0.15 ──► PASS    (requires audit)
                     └────────┬──────────┘
                              │
                              ▼
                     ┌───────────────────┐
                     │  UPDATE plots     │
                     │  SET status =     │
                     │  'triage_*'       │
                     │  ndvi_delta = Δ   │
                     └───────────────────┘
```

### 6.2 NDVI Calculation Logic

```python
import ee

def calculate_ndvi_delta(polygon_geojson: dict, base_date: str, current_date: str) -> float:
    """
    Calculates the NDVI delta between the planting date and the current date
    for a given polygon.

    Returns: NDVI delta (negative = biomass loss)
    """
    ee.Initialize()

    aoi = ee.Geometry(polygon_geojson)

    # Sentinel-2 Surface Reflectance collection, filtered by clouds < 20%
    def get_mean_ndvi(start_date: str, end_date: str) -> float:
        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(aoi)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        )

        ndvi = collection.map(
            lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')
        ).median()

        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=10  # Native resolution of Sentinel-2 bands B4/B8
        )

        return stats.get('NDVI').getInfo()

    ndvi_base    = get_mean_ndvi(base_date, add_days(base_date, 30))
    ndvi_current = get_mean_ndvi(subtract_days(current_date, 30), current_date)

    return ndvi_current - ndvi_base
```

### 6.3 Decision Thresholds

| NDVI Delta | Interpretation | Action |
|---|---|---|
| Δ < -0.30 | Severe loss (fire, deforestation, urbanization) | **Automatic rejection** + administrative alert |
| -0.30 ≤ Δ < -0.15 | Significant loss | **Automatic rejection** + manual review suggested |
| -0.15 ≤ Δ < 0.00 | Mild / seasonal loss | **Passes to field audit** |
| Δ ≥ 0.00 | Stable or growing biomass | **Passes to field audit** (low priority) |

> These thresholds will be calibrated during the field testing phase using real historical data from Probosque plots.

---

## 7. Project Structure

```
probosque/
├── backend/                        # Layer 3
│   ├── pyproject.toml              # Dependencies with uv
│   ├── alembic/                    # DB migrations
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Settings (Pydantic BaseSettings)
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── plot.py
│   │   │   ├── audit.py
│   │   │   ├── evidence_photo.py
│   │   │   └── sync_log.py
│   │   ├── schemas/                # Pydantic schemas (request/response)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── sync.py         # Sync endpoints
│   │   │   │   ├── plots.py        # CRUD plots
│   │   │   │   ├── audits.py       # CRUD audits
│   │   │   │   └── auth.py         # Login / JWT
│   │   ├── services/               # Business logic
│   │   │   ├── sync_service.py     # Conflict resolution
│   │   │   ├── geofence_service.py # Geofencing validation
│   │   │   └── subsidy_service.py  # Approval rules
│   │   ├── tasks/                  # Celery tasks
│   │   │   └── satellite_triage.py # NDVI pipeline
│   │   └── utils/
│   │       ├── hashing.py          # SHA-256
│   │       └── geo.py              # PostGIS helpers
│   ├── tests/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── mobile/                         # Layer 2
│   ├── pubspec.yaml
│   ├── lib/
│   │   ├── main.dart
│   │   ├── database/               # Drift (SQLite)
│   │   │   ├── database.dart
│   │   │   ├── tables/
│   │   │   └── daos/
│   │   ├── models/                 # Domain models
│   │   ├── services/
│   │   │   ├── sync_service.dart   # Sync queue
│   │   │   ├── gps_service.dart    # Geofencing
│   │   │   ├── camera_service.dart # Capture + EXIF + hash
│   │   │   └── map_service.dart    # Offline maps
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── plots_list.dart
│   │   │   ├── audit_form.dart     # Binary alive/dead form
│   │   │   └── sync_status.dart    # Sync status
│   │   └── widgets/
│   └── test/
│
├── satellite/                      # Layer 1
│   ├── pyproject.toml
│   ├── src/
│   │   ├── ndvi_pipeline.py        # NDVI delta calculation
│   │   ├── sentinel_client.py      # GEE / Sentinel Hub wrapper
│   │   ├── decision_engine.py      # Threshold rules
│   │   └── scheduler.py            # Execution scheduling
│   └── tests/
│
├── infra/                          # Infrastructure
│   ├── docker-compose.yml          # Full stack for development
│   ├── k8s/                        # Kubernetes manifests (production)
│   └── scripts/
│       ├── seed_plots.py           # Initial polygon load
│       └── calibrate_ndvi.py       # Threshold calibration
│
└── docs/                           # Documentation
    ├── api.md
    ├── sync_protocol.md
    └── deployment.md
```

---

## 8. Implementation Roadmap by Phase

### Phase 1 — Backend MVP + Triage (Weeks 1–6)

| Week | Deliverable | Detail |
|---|---|---|
| 1–2 | Base infrastructure | Docker Compose (Postgres+PostGIS, Redis, MinIO). DB schema with Alembic. FastAPI project with JWT auth. |
| 3–4 | Plots and audits API | Full CRUD. Sync endpoints (push/pull). Server-side geofencing validation. |
| 5–6 | Satellite pipeline v1 | GEE connection. NDVI calculation for one polygon. Scheduled Celery task. Automatic decision with initial thresholds. |

**Success criterion:** I can upload a polygon, the system queries Sentinel-2, calculates the NDVI delta, and automatically changes the record status.

### Phase 2 — Offline-First Mobile App (Weeks 7–12)

| Week | Deliverable | Detail |
|---|---|---|
| 7–8 | Flutter skeleton + local DB | Flutter project. Drift with local schema. Login and initial download of assigned plots. |
| 9–10 | Audit form | Full flow: geofencing → binary count → photo capture → SHA-256 hash → local save. |
| 11–12 | Sync engine | Local queue. Connectivity detection. Push/Pull with retry and exponential backoff. Conflict handling. |

**Success criterion:** A technician can complete an audit without internet, and when signal is restored, the data syncs to the backend with verified integrity.

### Phase 3 — Field Testing and Calibration (Weeks 13–16)

| Week | Deliverable | Detail |
|---|---|---|
| 13–14 | Controlled pilot | 3–5 technicians on 10 real plots. I measure: audit time, successful sync rate, geofencing accuracy. |
| 15–16 | NDVI calibration | I compare satellite triage decisions with field audit results. I adjust thresholds. I document false positives/negatives. |

**Success criterion:** Audit time reduced by ≥ 50% compared to the analog process. Satellite triage has ≥ 90% agreement with human audit for catastrophic events.

### Phase 4 — Deployment and Hardening (Weeks 17–20)

| Week | Deliverable | Detail |
|---|---|---|
| 17–18 | Production deployment | Migration to Cloud Run or Kubernetes. HTTPS. Automated PostgreSQL backups. Monitoring with Sentry + Grafana. |
| 19–20 | Admin dashboard | Web panel for regional delegates. Plot map with statuses. Approved/rejected subsidy reports. Export to formats required by Probosque. |

---

## 9. Edge Cases and Risks

### 9.1 Technical

| Case | Mitigation |
|---|---|
| Inaccurate GPS under forest canopy | Generous geofencing threshold (50m). If GPS accuracy reported by the device is > 30m, I show a warning but allow continuation, recording the accuracy. |
| Technician tries to audit without being at the plot | Geofencing blocks the form if the distance to the centroid > configurable threshold. No local override. |
| Device runs out of battery mid-audit | Drift persists to SQLite immediately after each form response. On restart, the audit is recovered in the exact state where it left off. |
| Total device loss | Already-synced data is on the server. Unsynced data is lost, but it is detected because the backend knows which plots were assigned and have no audit. |

### 9.2 Satellite

| Case | Mitigation |
|---|---|
| Cloud cover > 80% in all images of the period | The pipeline marks the plot as `triage_inconclusive` and sends it to field audit without a prior filter. It is not rejected due to lack of data. |
| NDVI false positive (healthy plot marked as loss) | The threshold is conservative (-0.15). Also, satellite rejection can always be manually reviewed by an administrator before becoming final. |
| GEE rate limiting or service outage | Retry with backoff in the Celery task. If it fails 3 times, it is marked as `triage_pending` and retried in the next weekly cycle. |

### 9.3 Synchronization

| Case | Mitigation |
|---|---|
| Two technicians audit the same plot | The backend accepts the first synced audit. The second enters with a conflict and is flagged for administrative review. |
| Corrupt payload in transit | SHA-256 hash of the full payload travels in the header. The server recalculates and compares before processing. |
| Mass sync after days without connectivity | The queue processes sequentially with rate limiting (max 5 audits per minute per device) to avoid saturating the backend. |

---

## 10. Pending Design Decisions

Before starting implementation, I need to resolve:

1. **GEE or Sentinel Hub?** — Depends on whether Probosque has budget for a commercial license or qualifies as academic/governmental use of GEE.
2. **Cloud Run or Kubernetes?** — Cloud Run is simpler but has timeout limits (60 min) that could affect the satellite pipeline for large batches.
3. **Mapbox or self-hosted OSM tiles?** — Mapbox charges per offline tile download. If the budget is limited, I can generate custom mbtiles with OpenMapTiles.
4. **Definitive NDVI thresholds** — The current values (-0.15, -0.30) are hypotheses based on literature. I need to calibrate them with real Probosque data.

---

*This plan is subject to approval before starting any code implementation.*

---

---

# Module: Spatial Processing Pipeline — *Capturing Carbon* (Probosque)

**Version:** 1.0  
**Date:** October 5, 2026  
**Role:** Software Architect and Spatial Data Engineer  
**Status:** Technical Draft

---

## 11. Context and Technical Rationale

The *Capturing Carbon* program of Probosque currently operates under an analog verification model with four structural limitations that this module resolves:

| Current Limitation | Proposed Solution |
|---|---|
| Sampling with stakes and 12.62m ropes in 500 m² plots | Pixel-by-pixel spectral analysis at 10m resolution (Sentinel-2) |
| Paper capture susceptible to environmental loss | Fully digital pipeline with satellite traceability |
| Manual double entry (high latency) | API response in < 30 s per polygon |
| Administrative proxy (survival ≥ 80%) without real quantification | Physical CO₂e quantification via allometry + LiDAR (GEDI) |

This module adds two specialized endpoints to the existing FastAPI backend (documented in sections 1–10), extending it with a **satellite geospatial analysis engine** without requiring local image downloads.

### 11.1 Technology Stack of the Satellite Module

The tools are organized by the **specific calculation** they perform within the pipeline:

---

#### Calculation 1 — Geometric Ingestion and Validation of the Polygon

> *Converts the plot polygon into a valid geometry before any satellite query.*

| Tool | Operations performed |
|---|---|
| **Pydantic** `2.x` | Validates GeoJSON structure; rejects malformed geometries at the API layer before processing |
| **Shapely** `2.x` | `is_valid()` — detects self-intersections or incorrect rings; `make_valid()` — automatically repairs them |
| **GeoPandas** `0.14+` | Reprojects from any CRS to WGS84 (EPSG:4326); converts Shapefile → GeoJSON if input comes as `.shp` |
| **FastAPI** `0.115+` | Exposes REST endpoints; handles HTTP errors (422 if invalid geometry, 400 if parameters out of range) |

---

#### Calculation 2 — NDVI and % Survival (Sentinel-2 via GEE)
**NDVI**: Normalized Difference Vegetation Index, measures the quantity, density, and health of vegetation from satellite imagery.
> *Level 1: determines what fraction of the plot has healthy vegetation (NDVI > 0.4).*

| Tool | Operations performed |
|---|---|
| **`earthengine-api`** | Filters the `COPERNICUS/S2_SR_HARMONIZED` collection by AOI, date, and `CLOUDY_PIXEL_PERCENTAGE < 20%` |
| **GEE** *(remote server)* | `normalizedDifference(['B8','B4'])` — calculates NDVI pixel by pixel (B8=NIR, B4=Red); `reduceRegion(Reducer.count())` — counts total pixels; `reduceRegion(Reducer.sum())` — sums pixels with NDVI > threshold; `reduceRegion(Reducer.mean())` — mean NDVI of the polygon |
| **`rasterio`** *(fallback)* | If GEE is unavailable: reads locally downloaded `.SAFE` scenes and runs the same band algebra |
| **`numpy`** *(fallback)* | `(nir - red) / (nir + red)` — matrix operation on pixel arrays if `rasterio` is used instead of GEE |
| **PostgreSQL + PostGIS** | Persists the result in `level1_assessments`; generated column `survival_pct` and `favorable_assessment` calculated in DB |

$$NDVI = \frac{B8 - B4}{B8 + B4} \qquad \% Sup. = \frac{\text{píxeles}_{NDVI>0.4}}{\text{píxeles}_{total}} \times 100$$

---

#### Calculation 3 — Canopy Height with LiDAR (GEDI via GEE)

> *Level 2: extracts the vertical structure of the forest to estimate volume and biomass.*

| Tool | Operations performed |
|---|---|
| **`earthengine-api`** | Filters the `LARSE/GEDI/GEDI02_A_002` collection within the AOI; applies `quality_flag = 1` and `degrade_flag = 0` |
| **GEE** *(remote server)* | `.select(['rh100','rh75'])` — selects LiDAR return metrics; `.mean().divide(100)` — converts centimeters → meters; `reduceRegion(Reducer.mean())` — averages footprints within the polygon |
| **`earthengine-api`** | `aoi.area()` — calculates AOI area; `gedi.size()` — counts valid shots to estimate GEDI coverage (%) |
| **PostgreSQL** | Persists `rh100_mean_m`, `rh75_mean_m`, `gedi_shots_count`, `gedi_coverage_pct` in `level2_assessments` |

---

#### Calculation 4 — Allometry, Dry Biomass, and CO₂ Equivalent

> *Level 2: converts height + active leaf area into metric tons of CO₂e.*

| Tool | Operations performed |
|---|---|
| **Python (`biomass_calculator.py`)** | `AGB_tree = a × rh100^b` — height allometric equation (Návar 2018 / Chave 2014) |
| **Python** | Estimates tree density/ha if not provided: proxy by NDVI quintile (300–1,100 trees/ha) |
| **Python** | `dry_biomass_t_ha = AGB_tree × density`; `total_biomass = biomass_t_ha × area_ha` |
| **Python** | `C = total_biomass × 0.50` (IPCC Tier 1 fraction); `CO₂e = C × 3.67` (stoichiometric ratio 44/12) |
| **Python** | Uncertainty propagation: `(1 - R²) × 100` + penalties for estimated density or uncatalogued species |
| **PostgreSQL** | Auto-generated columns: `total_carbon_t` and `total_co2e_t` in `level2_assessments` |

$$AGB_{total} = \frac{a \times h^{b}}{1000} \times \rho_{densidad} \times A_{ha} \qquad CO_2e = AGB_{total} \times 0.5 \times 3.67$$

---

#### Infrastructure and Plumbing

> *Does not perform scientific calculations — manages execution, persistence, and deployment.*

| Tool | Role |
|---|---|
| **`uv`** | Dependency management and virtual environments; reproducible installation |
| **Celery + Redis** | Executes GEE calculations as background tasks when they exceed the FastAPI HTTP timeout |
| **SQLAlchemy + GeoAlchemy2** | ORM mapping of WKB geometries and PostGIS spatial types to Python models |
| **Docker + Compose** | Containerizes the satellite service with its GDAL/GEOS dependencies without polluting the host environment |

> **Key design decision:** `rasterio` and `numpy` are **not** the primary engine. GEE executes all map algebra in its distributed infrastructure; these libraries are the **fallback** when the service is unavailable.


---

## 12. Spatial Pipeline Architecture

### 12.1 General Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CLIENT (REST / GeoJSON)                           │
│           POST /api/v1/satellite/level1/survival                     │
│           POST /api/v1/satellite/level2/carbon                       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FastAPI — Satellite Router                        │
│                  (Pydantic / GeoJSON Validation)                     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
           ┌───────────────┴────────────────┐
           ▼                                ▼
┌─────────────────────┐          ┌─────────────────────────┐
│  SentinelService    │          │  GediService             │
│  (Google Earth      │          │  (GEDI L2A via GEE)      │
│  Engine API)        │          │  LiDAR footprint RH100   │
│                     │          │                          │
│  Collection:        │          │  Product:                │
│  COPERNICUS/        │          │  LARSE/GEDI/GEDI02_A_002 │
│  S2_SR_HARMONIZED   │          │  Metric: rh100           │
│                     │          │                          │
│  Bands: B4, B8      │          │  Filter: quality_flag=1  │
└────────┬────────────┘          └──────────┬───────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────────┐
│  NdviProcessor      │          │  BiomassCalculator       │
│  Map Algebra        │          │  Forest Allometry        │
│  NDVI > 0.4 → mask  │          │  + Carbon Fraction       │
│  % active pixels    │          │  + CO₂e Factor (3.67)    │
└────────┬────────────┘          └──────────┬───────────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        ▼
             ┌──────────────────────┐
             │  PostGIS — Persistence│
             │  level1_assessments  │
             │  level2_assessments  │
             └──────────────────────┘
```

### 12.2 Compute Delegation Principle (GEE-first)

To avoid the bottleneck of downloading terabytes of images locally, the system applies the **"compute where the data lives"** principle:

- **Google Earth Engine** executes all map algebra in its distributed infrastructure
- The Python backend only receives **scalar results** (mean NDVI, % of pixels, RH100 height)
- `rasterio` and `numpy` are reserved for cases where GEE does not cover the analysis (local processing of on-demand cutouts)

---

## 13. Data Model Extension (PostGIS)

### 13.1 New Tables

```sql
-- ─────────────────────────────────────────────────────────────────────
-- LEVEL 1 ASSESSMENT: Survival Validation via NDVI (Sentinel-2)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE level1_assessments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id                 UUID NOT NULL REFERENCES plots(id),

    -- Vector input
    polygon_geojson         JSONB NOT NULL,
    area_ha                 DECIMAL(10, 4) NOT NULL,

    -- Spectral result (Sentinel-2)
    sentinel_image_id       VARCHAR(100),           -- ID of the scene used
    image_date              DATE,                   -- Acquisition date
    cloud_cover_pct         DECIMAL(5, 2),          -- % of clouds in the scene
    mean_ndvi               DECIMAL(6, 4),          -- Mean NDVI of the polygon
    total_pixels            INTEGER,                -- Total pixels in AOI
    active_pixels           INTEGER,                -- Pixels with NDVI > 0.4
    survival_pct            DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN total_pixels > 0
             THEN (active_pixels::DECIMAL / total_pixels) * 100
             ELSE 0
        END
    ) STORED,

    -- Assessment
    survival_threshold      DECIMAL(5, 2) NOT NULL DEFAULT 80.0,
    favorable_assessment    BOOLEAN GENERATED ALWAYS AS (
        (active_pixels::DECIMAL / NULLIF(total_pixels, 0)) * 100 >= 80.0
    ) STORED,

    -- Processing metadata
    gee_task_id             VARCHAR(200),
    processing_time_ms      INTEGER,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_pixels CHECK (active_pixels <= total_pixels)
);

CREATE INDEX idx_level1_plot ON level1_assessments(plot_id);
CREATE INDEX idx_level1_date ON level1_assessments(image_date DESC);


-- ─────────────────────────────────────────────────────────────────────
-- LEVEL 2 ASSESSMENT: Biomass and CO₂e Estimation (Sentinel-2 + GEDI)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE level2_assessments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id                 UUID NOT NULL REFERENCES plots(id),
    level1_assessment_id    UUID REFERENCES level1_assessments(id),

    -- Vector input
    polygon_geojson         JSONB NOT NULL,
    area_ha                 DECIMAL(10, 4) NOT NULL,

    -- Sentinel-2 data (active leaf area)
    mean_ndvi               DECIMAL(6, 4),
    estimated_lai           DECIMAL(6, 4),   -- Leaf Area Index (NDVI proxy)

    -- GEDI LiDAR data (vertical structure)
    gedi_shots_count        INTEGER,         -- Laser footprints found in AOI
    rh100_mean_m            DECIMAL(7, 3),   -- Max canopy height (meters)
    rh75_mean_m             DECIMAL(7, 3),   -- 75th percentile height (meters)
    gedi_coverage_pct       DECIMAL(5, 2),   -- % of polygon with GEDI data

    -- Allometry and Biomass
    dominant_species        VARCHAR(100),    -- e.g.: 'Pinus patula', 'Quercus spp.'
    allometric_equation     VARCHAR(50),     -- ID of equation used
    stem_volume_m3_ha       DECIMAL(10, 4),  -- Stem volume (m³/ha)
    dry_biomass_t_ha        DECIMAL(10, 4),  -- Dry biomass (t/ha)
    total_dry_biomass_t     DECIMAL(12, 4),  -- Total dry biomass (t)

    -- Carbon conversion
    carbon_fraction         DECIMAL(4, 3) NOT NULL DEFAULT 0.500, -- IPCC default
    total_carbon_t          DECIMAL(12, 4) GENERATED ALWAYS AS (
        total_dry_biomass_t * 0.500
    ) STORED,
    total_co2e_t            DECIMAL(12, 4) GENERATED ALWAYS AS (
        total_dry_biomass_t * 0.500 * 3.67
    ) STORED,  -- Stoichiometric factor C→CO₂

    -- Uncertainty and quality
    uncertainty_pct         DECIMAL(5, 2),   -- % model uncertainty
    confidence_level        VARCHAR(20),     -- 'high' | 'medium' | 'low'
    warnings                JSONB,           -- Pipeline warning list

    -- Processing metadata
    gee_task_id             VARCHAR(200),
    processing_time_ms      INTEGER,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_level2_plot ON level2_assessments(plot_id);
CREATE INDEX idx_level2_l1   ON level2_assessments(level1_assessment_id);


-- ─────────────────────────────────────────────────────────────────────
-- ALLOMETRIC EQUATIONS CATALOG
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE allometric_equations (
    id              VARCHAR(50) PRIMARY KEY,   -- e.g.: 'PINUS_PATULA_MEXC_2018'
    species         VARCHAR(100) NOT NULL,
    region          VARCHAR(100),              -- 'Estado de Mexico', 'Sierra Nevada'
    parameter_a     DECIMAL(12, 6) NOT NULL,   -- Coefficient a
    parameter_b     DECIMAL(12, 6) NOT NULL,   -- Coefficient b (exponent)
    parameter_c     DECIMAL(12, 6),            -- Coefficient c (if applicable)
    variable_x      VARCHAR(50) NOT NULL,      -- 'DBH', 'height', 'DBH*height'
    source          TEXT,                      -- Bibliographic reference
    r2              DECIMAL(4, 3),             -- Model R²
    rmse            DECIMAL(8, 4),
    valid_from      DATE,
    valid_until     DATE
);
```

---

## 14. API Endpoints

### 14.1 Level 1 — Survival Validation

**`POST /api/v1/satellite/level1/survival`**

#### Request Body (Pydantic Schema)

```python
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date

class PolygonGeoJSON(BaseModel):
    type: str = "Feature"
    geometry: dict            # GeoJSON Geometry (Polygon / MultiPolygon)
    properties: dict = {}

class Level1Request(BaseModel):
    plot_id: str              # UUID of the plot in DB
    polygon: PolygonGeoJSON
    start_date: Optional[date] = None  # Sentinel search window
    end_date: Optional[date] = None
    max_cloud_pct: float = Field(default=20.0, ge=0, le=100)
    ndvi_threshold: float = Field(default=0.4, ge=0, le=1)
    survival_threshold: float = Field(default=80.0, ge=0, le=100)

    @model_validator(mode='after')
    def validate_dates(self):
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValueError("start_date must be before end_date")
        return self
```

#### Response Body

```json
{
  "assessment_id": "550e8400-e29b-41d4-a716-446655440001",
  "plot_id": "550e8400-e29b-41d4-a716-446655440000",
  "favorable_assessment": true,
  "summary": {
    "mean_ndvi": 0.612,
    "total_pixels": 1847,
    "active_pixels": 1523,
    "survival_pct": 82.46,
    "survival_threshold": 80.0
  },
  "image_used": {
    "sentinel_id": "20261002T161849_20261002T163200_T14QME",
    "acquisition_date": "2026-10-02",
    "cloud_cover_pct": 3.2
  },
  "metadata": {
    "processing_time_ms": 4821,
    "gee_task_id": "ZJ3KXF9RQWMNPVTY",
    "model": "COPERNICUS/S2_SR_HARMONIZED",
    "resolution_m": 10
  }
}
```

#### Processing Logic (Pseudocode)

```python
# app/services/sentinel_service.py

import ee
import numpy as np
from datetime import date, timedelta

class SentinelService:

    def calculate_survival(
        self,
        polygon_geojson: dict,
        start_date: date,
        end_date: date,
        max_clouds: float,
        ndvi_threshold: float,
    ) -> dict:
        """
        Delegates the NDVI calculation to Google Earth Engine.
        Returns scalar statistics, without downloading rasters.
        """
        ee.Initialize()

        aoi = ee.Geometry(polygon_geojson["geometry"])

        # ── 1. Filter Sentinel-2 SR collection ─────────────────────────
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)
            .filterDate(str(start_date), str(end_date))
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_clouds))
            .sort("CLOUDY_PIXEL_PERCENTAGE")   # Cleanest image first
        )

        if collection.size().getInfo() == 0:
            raise ValueError("No images available for the time window and cloud coverage.")

        image = collection.first()
        image_id   = image.get("system:index").getInfo()
        image_date = image.date().format("YYYY-MM-dd").getInfo()
        clouds_pct = image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()

        # ── 2. Calculate NDVI pixel by pixel ───────────────────────────
        # NDVI = (NIR - Red) / (NIR + Red)
        # Sentinel-2: B8 = NIR (842nm), B4 = Red (665nm)
        ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")

        # ── 3. Count pixels within the AOI ─────────────────────────────
        total_pixels = ndvi.reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        # ── 4. Mask pixels with healthy vegetation (NDVI > threshold) ──
        active_mask = ndvi.gt(ndvi_threshold)

        active_pixels = active_mask.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        # ── 5. Mean NDVI of the full polygon ───────────────────────────
        mean_ndvi = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        return {
            "image_id":      image_id,
            "image_date":    image_date,
            "clouds_pct":    clouds_pct,
            "mean_ndvi":     round(mean_ndvi, 4),
            "total_pixels":  int(total_pixels),
            "active_pixels": int(active_pixels),
        }
```

---

### 14.2 Level 2 — Carbon Mass Estimation

**`POST /api/v1/satellite/level2/carbon`**

#### Processing Flow

```
GeoJSON Polygon
      │
      ├──────────────────────────────────────────────────────┐
      │                                                      │
      ▼                                                      ▼
SentinelService                                     GediService
• S2_SR_HARMONIZED collection                       • LARSE/GEDI/GEDI02_A_002
• NDVI = (B8-B4)/(B8+B4)                           • Filter: quality_flag = 1
• LAI proxy = f(NDVI)                               • Extracts rh100 (max canopy)
                                                    • Extracts rh75 (p75 canopy)
      │                                                      │
      └────────────────────┬─────────────────────────────────┘
                           │
                           ▼
              BiomassCalculator
              ─────────────────
              1. Queries allometric_equation
                 by dominant_species + region

              2. Dry Biomass (t/tree):
                 AGB = a × (rh100 ^ b)
                 [Height Model — Chave et al. 2014]

              3. Scale to area:
                 tree_density = f(LAI, species)
                 total_biomass = AGB × density × area_ha

              4. Carbon and CO₂e:
                 C = total_dry_biomass × 0.5
                 CO₂e = C × 3.67
                           │
                           ▼
              Persistence in level2_assessments
```

#### GEDI Service Code

```python
# app/services/gedi_service.py

import ee
from dataclasses import dataclass

@dataclass
class GediResult:
    shots_count: int
    rh100_mean_m: float
    rh75_mean_m: float
    coverage_pct: float

class GediService:

    COLLECTION = "LARSE/GEDI/GEDI02_A_002"

    def extract_canopy_height(self, polygon_geojson: dict) -> GediResult:
        """
        Extracts forest canopy height metrics using LiDAR data
        from the GEDI mission (NASA / ISS).

        rh100: maximum canopy height (Return Height 100th percentile)
        rh75:  canopy height at the 75th percentile
        """
        ee.Initialize()

        aoi = ee.Geometry(polygon_geojson["geometry"])

        # ── 1. Filter high-quality GEDI shots within AOI ─────────────
        gedi = (
            ee.ImageCollection(self.COLLECTION)
            .filterBounds(aoi)
            .filter(ee.Filter.eq("quality_flag", 1))    # Valid shots only
            .filter(ee.Filter.eq("degrade_flag", 0))    # No degradation
            .select(["rh100", "rh75"])
        )

        # ── 2. Height statistics ──────────────────────────────────────
        # rh100 comes in centimeters → convert to meters (÷ 100)
        stats = gedi.mean().divide(100).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=25,   # GEDI spatial resolution ≈ 25m footprint
            maxPixels=1e9,
        )

        rh100_m = stats.get("rh100").getInfo()
        rh75_m  = stats.get("rh75").getInfo()
        n_shots = gedi.size().getInfo()

        # ── 3. Calculate coverage: % of AOI with GEDI data ───────────
        aoi_area_m2  = aoi.area(maxError=1).getInfo()
        gedi_area_m2 = n_shots * (25 * 25)   # Approx. covered area
        coverage     = min(100.0, (gedi_area_m2 / aoi_area_m2) * 100)

        if rh100_m is None:
            raise ValueError(
                "No valid GEDI shots found in the area of interest. "
                "Consider expanding the temporal range or relaxing quality filters."
            )

        return GediResult(
            shots_count=n_shots,
            rh100_mean_m=round(rh100_m, 3),
            rh75_mean_m=round(rh75_m, 3) if rh75_m else None,
            coverage_pct=round(cobertura, 2),
        )
```

#### Biomass Calculator Code

```python
# app/services/biomass_calculator.py

from dataclasses import dataclass
from decimal import Decimal

# IPCC / FAO physical constants
CARBON_FRACTION = 0.50          # Carbon fraction in dry biomass (IPCC Tier 1)
CO2E_FACTOR     = 3.67          # Stoichiometric ratio C → CO₂ (44/12)

# Pre-configured allometric equations for the region
# General form: AGB (kg/tree) = a × height_m^b
EQUATIONS = {
    "Pinus patula": {
        "id": "PINUS_PATULA_MEXC_2018",
        "a": 0.0509,
        "b": 2.5124,
        "source": "Návar et al. (2018) - Temperate forests of Mexico",
        "r2": 0.96,
    },
    "Quercus spp.": {
        "id": "QUERCUS_SPP_MEXC_2020",
        "a": 0.0612,
        "b": 2.4731,
        "source": "Rodríguez-Flores et al. (2020) - Estado de México",
        "r2": 0.94,
    },
    "default": {
        "id": "TROPICAL_MOIST_CHAVE_2014",
        "a": 0.0673,
        "b": 2.4761,
        "source": "Chave et al. (2014) - Pantropical allometric equations",
        "r2": 0.93,
    },
}

@dataclass
class BiomassResult:
    species: str
    equation_id: str
    stem_volume_m3_ha: float
    dry_biomass_t_ha: float
    total_dry_biomass_t: float
    total_carbon_t: float
    total_co2e_t: float
    uncertainty_pct: float
    confidence_level: str
    warnings: list[str]

class BiomassCalculator:

    def calculate(
        self,
        rh100_m: float,
        area_ha: float,
        mean_ndvi: float,
        species: str = "default",
        tree_density_ha: float | None = None,
    ) -> BiomassResult:
        """
        Estimates above-ground biomass (AGB) and CO₂e using height
        allometry derived from GEDI LiDAR data and Sentinel-2 active
        leaf area.

        Parameters
        ----------
        rh100_m : float
            Maximum canopy height (GEDI RH100) in meters.
        area_ha : float
            Plot area in hectares.
        mean_ndvi : float
            Mean NDVI of the polygon (Sentinel-2).
        species : str
            Dominant species for selecting the allometric equation.
        tree_density_ha : float | None
            Tree density per hectare. If None, estimated via LAI proxy.
        """
        warnings = []

        # ── 1. Allometric equation selection ─────────────────────────
        eq = EQUATIONS.get(species, EQUATIONS["default"])
        if species not in EQUATIONS:
            warnings.append(
                f"Species '{species}' not found in catalog. "
                "Using pantropical equation (Chave et al. 2014). "
                "Uncertainty may be higher."
            )

        # ── 2. AGB per tree (kg) using height equation ────────────────
        # AGB_tree = a × rh100^b
        agb_per_tree_kg = eq["a"] * (rh100_m ** eq["b"])
        agb_per_tree_t  = agb_per_tree_kg / 1000.0

        # ── 3. Tree density estimation if not provided ────────────────
        # Empirical proxy: LAI ≈ -ln(1 - f_cov) / k where k ≈ 0.5 for conifers
        # Empirical density: ~500-1200 trees/ha in Edomex temperate forests
        if tree_density_ha is None:
            tree_density_ha = self._estimate_density_by_ndvi(mean_ndvi, species)
            warnings.append(
                f"Density estimated by NDVI proxy ({tree_density_ha:.0f} trees/ha). "
                "Provide field density for greater accuracy."
            )

        # ── 4. Total dry biomass ──────────────────────────────────────
        total_trees         = tree_density_ha * area_ha
        dry_biomass_t_ha    = agb_per_tree_t * tree_density_ha
        total_dry_biomass_t = dry_biomass_t_ha * area_ha

        # ── 5. Stem volume (proxy) ────────────────────────────────────
        # V ≈ AGB / (wood_density × form_factor)
        # Pinus wood density: ~0.45 t/m³, stem form factor: 0.5
        wood_density   = 0.45  # t/m³ (average for temperate conifers)
        form_factor    = 0.50
        stem_volume_m3_ha = dry_biomass_t_ha / (wood_density * form_factor)

        # ── 6. Carbon and CO₂ equivalent ─────────────────────────────
        carbon_t = total_dry_biomass_t * CARBON_FRACTION
        co2e_t   = carbon_t * CO2E_FACTOR

        # ── 7. Uncertainty and confidence level ───────────────────────
        uncertainty, level = self._calculate_uncertainty(
            eq["r2"], species, warnings
        )

        return BiomassResult(
            species=species,
            equation_id=eq["id"],
            stem_volume_m3_ha=round(stem_volume_m3_ha, 4),
            dry_biomass_t_ha=round(dry_biomass_t_ha, 4),
            total_dry_biomass_t=round(total_dry_biomass_t, 4),
            total_carbon_t=round(carbon_t, 4),
            total_co2e_t=round(co2e_t, 4),
            uncertainty_pct=uncertainty,
            confidence_level=level,
            warnings=warnings,
        )

    def _estimate_density_by_ndvi(self, ndvi: float, species: str) -> float:
        """Empirical proxy: density ranges by NDVI quintile."""
        if ndvi < 0.3:
            return 300.0    # Heavily degraded forest
        elif ndvi < 0.5:
            return 550.0    # Open / young forest
        elif ndvi < 0.7:
            return 800.0    # Mid-density forest
        else:
            return 1100.0   # Dense / closed forest

    def _calculate_uncertainty(
        self, r2: float, species: str, warnings: list
    ) -> tuple[float, str]:
        """Calculates propagated model uncertainty."""
        base_uncertainty = (1 - r2) * 100

        # Penalty if default equation was used
        if species not in EQUATIONS:
            base_uncertainty += 15.0

        # Penalty if density was estimated
        if any("Density estimated" in w for w in warnings):
            base_uncertainty += 10.0

        if base_uncertainty < 15:
            return round(base_uncertainty, 1), "high"
        elif base_uncertainty < 30:
            return round(base_uncertainty, 1), "medium"
        else:
            return round(base_uncertainty, 1), "low"
```

#### Response Body (Level 2)

```json
{
  "assessment_id": "7f3a9100-c4e2-4b1d-b923-889900112233",
  "plot_id": "550e8400-e29b-41d4-a716-446655440000",
  "carbon_summary": {
    "total_co2e_tons": 187.432,
    "total_carbon_tons": 51.068,
    "total_dry_biomass_tons": 102.136,
    "dry_biomass_t_ha": 20.427,
    "stem_volume_m3_ha": 45.394,
    "area_ha": 5.0
  },
  "sentinel_2": {
    "mean_ndvi": 0.648,
    "estimated_lai": 3.21,
    "image_date": "2026-10-02"
  },
  "gedi": {
    "shots_count": 14,
    "rh100_mean_m": 18.45,
    "rh75_mean_m": 14.20,
    "coverage_pct": 68.4
  },
  "allometry": {
    "species": "Pinus patula",
    "equation_id": "PINUS_PATULA_MEXC_2018",
    "tree_density_ha": 800.0,
    "source": "Návar et al. (2018)"
  },
  "quality": {
    "confidence_level": "medium",
    "uncertainty_pct": 20.5,
    "warnings": [
      "Density estimated by NDVI proxy (800 trees/ha). Provide field density for greater accuracy."
    ]
  },
  "metadata": {
    "processing_time_ms": 9834,
    "carbon_fraction": 0.5,
    "co2e_factor": 3.67
  }
}
```

---

## 15. Project Structure (Satellite Module)

```
probosque/
└── backend/
    └── app/
        ├── api/
        │   └── v1/
        │       └── satellite/
        │           ├── __init__.py
        │           ├── router.py           # Registration of L1 and L2 endpoints
        │           ├── level1.py           # POST /survival
        │           └── level2.py           # POST /carbon
        │
        ├── services/
        │   ├── sentinel_service.py         # NDVI map algebra in GEE
        │   ├── gedi_service.py             # RH100 LiDAR extraction
        │   └── biomass_calculator.py       # Allometry + Carbon + CO₂e
        │
        ├── schemas/
        │   └── satellite/
        │       ├── level1_schema.py        # Pydantic I/O Level 1
        │       └── level2_schema.py        # Pydantic I/O Level 2
        │
        └── models/
            ├── level1_assessment.py        # SQLAlchemy + GeoAlchemy2
            └── level2_assessment.py
```

---

## 16. Edge Cases and Risks of the Satellite Pipeline

| Scenario | Impact | Mitigation |
|---|---|---|
| Cloud cover > 80% in the time window | No image available → inconclusive assessment | Automatically expand the search window up to 90 days; if it persists, issue an `inconclusive_assessment` with a field audit alert |
| AOI < 1 ha (small plots) | < 100 Sentinel pixels → statistically weak | Warning in response; reduce `scale` to 5m using Sentinel-2 Super-Resolution (sen2res) |
| No GEDI shots in the polygon | No height data → Level 2 cannot run | Use regional average height by forest type (fallback table) + `confidence_level = 'low'` |
| GEDI coverage < 30% of AOI | Height estimate with high uncertainty | Flag `gedi_coverage_warning` + increase uncertainty by +15% |
| GEE rate limiting (quota exceeded) | FastAPI response timeout | Async Celery task; polling by `task_id`; SLA: result available in < 5 min |
| Unknown or mixed species | Incorrect allometric equation | Use Chave 2014 pantropical equation as fallback + `confidence_level = 'low'` |
| Polygon with invalid geometry | Processing error in GEE | Validation with `shapely.is_valid()` before sending to GEE; repair with `make_valid()` |
| Seasonal change (dry season) | NDVI artificially reduced → false negatives | Normalize against historical NDVI from the same season of the previous year |

---

## 17. Reference Mathematical Formulas

### 17.1 NDVI (Normalized Difference Vegetation Index)

$$NDVI = \frac{NIR - Red}{NIR + Red} = \frac{B8 - B4}{B8 + B4}$$

- **Range:** −1 to +1  
- **Healthy vegetation threshold:** > 0.4  
- **Sentinel-2:** B4 (665 nm, Red), B8 (842 nm, NIR), 10 m resolution

### 17.2 Survival Percentage

$$\% Survival = \frac{\text{pixels with } NDVI > 0.4}{\text{total pixels in AOI}} \times 100$$

$$\text{Favorable assessment} = \begin{cases} \text{True} & \text{if } \% Survival \geq 80\% \\ \text{False} & \text{otherwise} \end{cases}$$

### 17.3 Above-Ground Biomass (Height Allometry)

$$AGB_{tree} \, [kg] = a \times h^{b}$$

where $h$ = RH100 (meters) obtained from GEDI.

$$AGB_{total} \, [t] = \frac{AGB_{tree}}{1000} \times \rho_{density} \times A_{ha}$$

### 17.4 Carbon and CO₂ Equivalent

$$C \, [t] = AGB_{total} \times f_C \quad ; \quad f_C = 0.50$$

$$CO_2e \, [t] = C \times 3.67$$

> The factor **3.67** is the stoichiometric ratio $\frac{M_{CO_2}}{M_C} = \frac{44.01}{12.01} \approx 3.67$

---

*Module designed according to the stipulated Technology Stack: Python + uv · FastAPI · PostgreSQL/PostGIS · Docker · earthengine-api · rasterio · numpy.*
