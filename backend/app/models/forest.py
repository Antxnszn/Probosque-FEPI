import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class GeoRegion(Base):
    __tablename__ = "geo_regions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inegi_code = Column(String(10), unique=True, nullable=False, index=True)
    cve_mun = Column(String(10), nullable=False)
    name = Column(String(150), nullable=False, index=True)
    type = Column(String(20), nullable=False, default="municipality")  # state | municipality
    parent_code = Column(String(10), nullable=True)
    boundary_version = Column(String(50), nullable=False, default="INEGI-MG-2023")
    area_ha_official = Column(Numeric(14, 4), nullable=False)
    bbox = Column(JSONB, nullable=False)  # [minx, miny, maxx, maxy]
    center = Column(JSONB, nullable=False)  # [lat, lon]
    geom_geojson = Column(JSONB, nullable=True)  # GeoJSON geometry payload
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    year_stats = relationship("RegionYearStat", back_populates="region")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(50), unique=True, nullable=False, index=True)
    provider = Column(String(255), nullable=False)
    product = Column(String(255), nullable=False)
    collection_version = Column(String(50), nullable=False)
    asset_id = Column(String(255), nullable=False)
    first_year = Column(Integer, nullable=False)
    last_year = Column(Integer, nullable=False)
    resolution_m = Column(Numeric(8, 2), nullable=False, default=30.0)
    license = Column(String(50), nullable=False, default="CC BY 4.0")
    citation = Column(Text, nullable=False)
    methodology_url = Column(Text, nullable=True)
    ingest_status = Column(String(50), nullable=False, default="pending_ingest")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    legend_classes = relationship("LandCoverClass", back_populates="source", cascade="all, delete-orphan")
    raster_products = relationship("RasterProduct", back_populates="source", cascade="all, delete-orphan")
    year_stats = relationship("RegionYearStat", back_populates="source", cascade="all, delete-orphan")


class LandCoverClass(Base):
    __tablename__ = "land_cover_classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False, index=True)
    class_code = Column(Integer, nullable=False)
    name_es = Column(String(150), nullable=False)
    name_en = Column(String(150), nullable=False)
    hex_color = Column(String(10), nullable=False)
    level = Column(Integer, nullable=False, default=2)
    parent_class_code = Column(Integer, nullable=True)
    forest_grouping_version = Column(String(50), nullable=False, default="probosque-v1.0")
    is_forest = Column(Boolean, nullable=False, default=False)
    is_native_forest = Column(Boolean, nullable=False, default=False)
    is_forest_approved = Column(Boolean, nullable=False, default=False)
    description = Column(Text, nullable=True)

    source = relationship("DataSource", back_populates="legend_classes")

    __table_args__ = (
        UniqueConstraint("source_id", "class_code", "forest_grouping_version", name="uq_source_class_version"),
        Index("idx_class_code", "class_code"),
    )


class RasterProduct(Base):
    __tablename__ = "raster_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False, index=True)
    indicator = Column(String(50), nullable=False)  # land_cover | tree_cover_loss
    year = Column(Integer, nullable=False)
    pair_year = Column(Integer, nullable=True)
    region_scope = Column(String(50), nullable=False, default="15")
    processing_version = Column(String(50), nullable=False, default="v1.0")
    tile_strategy = Column(String(50), nullable=False, default="xyz")  # xyz | gee | pmtiles | cog
    tile_url_template = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pending_ingest")  # ready | pending_ingest | failed | unavailable
    valid_pixel_fraction = Column(Numeric(6, 4), nullable=True)
    produced_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    extra_metadata = Column(JSONB, nullable=True)

    source = relationship("DataSource", back_populates="raster_products")

    __table_args__ = (
        UniqueConstraint(
            "source_id", "indicator", "year", "pair_year", "region_scope", "processing_version",
            name="uq_raster_product_unique"
        ),
        Index("idx_raster_indicator_year", "indicator", "year", "region_scope"),
    )


class RegionYearStat(Base):
    __tablename__ = "region_year_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id = Column(String(10), ForeignKey("geo_regions.inegi_code"), nullable=False, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    class_code = Column(Integer, nullable=False)
    area_ha = Column(Numeric(14, 4), nullable=False)
    valid_area_ha = Column(Numeric(14, 4), nullable=False)
    nodata_area_ha = Column(Numeric(14, 4), nullable=False, default=0.0)
    classified_area_ha = Column(Numeric(14, 4), nullable=False)
    boundary_version = Column(String(50), nullable=False, default="INEGI-MG-2023")
    collection_version = Column(String(50), nullable=False, default="1.0")
    processing_version = Column(String(50), nullable=False, default="v1.0")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    region = relationship("GeoRegion", back_populates="year_stats")
    source = relationship("DataSource", back_populates="year_stats")

    __table_args__ = (
        UniqueConstraint(
            "region_id", "source_id", "year", "class_code", "processing_version",
            name="uq_region_year_class_version"
        ),
        Index("idx_region_year", "region_id", "year"),
    )


class ProcessingRun(Base):
    __tablename__ = "processing_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name = Column(String(100), nullable=False, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=True)
    region_id = Column(String(10), nullable=True)
    parameters = Column(JSONB, nullable=False, default=dict)
    status = Column(String(50), nullable=False, default="RUNNING")  # RUNNING | COMPLETED | FAILED | BLOCKED
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    output_version = Column(String(50), nullable=False)
    counts = Column(JSONB, nullable=True)
    error_detail = Column(Text, nullable=True)
    source_asset_hash = Column(String(100), nullable=True)
