import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class SubsidyDecision(Base):
    __tablename__ = "subsidy_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("plots.id"), nullable=False, index=True)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True)
    audit_result_id = Column(UUID(as_uuid=True), ForeignKey("audit_results.id"), nullable=False, index=True)

    program_id = Column(String(80), nullable=False)
    rules_version = Column(String(40), nullable=False)
    decision = Column(String(30), nullable=False, index=True)  # APPROVED | REJECTED | MANUAL_REVIEW
    decision_basis = Column(JSONB, nullable=False)
    reason_codes = Column(JSONB, nullable=False, default=list)

    decided_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    plot = relationship("Plot", back_populates="subsidy_decisions")
    audit = relationship("Audit", back_populates="subsidy_decisions")
    audit_result = relationship("AuditResult", back_populates="subsidy_decisions")
    reviewer = relationship("User", foreign_keys=[decided_by])


Index("idx_subsidy_plot_decided", SubsidyDecision.plot_id, SubsidyDecision.decided_at.desc())
