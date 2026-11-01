import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Numeric, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Audit(Base):
    __tablename__ = "audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False, index=True)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id"), nullable=False, index=True)

    survey_started_at = Column(DateTime(timezone=True), nullable=False)
    survey_completed_at = Column(DateTime(timezone=True), nullable=True)
    methodology_version = Column(String(40), nullable=False)

    start_lat = Column(Numeric(10, 7), nullable=True)
    start_lon = Column(Numeric(10, 7), nullable=True)
    start_accuracy_m = Column(Numeric(7, 2), nullable=True)
    end_lat = Column(Numeric(10, 7), nullable=True)
    end_lon = Column(Numeric(10, 7), nullable=True)
    end_accuracy_m = Column(Numeric(7, 2), nullable=True)

    geofence_valid = Column(Boolean, nullable=False, default=False)
    geofence_method = Column(String(40), nullable=True)

    device_installation_id = Column(UUID(as_uuid=True), ForeignKey("device_installations.id"), nullable=False)
    client_created_at = Column(DateTime(timezone=True), nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=True)

    record_hash_sha256 = Column(String(64), nullable=True)
    revision_of = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    plot = relationship("Plot", back_populates="audits")
    technician = relationship("Technician", back_populates="audits")
    device_installation = relationship("DeviceInstallation", back_populates="audits")
    sampling_units = relationship("AuditSamplingUnit", back_populates="audit", cascade="all, delete-orphan", order_by="AuditSamplingUnit.sequence_no")
    result = relationship("AuditResult", back_populates="audit", uselist=False, cascade="all, delete-orphan")
    photos = relationship("EvidencePhoto", back_populates="audit")
    subsidy_decisions = relationship("SubsidyDecision", back_populates="audit")


class AuditSamplingUnit(Base):
    __tablename__ = "audit_sampling_units"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True)
    sequence_no = Column(Integer, nullable=False)

    center = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    radius_m = Column(Numeric(7, 3), nullable=False, default=12.616)
    area_m2 = Column(Numeric(9, 3), nullable=False, default=500.0)

    sampled_planting_sites = Column(Integer, nullable=True)
    alive_trees = Column(Integer, nullable=False)
    dead_trees = Column(Integer, nullable=False)
    unknown_sites = Column(Integer, nullable=False, default=0)

    gps_accuracy_m = Column(Numeric(7, 2), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("alive_trees >= 0 AND dead_trees >= 0 AND unknown_sites >= 0", name="chk_sampling_counts"),
    )

    audit = relationship("Audit", back_populates="sampling_units")
    photos = relationship("EvidencePhoto", back_populates="sampling_unit")


Index("idx_sampling_units_geom", AuditSamplingUnit.center, postgresql_using="gist")


class AuditResult(Base):
    __tablename__ = "audit_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), unique=True, nullable=False)
    methodology_version = Column(String(40), nullable=False)
    denominator_definition = Column(String(80), nullable=False)
    estimator_method = Column(String(40), nullable=False)  # RATIO_ESTIMATOR | OTHER_APPROVED_METHOD
    sampling_units_count = Column(Integer, nullable=False)
    alive_total = Column(Integer, nullable=False)
    denominator_total = Column(Integer, nullable=False)
    estimated_survival_pct = Column(Numeric(6, 3), nullable=False)
    ci_low_pct = Column(Numeric(6, 3), nullable=True)
    ci_high_pct = Column(Numeric(6, 3), nullable=True)
    ci_method = Column(String(40), nullable=True)  # STUDENT_T | NOT_AVAILABLE
    confidence_level_pct = Column(Numeric(5, 2), nullable=True)
    computed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    calculator_version = Column(String(40), nullable=False)

    audit = relationship("Audit", back_populates="result")
    subsidy_decisions = relationship("SubsidyDecision", back_populates="audit_result")
