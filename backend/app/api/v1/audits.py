import uuid
from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.audit import Audit
from app.schemas.audit import AuditResponse
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/audits", tags=["Audits"])


@router.get("", response_model=List[AuditResponse])
async def list_audits(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    plot_id: Optional[uuid.UUID] = Query(None),
    technician_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = (
        select(Audit)
        .options(selectinload(Audit.result), selectinload(Audit.sampling_units))
        .offset(offset)
        .limit(limit)
    )
    if plot_id:
        query = query.where(Audit.plot_id == plot_id)
    if technician_id:
        query = query.where(Audit.technician_id == technician_id)

    res = await db.execute(query)
    audits = list(res.scalars().all())
    return audits


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(
    audit_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    query = (
        select(Audit)
        .where(Audit.id == audit_id)
        .options(selectinload(Audit.result), selectinload(Audit.sampling_units))
    )
    res = await db.execute(query)
    audit = res.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit
