import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class SyncChallenge(Base):
    __tablename__ = "sync_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_installation_id = Column(UUID(as_uuid=True), ForeignKey("device_installations.id"), nullable=False, index=True)
    nonce = Column(String(128), unique=True, nullable=False, index=True)
    issued_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)

    device_installation = relationship("DeviceInstallation", back_populates="sync_challenges")


class SyncLog(Base):
    __tablename__ = "sync_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_installation_id = Column(UUID(as_uuid=True), ForeignKey("device_installations.id"), nullable=False, index=True)
    idempotency_key = Column(String(120), unique=True, nullable=False, index=True)
    payload_hash_sha256 = Column(String(64), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(24), nullable=False)  # RECEIVED | PROCESSING | COMPLETED | CONFLICT | ERROR
    conflict_detail = Column(JSONB, nullable=True)
    server_reference = Column(UUID(as_uuid=True), nullable=True)
