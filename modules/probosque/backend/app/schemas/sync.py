import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class ChallengeRequest(BaseModel):
    device_installation_id: uuid.UUID


class ChallengeResponse(BaseModel):
    challenge_id: uuid.UUID
    nonce: str
    expires_at: datetime


class SyncLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_installation_id: uuid.UUID
    idempotency_key: str
    status: str
    received_at: datetime
    processed_at: Optional[datetime]
    conflict_detail: Optional[Dict[str, Any]]
    server_reference: Optional[uuid.UUID]
