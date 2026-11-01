import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class CarbonEstimateRequest(BaseModel):
    species_id: str = "pinus_hartwegii"
    geometry: Optional[Dict[str, Any]] = None
    area_ha: Optional[float] = None
    establishment_year: Optional[int] = None
    tree_density_ha: Optional[float] = 1100.0
    total_trees_count: Optional[int] = None
    mean_dbh_cm: float = Field(..., ge=1.0, le=200.0)
    mean_height_m: Optional[float] = Field(None, ge=0.5, le=80.0)
    inventory_plots_count: Optional[int] = 4


class CarbonEstimateResponse(BaseModel):
    area_ha: float
    species_id: str
    species_scientific_name: str
    total_trees_estimated: int
    biomass_kg_per_tree: float
    total_dry_biomass_t: float
    biomass_t_ha: float
    carbon_fraction: float
    total_carbon_t: float
    carbon_t_ha: float
    co2e_factor: float
    total_co2e_t: float
    co2e_t_ha: float
    uncertainty_percent: float
    confidence_interval_low_t: float
    confidence_interval_high_t: float
    confidence_level: str
    data_quality_level: str
    allometric_equation_code: str
    methodology_version: str
    source_citation: str
    warnings: List[str]
    disclaimer: str


class CarbonAssessmentCreate(BaseModel):
    method: str = "FIELD_ALLOMETRY"
    species_id: str
    tree_density_ha: Optional[float] = None
    total_trees_count: Optional[int] = None
    mean_dbh_cm: float = Field(..., ge=1.0, le=200.0)
    mean_height_m: Optional[float] = None
    inventory_plots_count: Optional[int] = 4


class CarbonAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    plot_id: uuid.UUID
    methodology_version: str
    method: str
    area_ha: float
    allometric_equation_id: Optional[str] = None
    field_tree_density_ha: Optional[float] = None
    total_dry_biomass_t: Optional[float] = None
    dry_biomass_t_ha: Optional[float] = None
    carbon_fraction: Optional[float] = None
    total_carbon_t: Optional[float] = None
    total_co2e_t: Optional[float] = None
    uncertainty_low_t: Optional[float] = None
    uncertainty_high_t: Optional[float] = None
    confidence_level: Optional[str] = None
    warnings: List[str] = []
    created_at: datetime
