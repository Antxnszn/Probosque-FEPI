import uuid
from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.subsidy import SubsidyDecision
from app.schemas.decision import SubsidyDecisionCreate, SubsidyDecisionResponse
from app.services.decision_service import evaluate_subsidy_decision
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/decisions", tags=["Subsidy Decision Engine"])


@router.post("/evaluate", response_model=SubsidyDecisionResponse, status_code=status.HTTP_201_CREATED)
async def trigger_decision_evaluation(
    req: SubsidyDecisionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        decision = await evaluate_subsidy_decision(
            session=db,
            plot_id=req.plot_id,
            audit_id=req.audit_id,
            decided_by=current_user.id,
            program_id=req.program_id,
            rules_version=req.rules_version,
            override_decision=req.override_decision,
            override_reason=req.override_reason,
        )
        await db.commit()
        await db.refresh(decision)
        return decision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/plot/{plot_id}", response_model=List[SubsidyDecisionResponse])
async def get_decisions_for_plot(
    plot_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    q = (
        select(SubsidyDecision)
        .where(SubsidyDecision.plot_id == plot_id)
        .order_by(SubsidyDecision.decided_at.desc())
    )
    res = await db.execute(q)
    return list(res.scalars().all())
