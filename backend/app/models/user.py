import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(120), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False)  # TECHNICIAN | REVIEWER | ADMIN
    active = Column(Boolean, nullable=False, default=True)
    hashed_password = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    technician_profile = relationship("Technician", back_populates="user", uselist=False)


class Technician(Base):
    __tablename__ = "technicians"

    id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    employee_code = Column(String(80), unique=True, nullable=False, index=True)
    active = Column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="technician_profile")
    device_installations = relationship("DeviceInstallation", back_populates="technician")
    audits = relationship("Audit", back_populates="technician")


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_key = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    plots = relationship("Plot", back_populates="beneficiary")


class DeviceInstallation(Base):
    __tablename__ = "device_installations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("technicians.id"), nullable=False, index=True)
    public_key_jwk = Column(JSONB, nullable=True)
    key_algorithm = Column(String(40), nullable=True)
    registered_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    technician = relationship("Technician", back_populates="device_installations")
    sync_challenges = relationship("SyncChallenge", back_populates="device_installation")
    audits = relationship("Audit", back_populates="device_installation")
