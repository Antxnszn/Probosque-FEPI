from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class TriageAssessmentResult:
    status: str  # NORMAL | ANOMALY | INCONCLUSIVE
    ndvi_delta: float
    reason_codes: List[str]
    metrics: Dict[str, Any]
    methodology_version: str = "TRIAGE-1.0"


def evaluate_satellite_triage(
    baseline_ndvi: float,
    current_ndvi: float,
    valid_pixel_fraction: float,
    observation_count: int,
    cloud_fraction: float = 0.0,
    shadow_fraction: float = 0.0,
    min_valid_pixel_fraction: float = 0.70,
    min_observations: int = 3,
    anomaly_ndvi_delta_threshold: float = -0.15,
) -> TriageAssessmentResult:
    """
    Evaluates Sentinel-2 vegetation dynamics and quality gates.
    Produces NORMAL, ANOMALY, or INCONCLUSIVE with explainable reason codes.
    Does NOT certify survival or reject subsidies directly.
    """
    ndvi_delta = round(current_ndvi - baseline_ndvi, 4)
    reason_codes: List[str] = []

    metrics = {
        "baseline_ndvi": round(baseline_ndvi, 4),
        "current_ndvi": round(current_ndvi, 4),
        "ndvi_delta": ndvi_delta,
        "valid_pixel_fraction": round(valid_pixel_fraction, 4),
        "observation_count": observation_count,
        "cloud_fraction": round(cloud_fraction, 4),
        "shadow_fraction": round(shadow_fraction, 4),
    }

    # 1. Quality Gates (Section 6.5 & 15.2)
    if valid_pixel_fraction < min_valid_pixel_fraction:
        reason_codes.append("INSUFFICIENT_VALID_PIXELS")
    if observation_count < min_observations:
        reason_codes.append("INSUFFICIENT_OBSERVATION_COUNT")

    if reason_codes:
        return TriageAssessmentResult(
            status="INCONCLUSIVE",
            ndvi_delta=ndvi_delta,
            reason_codes=reason_codes,
            metrics=metrics,
        )

    # 2. Vegetation Signal / Temporal Delta Evaluation
    if ndvi_delta <= anomaly_ndvi_delta_threshold:
        reason_codes.append("PERSISTENT_NDVI_DECLINE")
        return TriageAssessmentResult(
            status="ANOMALY",
            ndvi_delta=ndvi_delta,
            reason_codes=reason_codes,
            metrics=metrics,
        )

    return TriageAssessmentResult(
        status="NORMAL",
        ndvi_delta=ndvi_delta,
        reason_codes=[],
        metrics=metrics,
    )
