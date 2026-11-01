# Versioned Subsidy Decision Engine Specification

## 1. Overview & Policy Boundary

The Subsidy Decision Engine evaluates whether a forest reforestation plot qualifies for payment allocation (e.g. $2,000 MXN/ha). 

Key architectural invariant:
- **Decoupled Evaluation:** The decision engine does not query satellite data or re-evaluate Sentinel-2 rasters directly. It evaluates a certified, server-computed `AuditResult` derived from immutable field sampling units.
- **Explainable Basis:** The `decision_basis` is preserved verbatim as an immutable snapshot in `subsidy_decisions`.

---

## 2. Decision Rules Matrix

| Criteria | Target | Rule Action if Failed |
|---|---|---|
| **Survival Threshold** | $\ge 80.0\%$ | `REJECTED` if definitive; `MANUAL_REVIEW` if confidence interval spans threshold. |
| **Statistical Policy** | `POINT_ESTIMATE` or `CONSERVATIVE_CI_LOWER` | Configured per program version (`rules_version`). |
| **Geofence Plausibility** | `VALID` (technician was strictly within polygon) | `MANUAL_REVIEW` if status is `WARNING` or `INVALID`. |
| **Evidence Completeness** | $\ge 1$ plot overview photo + photos for sampling units | `MANUAL_REVIEW` until evidence exception is logged. |
| **Minimum Sampling Units** | $\ge 2$ circular units ($500\,\text{m}^2$ each) | `MANUAL_REVIEW` (insufficient sample size for variance calculation). |

---

## 3. Immutability & Revisions

- `subsidy_decisions` are append-only.
- If an administrator overrides or amends a decision, a new `SubsidyDecision` is recorded linking to `decided_by` with explicit `override_reason`.
