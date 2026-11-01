import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, Numeric, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class AllometricEquation(Base):
    __tablename__ = "allometric_equations"

    id = Column(String(80), primary_key=True)
    species_scope = Column(String(150), nullable=False)
    region_scope = Column(String(150), nullable=True)
    variable_definition = Column(String(100), nullable=False)
    equation_expression = Column(Text, nullable=False)
    units = Column(String(100), nullable=False)
    source_citation = Column(Text, nullable=False)
    source_version = Column(String(80), nullable=True)
    r2 = Column(Numeric(6, 4), nullable=True)
    rmse = Column(Numeric(12, 6), nullable=True)
    applicable_min_height_m = Column(Numeric(9, 3), nullable=True)
    applicable_max_height_m = Column(Numeric(9, 3), nullable=True)
    applicable_min_dbh_cm = Column(Numeric(9, 3), nullable=True)
    applicable_max_dbh_cm = Column(Numeric(9, 3), nullable=True)
    approved_for_use = Column(Boolean, nullable=False, default=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)

    carbon_assessments = relationship("CarbonAssessment", back_populates="allometric_equation")


class CarbonAssessment(Base):
    __tablename__ = "carbon_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False, index=True)
    methodology_version = Column(String(40), nullable=False)
    method = Column(String(40), nullable=False)  # GEDI_L4A | FIELD_ALLOMETRY | HYBRID

    area_ha = Column(Numeric(10, 4), nullable=False)
    agbd_mean_mg_ha = Column(Numeric(12, 4), nullable=True)
    agbd_se_mg_ha = Column(Numeric(12, 4), nullable=True)
    agbd_pi_lower_mg_ha = Column(Numeric(12, 4), nullable=True)
    agbd_pi_upper_mg_ha = Column(Numeric(12, 4), nullable=True)
    valid_pixel_fraction = Column(Numeric(7, 4), nullable=True)

    rh100_mean_m = Column(Numeric(9, 4), nullable=True)
    rh75_mean_m = Column(Numeric(9, 4), nullable=True)
    valid_gedi_observations = Column(Integer, nullable=True)

    allometric_equation_id = Column(String(80), ForeignKey("allometric_equations.id"), nullable=True)
    field_tree_density_ha = Column(Numeric(10, 2), nullable=True)

    dry_biomass_t_ha = Column(Numeric(12, 4), nullable=True)
    total_dry_biomass_t = Column(Numeric(14, 4), nullable=True)
    carbon_fraction = Column(Numeric(6, 4), nullable=True)
    total_carbon_t = Column(Numeric(14, 4), nullable=True)
    co2e_factor = Column(Numeric(8, 5), nullable=True)
    total_co2e_t = Column(Numeric(14, 4), nullable=True)

    uncertainty_low_t = Column(Numeric(14, 4), nullable=True)
    uncertainty_high_t = Column(Numeric(14, 4), nullable=True)
    confidence_level = Column(String(20), nullable=True)
    warnings = Column(JSONB, nullable=False, default=list)

    source_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    plot = relationship("Plot", back_populates="carbon_assessments")
    allometric_equation = relationship("AllometricEquation", back_populates="carbon_assessments")
