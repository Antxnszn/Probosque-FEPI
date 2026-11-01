import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class EvidenceCreateMetadata(BaseModel):
    audit_id: uuid.UUID
    sampling_unit_id: Optional[uuid.UUID] = None
    evidence_type: Literal["PLOT_OVERVIEW", "SAMPLING_UNIT", "DETAIL", "OTHER"] = "SAMPLING_UNIT"
    capture_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    capture_lon: Optional[float] = Field(default=None, ge=-180, le=180)
    capture_accuracy_m: Optional[float] = Field(default=None, ge=0)
    captured_at_client: Optional[datetime] = None
    client_hash_sha256: str
    capture_context_hash: Optional[str] = None
    capture_signature: Optional[str] = None
    challenge_id: Optional[uuid.UUID] = None


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    audit_id: uuid.UUID
    sampling_unit_id: Optional[uuid.UUID] = None
    object_key: str
    mime_type: str
    file_size_bytes: int
    hash_sha256: str
    capture_lat: Optional[float]
    capture_lon: Optional[float]
    capture_accuracy_m: Optional[float]
    captured_at_client: Optional[datetime]
    evidence_type: str
    metadata_valid: Optional[bool]
    created_at: datetime
