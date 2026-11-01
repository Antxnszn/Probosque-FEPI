import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Plot(Base):
    __tablename__ = "plots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cadastral_key = Column(String(50), unique=True, nullable=False, index=True)
    beneficiary_id = Column(UUID(as_uuid=True), ForeignKey("beneficiaries.id"), nullable=False, index=True)
    planting_date = Column(Date, nullable=True)
    geom = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)
    area_ha = Column(Numeric(10, 4), nullable=True)

    triage_status = Column(String(20), nullable=False, default="PENDING", index=True)
    # PENDING | NORMAL | ANOMALY | INCONCLUSIVE | ERROR
    audit_status = Column(String(20), nullable=False, default="NOT_STARTED", index=True)
    # NOT_STARTED | IN_PROGRESS | COMPLETED | UNDER_REVIEW | INVALID
    subsidy_status = Column(String(24), nullable=False, default="PENDING", index=True)
    # PENDING | ELIGIBLE | NOT_ELIGIBLE | APPROVED | REJECTED | MANUAL_REVIEW

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    beneficiary = relationship("Beneficiary", back_populates="plots")
    audits = relationship("Audit", back_populates="plot")
    triage_assessments = relationship("SatelliteTriageAssessment", back_populates="plot")
    carbon_assessments = relationship("CarbonAssessment", back_populates="plot")
    subsidy_decisions = relationship("SubsidyDecision", back_populates="plot")


Index("idx_plots_geom", Plot.geom, postgresql_using="gist")
