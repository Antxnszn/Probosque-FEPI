import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas.sync import ChallengeRequest, ChallengeResponse
from app.schemas.audit import AuditCreate, AuditResponse
from app.schemas.evidence import EvidenceResponse
from app.services.sync_service import create_challenge, ingest_audit_idempotent, verify_and_consume_challenge
from app.services.evidence_service import process_and_store_evidence
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/sync", tags=["Sync Protocol"])


@router.post("/challenges", response_model=ChallengeResponse)
async def request_challenge(
    req: ChallengeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    challenge = await create_challenge(db, req.device_installation_id)
    await db.commit()
    return ChallengeResponse(
        challenge_id=challenge.id,
        nonce=challenge.nonce,
        expires_at=challenge.expires_at,
    )


@router.post("/audits", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def sync_audit_payload(
    payload: AuditCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # If challenge provided, verify it
    if payload.challenge_id:
        is_valid = await verify_and_consume_challenge(db, payload.challenge_id, payload.device_installation_id)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Invalid, expired, or already consumed sync challenge"
            )

    audit, is_new = await ingest_audit_idempotent(db, payload)
    await db.commit()
    await db.refresh(audit)
    return audit


@router.post("/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def sync_evidence_photo(
    audit_id: Annotated[uuid.UUID, Form()],
    client_hash_sha256: Annotated[str, Form()],
    evidence_type: Annotated[str, Form()] = "SAMPLING_UNIT",
    sampling_unit_id: Annotated[Optional[uuid.UUID], Form()] = None,
    capture_lat: Annotated[Optional[float], Form()] = None,
    capture_lon: Annotated[Optional[float], Form()] = None,
    capture_accuracy_m: Annotated[Optional[float], Form()] = None,
    challenge_id: Annotated[Optional[uuid.UUID], Form()] = None,
    file: UploadFile = File(...),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    file_bytes = await file.read()
    evidence, hash_matches = await process_and_store_evidence(
        session=db,
        audit_id=audit_id,
        file_bytes=file_bytes,
        mime_type=file.content_type or "image/jpeg",
        evidence_type=evidence_type,
        client_hash_sha256=client_hash_sha256,
        sampling_unit_id=sampling_unit_id,
        capture_lat=capture_lat,
        capture_lon=capture_lon,
        capture_accuracy_m=capture_accuracy_m,
        challenge_id=challenge_id,
    )
    await db.commit()
    await db.refresh(evidence)
    return evidence
