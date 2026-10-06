import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, ConfigDict


class SubsidyDecisionCreate(BaseModel):
    plot_id: uuid.UUID
    audit_id: uuid.UUID
    program_id: str = "PROBOSQUE_REFORESTATION_2026"
    rules_version: str = "RULES-1.0"
    override_decision: Optional[Literal["APPROVED", "REJECTED", "MANUAL_REVIEW"]] = None
    override_reason: Optional[str] = None


class SubsidyDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    plot_id: uuid.UUID
    audit_id: uuid.UUID
    audit_result_id: uuid.UUID
    program_id: str
    rules_version: str
    decision: str
    decision_basis: Dict[str, Any]
    reason_codes: List[str]
    decided_by: Optional[uuid.UUID]
    decided_at: datetime
