import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class SamplingUnitCreate(BaseModel):
    sequence_no: int
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_m: float = Field(default=12.616, gt=0)
    area_m2: float = Field(default=500.0, gt=0)
    sampled_planting_sites: Optional[int] = Field(default=None, ge=0)
    alive_trees: int = Field(..., ge=0)
    dead_trees: int = Field(..., ge=0)
    unknown_sites: int = Field(default=0, ge=0)
    gps_accuracy_m: Optional[float] = Field(default=None, ge=0)
    captured_at: datetime


class SamplingUnitResponse(SamplingUnitCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    audit_id: uuid.UUID


class AuditResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    audit_id: uuid.UUID
    methodology_version: str
    denominator_definition: str
    estimator_method: str
    sampling_units_count: int
    alive_total: int
    denominator_total: int
    estimated_survival_pct: float
    ci_low_pct: Optional[float] = None
    ci_high_pct: Optional[float] = None
    ci_method: Optional[str] = None
    confidence_level_pct: Optional[float] = None
    computed_at: datetime
    calculator_version: str


class AuditCreate(BaseModel):
    id: Optional[uuid.UUID] = None
    plot_id: uuid.UUID
    technician_id: uuid.UUID
    device_installation_id: uuid.UUID
    methodology_version: str = "SAMPLING-1.0"
    survey_started_at: datetime
    survey_completed_at: Optional[datetime] = None
    start_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    start_lon: Optional[float] = Field(default=None, ge=-180, le=180)
    start_accuracy_m: Optional[float] = Field(default=None, ge=0)
    end_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    end_lon: Optional[float] = Field(default=None, ge=-180, le=180)
    end_accuracy_m: Optional[float] = Field(default=None, ge=0)
    client_created_at: datetime
    sampling_units: List[SamplingUnitCreate] = []
    idempotency_key: str
    challenge_id: Optional[uuid.UUID] = None
    signature: Optional[str] = None


class AuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    plot_id: uuid.UUID
    technician_id: uuid.UUID
    survey_started_at: datetime
    survey_completed_at: Optional[datetime]
    methodology_version: str
    geofence_valid: bool
    geofence_method: Optional[str]
    created_at: datetime
    result: Optional[AuditResultResponse] = None
    sampling_units: List[SamplingUnitResponse] = []
