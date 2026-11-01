import uuid
from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import from_shape
from shapely.geometry import shape, MultiPolygon, Polygon

from app.database import get_db
from app.models.plot import Plot
from app.models.carbon import CarbonAssessment
from app.schemas.plot import PlotCreate, PlotResponse
from app.schemas.carbon import (
    CarbonAssessmentCreate,
    CarbonAssessmentResponse,
    CarbonEstimateRequest,
)
from app.services.carbon_service import CarbonService
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

    # Calculate accurate geodesic area using pyproj (WGS84)
    from pyproj import Geod
    geod = Geod(ellps="WGS84")
    area_sq_m, perimeter = geod.geometry_area_perimeter(geom_shape)
    area_ha = round(abs(area_sq_m) / 10000.0, 4)

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


@router.post("/upload/kmz", response_model=PlotResponse, status_code=status.HTTP_201_CREATED)
async def create_plot_from_kmz(
    cadastral_key: str = Form(...),
    beneficiary_id: uuid.UUID = Form(...),
    planting_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a plot by extracting the geometry from an uploaded KMZ file.
    """
    if not file.filename.lower().endswith('.kmz'):
        raise HTTPException(status_code=400, detail="File must be a KMZ (.kmz)")

    file_bytes = await file.read()
    
    import zipfile
    import io
    import xml.etree.ElementTree as ET
    from shapely.geometry import Polygon
    
    try:
        # 1. Extract KML from KMZ
        with zipfile.ZipFile(io.BytesIO(file_bytes), 'r') as kmz:
            kml_filename = next((name for name in kmz.namelist() if name.endswith('.kml')), None)
            if not kml_filename:
                raise ValueError("No .kml file found inside the KMZ archive.")
            kml_bytes = kmz.read(kml_filename)
            
        # 2. Parse KML XML to find coordinates
        root = ET.fromstring(kml_bytes)
        polygons = []
        for elem in root.iter():
            if elem.tag.endswith('coordinates') and elem.text:
                points_str = elem.text.strip().split()
                points = []
                for pt_str in points_str:
                    parts = pt_str.split(',')
                    if len(parts) >= 2:
                        points.append((float(parts[0]), float(parts[1])))
                
                if len(points) >= 3:
                    if points[0] != points[-1]:
                        points.append(points[0])  # Close the linear ring
                    polygons.append(Polygon(points))
                    
        if not polygons:
            raise ValueError("Could not parse any valid Polygons from the KMZ coordinates.")
            
        geom_shape = MultiPolygon(polygons)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid KMZ file: {str(e)}")

    # Calculate accurate geodesic area using pyproj (WGS84)
    from pyproj import Geod
    geod = Geod(ellps="WGS84")
    area_sq_m, perimeter = geod.geometry_area_perimeter(geom_shape)
    area_ha = round(abs(area_sq_m) / 10000.0, 4)

    postgis_geom = from_shape(geom_shape, srid=4326)

    # Convert planting_date string to date object if present
    from datetime import datetime
    p_date = datetime.strptime(planting_date, "%Y-%m-%d").date() if planting_date else None

    plot = Plot(
        id=uuid.uuid4(),
        cadastral_key=cadastral_key,
        beneficiary_id=beneficiary_id,
        planting_date=p_date,
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


@router.post(
    "/{plot_id}/carbon-assessments",
    response_model=CarbonAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plot_carbon_assessment(
    plot_id: uuid.UUID,
    assessment_in: CarbonAssessmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Creates and persists an authoritative carbon assessment linked to an existing plot.
    """
    q = select(Plot).where(Plot.id == plot_id)
    res = await db.execute(q)
    plot = res.scalar_one_or_none()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")

    est_req = CarbonEstimateRequest(
        species_id=assessment_in.species_id,
        area_ha=float(plot.area_ha),
        tree_density_ha=assessment_in.tree_density_ha,
        total_trees_count=assessment_in.total_trees_count,
        mean_dbh_cm=assessment_in.mean_dbh_cm,
        mean_height_m=assessment_in.mean_height_m,
        inventory_plots_count=assessment_in.inventory_plots_count,
    )

    est = CarbonService.estimate_carbon(est_req)

    assessment = CarbonAssessment(
        id=uuid.uuid4(),
        plot_id=plot_id,
        methodology_version=est.methodology_version,
        method=assessment_in.method,
        area_ha=est.area_ha,
        allometric_equation_id=est.allometric_equation_code,
        field_tree_density_ha=assessment_in.tree_density_ha,
        dry_biomass_t_ha=est.biomass_t_ha,
        total_dry_biomass_t=est.total_dry_biomass_t,
        carbon_fraction=est.carbon_fraction,
        total_carbon_t=est.total_carbon_t,
        co2e_factor=est.co2e_factor,
        total_co2e_t=est.total_co2e_t,
        uncertainty_low_t=est.confidence_interval_low_t,
        uncertainty_high_t=est.confidence_interval_high_t,
        confidence_level=est.confidence_level,
        warnings=est.warnings,
        source_metadata={"species": est.species_scientific_name, "citation": est.source_citation},
    )

    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get(
    "/{plot_id}/carbon-assessments",
    response_model=List[CarbonAssessmentResponse],
)
async def list_plot_carbon_assessments(
    plot_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Lists all historical carbon assessments recorded for a given plot."""
    q = select(CarbonAssessment).where(CarbonAssessment.plot_id == plot_id).order_by(CarbonAssessment.created_at.desc())
    res = await db.execute(q)
    return list(res.scalars().all())

