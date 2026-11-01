import uuid
from datetime import date, datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class PlotBase(BaseModel):
    cadastral_key: str
    beneficiary_id: uuid.UUID
    planting_date: Optional[date] = None


class PlotCreate(PlotBase):
    geojson_geometry: Dict[str, Any]  # GeoJSON Polygon/MultiPolygon


class PlotResponse(PlotBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    area_ha: Optional[float] = None
    triage_status: str
    audit_status: str
    subsidy_status: str
    created_at: datetime
    updated_at: datetime
