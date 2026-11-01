# Offline-First Synchronization Protocol

## 1. Principles

1. **Backend as Source of Truth:** Final persisted state and administrative outcomes are owned by the server.
2. **Immutable Observation Streams:** Audits and sampling units are append-only. There are no destructive merge conflicts.
3. **Idempotency:** Client generates a unique UUID (`idempotency_key`) per audit payload. Retrying the sync request returns the existing server reference without duplicating entries.
4. **Deterministic Foreground Retry:** Background Sync is an opportunistic enhancement. When connectivity returns or the app resumes, the PWA executes foreground synchronization with exponential backoff and jitter.

---

## 2. Synchronization Sequence

```text
Field Technician (Offline PWA)
 ├── Records audit & sampling units in IndexedDB (status: PENDING)
 ├── Captures photos stored as local Blobs
 └── Connectivity detected / User triggers Sync

Step 1: Challenge Request (Tamper Resistance)
  PWA ─── POST /api/v1/sync/challenges { device_installation_id } ───► Backend
  Backend ─── Returns { challenge_id, nonce, expires_at } ────────────► PWA

Step 2: Audit Payload Submission
  PWA ─── POST /api/v1/sync/audits ───────────────────────────────────► Backend
          Payload:
          {
            id: UUID,
            plot_id: UUID,
            device_installation_id: UUID,
            sampling_units: [...],
            start_coordinates, end_coordinates,
            idempotency_key: string,
            challenge_id: UUID,
            signature: string (optional)
          }

  Backend Validation:
  ├── Check idempotency key (if existing, return 200 OK with server_reference)
  ├── Validate schema and polygon geofence
  ├── Store immutable audit and sampling units
  ├── Compute Ratio Estimator survival & Student-t CI in audit_results
  └── Return 201 Created

Step 3: Evidence File Uploads
  For each pending photo:
  PWA ─── POST /api/v1/sync/evidence ────────────────────────────────► Backend
          Multipart: file blob + capture_metadata (lat, lon, accuracy, client_timestamp, hash)
  Backend:
  ├── Calculate SHA-256 server-side
  ├── Verify integrity against client hash
  ├── Persist in MinIO/S3
  └── Create immutable evidence_photos record

Step 4: Completion Mark
  PWA marks local audit & evidence records as SYNCED.
```
