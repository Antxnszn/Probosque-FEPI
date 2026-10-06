import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Date, DateTime, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class SatelliteTriageAssessment(Base):
    __tablename__ = "satellite_triage_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False, index=True)
    methodology_version = Column(String(40), nullable=False)

    baseline_start = Column(Date, nullable=True)
    baseline_end = Column(Date, nullable=True)
    current_start = Column(Date, nullable=True)
    current_end = Column(Date, nullable=True)

    observation_count = Column(Integer, nullable=True)
    valid_pixel_fraction = Column(Numeric(7, 4), nullable=True)
    cloud_fraction = Column(Numeric(7, 4), nullable=True)
    shadow_fraction = Column(Numeric(7, 4), nullable=True)

    baseline_ndvi = Column(Numeric(7, 4), nullable=True)
    current_ndvi = Column(Numeric(7, 4), nullable=True)
    ndvi_delta = Column(Numeric(7, 4), nullable=True)
    ndvi_anomaly_score = Column(Numeric(10, 6), nullable=True)

    mean_evi = Column(Numeric(7, 4), nullable=True)
    mean_ndre = Column(Numeric(7, 4), nullable=True)

    triage_status = Column(String(20), nullable=False, index=True)  # NORMAL | ANOMALY | INCONCLUSIVE
    reason_codes = Column(JSONB, nullable=False, default=list)
    source_dataset = Column(String(200), nullable=True)
    processing_metadata = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    plot = relationship("Plot", back_populates="triage_assessments")
