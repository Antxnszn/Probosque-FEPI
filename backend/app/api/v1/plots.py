import uuid
from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import shape, MultiPolygon, Polygon

from app.database import get_db
from app.models.plot import Plot
from app.schemas.plot import PlotCreate, PlotResponse
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/plots", tags=["Plots"])


@router.get("", response_model=List[PlotResponse])
async def list_plots(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    audit_status: Optional[str] = Query(None),
    triage_status: Optional[str] = Query(None),
    subsidy_status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = select(Plot)
    if audit_status:
        query = query.where(Plot.audit_status == audit_status)
    if triage_status:
        query = query.where(Plot.triage_status == triage_status)
    if subsidy_status:
        query = query.where(Plot.subsidy_status == subsidy_status)

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    plots = list(res.scalars().all())
    return plots


@router.get("/{plot_id}", response_model=PlotResponse)
async def get_plot(
    plot_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    q = select(Plot).where(Plot.id == plot_id)
    res = await db.execute(q)
    plot = res.scalar_one_or_none()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    return plot


@router.post("", response_model=PlotResponse, status_code=status.HTTP_201_CREATED)
async def create_plot(
    plot_in: PlotCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Validate GeoJSON and ensure MultiPolygon
    geom_shape = shape(plot_in.geojson_geometry)
    if isinstance(geom_shape, Polygon):
        geom_shape = MultiPolygon([geom_shape])
    elif not isinstance(geom_shape, MultiPolygon):
        raise HTTPException(status_code=400, detail="Geometry must be a Polygon or MultiPolygon")

    # Calculate area in ha using EPSG:3857 planar approximation or geodesic
    # 1 deg lat ~ 111,000m, 1 deg lon ~ 111,000m * cos(lat)
    centroid_lat = geom_shape.centroid.y
    import math
    cos_lat = math.cos(math.radians(centroid_lat))
    area_sq_m = geom_shape.area * (111320.0 * 111320.0 * cos_lat)
    area_ha = round(area_sq_m / 10000.0, 4)

    postgis_geom = from_shape(geom_shape, srid=4326)

    plot = Plot(
        id=uuid.uuid4(),
        cadastral_key=plot_in.cadastral_key,
        beneficiary_id=plot_in.beneficiary_id,
        planting_date=plot_in.planting_date,
        geom=postgis_geom,
        area_ha=area_ha,
        triage_status="PENDING",
        audit_status="NOT_STARTED",
        subsidy_status="PENDING",
    )
    db.add(plot)
    await db.commit()
    await db.refresh(plot)
    return plot
