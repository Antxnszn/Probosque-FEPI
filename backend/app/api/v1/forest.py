from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.forest import (
    ForestMetadataResponse,
    RegionSummary,
    RegionDetail,
    AnnualStatsResponse,
    LossStatsResponse,
    TransitionStatsResponse,
    LayerSpec,
)
from app.services.forest_service import forest_service

router = APIRouter(prefix="/forest", tags=["Forest Viewer"])


@router.get("/metadata", response_model=ForestMetadataResponse)
async def get_forest_metadata():
    """
    Returns platform metadata: available years, sources, legend classes, and grouping versions.
    """
    return forest_service.get_metadata()


@router.get("/regions", response_model=List[RegionSummary])
async def list_regions(type: Optional[str] = Query("municipality")):
    """
    Lists official regions (125 municipalities or state) with INEGI codes, names, areas, and bboxes.
    """
    return forest_service.get_municipalities()


@router.get("/regions/{region_id}", response_model=RegionDetail)
async def get_region_detail(region_id: str):
    """
    Gets detailed information for a region, including bounds, center, and geometry.
    """
    detail = forest_service.get_region_detail(region_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Region '{region_id}' not found in official Marco Geoestadístico.",
        )
    return detail


@router.get("/geojson/state")
async def get_state_geojson(simplified: bool = Query(True)):
    """
    Returns official GeoJSON geometry of Estado de México perimeter.
    """
    return forest_service.get_state_geojson(simplified=simplified)


@router.get("/geojson/municipalities")
async def get_municipalities_geojson(simplified: bool = Query(True)):
    """
    Returns official GeoJSON FeatureCollection of all 125 municipalities.
    """
    return forest_service.get_municipalities_geojson(simplified=simplified)


@router.get("/layers", response_model=List[LayerSpec])
async def get_layers(
    indicator: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
):
    """
    Returns available raster/vector map layers and their tile strategy.
    """
    return forest_service.get_layers(indicator=indicator, year=year)


@router.get("/stats/annual", response_model=AnnualStatsResponse)
async def get_annual_stats(
    region_id: str = Query(..., description="INEGI code of municipality (e.g. '15110' for Valle de Bravo) or '15' for State"),
    from_year: int = Query(2010, alias="from", ge=1985, le=2025),
    to_year: int = Query(2025, alias="to", ge=1985, le=2025),
):
    """
    Returns annual land cover surface per class for the selected region.
    """
    if from_year > to_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_year must be less than or equal to to_year.",
        )
    return forest_service.get_annual_stats(region_id, from_year, to_year)


@router.get("/stats/loss", response_model=LossStatsResponse)
async def get_loss_stats(
    region_id: str = Query(..., description="INEGI code of municipality or state"),
    from_year: int = Query(2010, alias="from", ge=2000, le=2025),
    to_year: int = Query(2025, alias="to", ge=2000, le=2025),
):
    """
    Returns gross tree cover loss series (Hansen GFC v1.13) with scientific disclaimer.
    """
    if from_year > to_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_year must be less than or equal to to_year.",
        )
    return forest_service.get_loss_stats(region_id, from_year, to_year)


@router.get("/stats/transitions", response_model=TransitionStatsResponse)
async def get_transition_stats(
    region_id: str = Query(..., description="INEGI code of municipality or state"),
    from_year: int = Query(2010, alias="from", ge=1985, le=2025),
    to_year: int = Query(2025, alias="to", ge=1985, le=2025),
):
    """
    Returns land cover transition matrix between two selected years.
    """
    if from_year >= to_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_year must be strictly less than to_year for transition analysis.",
        )
    return forest_service.get_transition_stats(region_id, from_year, to_year)
