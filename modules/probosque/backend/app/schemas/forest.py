from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LegendClass(BaseModel):
    code: int
    name_es: str
    name_en: str
    hex_color: str
    is_forest: bool
    is_native_forest: bool
    is_forest_approved: bool
    description: Optional[str] = None


class DataSourceInfo(BaseModel):
    key: str
    provider: str
    product: str
    collection_version: str
    asset_id: str
    first_year: int
    last_year: int
    mvp_first_year: int
    mvp_last_year: int
    resolution_m: float
    license: str
    citation: str
    methodology_url: Optional[str] = None


class ForestMetadataResponse(BaseModel):
    application: str = "Probosque Visor Forestal Multitemporal"
    state_code: str = "15"
    state_name: str = "Estado de México"
    municipalities_count: int = 125
    years_available: List[int]
    sources: Dict[str, DataSourceInfo]
    legend_classes: List[LegendClass]
    forest_grouping_version: str
    methodology_version: str = "PROBOSQUE-VF-1.0"


class RegionSummary(BaseModel):
    inegi_code: str
    cve_mun: str
    name: str
    area_ha: float
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    center: List[float] = Field(..., description="[lat, lon]")


class RegionDetail(RegionSummary):
    type: str = "municipality"
    parent_code: str = "15"
    geometry: Optional[Dict[str, Any]] = None


class AnnualClassStat(BaseModel):
    code: int
    name_es: str
    hex_color: str
    area_ha: Optional[float] = None
    is_forest_approved: bool


class AnnualStatsSeries(BaseModel):
    year: int
    total_forest_approved_ha: Optional[float] = None
    classes: List[AnnualClassStat]


class AnnualStatsResponse(BaseModel):
    region_id: str
    region_name: str
    indicator: str = "land_cover_area_by_class"
    unit: str = "ha"
    source: Dict[str, Any]
    series: List[AnnualStatsSeries]
    data_status: str  # "ready" | "pending_ingest" | "unavailable"


class LossStatsYear(BaseModel):
    year: int
    gross_tree_cover_loss_ha: Optional[float] = None


class LossStatsResponse(BaseModel):
    region_id: str
    region_name: str
    indicator: str = "gross_tree_cover_loss"
    unit: str = "ha"
    source: Dict[str, Any]
    canopy_threshold_pct: int = 30
    scientific_disclaimer: str = (
        "La pérdida bruta de cobertura arbórea (Hansen) mide perturbaciones del dosel arbóreo "
        "y NO equivale automáticamente a deforestación permanente ni cambio de uso de suelo."
    )
    series: List[LossStatsYear]
    data_status: str


class TransitionCell(BaseModel):
    class_from: int
    class_to: int
    name_from: str
    name_to: str
    area_ha: Optional[float] = None


class TransitionStatsResponse(BaseModel):
    region_id: str
    region_name: str
    year_from: int
    year_to: int
    source: Dict[str, Any]
    transitions: List[TransitionCell]
    data_status: str


class LayerSpec(BaseModel):
    id: str
    indicator: str
    name: str
    year: int
    pair_year: Optional[int] = None
    tile_strategy: str
    tile_url_template: Optional[str] = None
    status: str
    legend: List[Dict[str, Any]]
