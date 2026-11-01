import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EvidencePhoto(Base):
    __tablename__ = "evidence_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True)
    sampling_unit_id = Column(UUID(as_uuid=True), ForeignKey("audit_sampling_units.id"), nullable=True, index=True)

    object_key = Column(String(500), nullable=False)
    object_version_id = Column(String(200), nullable=True)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    hash_sha256 = Column(String(64), nullable=False)

    # Primary capture context recorded by the PWA at shutter/capture time
    capture_lat = Column(Numeric(10, 7), nullable=True)
    capture_lon = Column(Numeric(10, 7), nullable=True)
    capture_accuracy_m = Column(Numeric(7, 2), nullable=True)
    captured_at_client = Column(DateTime(timezone=True), nullable=True)
    capture_context_hash = Column(String(64), nullable=True)
    capture_signature = Column(Text, nullable=True)
    challenge_id = Column(UUID(as_uuid=True), nullable=True)
    received_at_server = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Supplementary EXIF
    exif_timestamp = Column(DateTime(timezone=True), nullable=True)
    exif_lat = Column(Numeric(10, 7), nullable=True)
    exif_lon = Column(Numeric(10, 7), nullable=True)
    exif_accuracy_m = Column(Numeric(7, 2), nullable=True)

    evidence_type = Column(String(30), nullable=False)  # PLOT_OVERVIEW | SAMPLING_UNIT | DETAIL | OTHER
    metadata_valid = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    audit = relationship("Audit", back_populates="photos")
    sampling_unit = relationship("AuditSamplingUnit", back_populates="photos")
