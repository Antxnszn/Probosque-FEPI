# Probosque Forest Audit & Subsidy System — Architecture Overview

## 1. Architectural Model & Core Tenets

The Probosque system modernizes the complete field audit and forest subsidy allocation workflow through a decoupled, three-tier architecture:

1. **Satellite Triage Layer (Sentinel-2 / GEE):** Identifies spatial and temporal anomalies in vegetation dynamics. Contextualizes and prioritizes field audits; it **does not** automatically reject or approve subsidies, nor does it measure survival directly.
2. **Field Audit PWA (Offline-First Edge):** Built as an installable Progressive Web App with Dexie/IndexedDB persistence, geofenced circular sampling units ($500\,\text{m}^2$), tamper-evident evidence capture, and deterministic foreground synchronization.
3. **Backend & Decision Engine (FastAPI + PostGIS + Celery + MinIO):** Central system of record. Computes server-authoritative statistical estimates (Ratio Estimator with Student-$t$ confidence intervals) over immutable raw sampling units, enforces append-only immutability, and executes versioned subsidy decision rules.
4. **Carbon Assessment Engine (GEDI + Local Allometry):** Evaluates aboveground biomass density (AGBD) and carbon stocks independently. Decoupled from the subsidy eligibility engine.

---

## 2. Separation of Concerns & State Machines

The workflow decouples four independent lifecycle states per plot:

| State Field | Allowed Values | Responsibility |
|---|---|---|
| `triage_status` | `PENDING`, `NORMAL`, `ANOMALY`, `INCONCLUSIVE`, `ERROR` | Satellite spectral change and cloud quality gate. |
| `audit_status` | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `UNDER_REVIEW`, `INVALID` | Field sampling completion and integrity validation. |
| `subsidy_status` | `PENDING`, `ELIGIBLE`, `NOT_ELIGIBLE`, `APPROVED`, `REJECTED`, `MANUAL_REVIEW` | Administrative rules engine evaluation. |
| `sync_status` (local) | `PENDING`, `UPLOADING`, `SYNCED`, `ERROR` | Local IndexedDB queue state on technician device. |

---

## 3. Immutability & Anti-Fraud Model

- **Append-only Tables:** Completed `audits`, `audit_sampling_units`, `evidence_photos`, `audit_results`, `satellite_triage_assessments`, `carbon_assessments`, and `subsidy_decisions` cannot be mutated or deleted. Corrections are handled via revision records (`revision_of` pointers).
- **Client Metadata:** Photographic evidence records GPS coordinates, horizontal accuracy, and timestamps directly at capture time via the browser API. EXIF data is supplementary.
- **Integrity Validation:** SHA-256 hashes are recalculated server-side upon evidence reception. Nonce/challenges are verified for tamper resistance.
