import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.elements import WKTElement

from app.models.sync import SyncChallenge, SyncLog
from app.models.audit import Audit, AuditSamplingUnit
from app.models.plot import Plot
from app.schemas.audit import AuditCreate
from app.services.audit_service import compute_and_persist_audit_result
from app.services.geofence_service import check_geofence
from app.utils.crypto import generate_nonce


async def create_challenge(
    session: AsyncSession,
    device_installation_id: uuid.UUID,
    ttl_seconds: int = 300,
) -> SyncChallenge:
    nonce = generate_nonce(32)
    now = datetime.now(timezone.utc)
    challenge = SyncChallenge(
        id=uuid.uuid4(),
        device_installation_id=device_installation_id,
        nonce=nonce,
        issued_at=now,
        expires_at=now + timedelta(seconds=ttl_seconds),
    )
    session.add(challenge)
    await session.flush()
    return challenge


async def verify_and_consume_challenge(
    session: AsyncSession,
    challenge_id: uuid.UUID,
    device_installation_id: uuid.UUID,
) -> bool:
    q = select(SyncChallenge).where(
        SyncChallenge.id == challenge_id,
        SyncChallenge.device_installation_id == device_installation_id,
        SyncChallenge.consumed_at.is_(None),
    )
    res = await session.execute(q)
    challenge = res.scalar_one_or_none()

    if not challenge:
        return False

    now = datetime.now(timezone.utc)
    if challenge.expires_at < now:
        return False

    challenge.consumed_at = now
    return True


async def ingest_audit_idempotent(
    session: AsyncSession,
    payload: AuditCreate,
) -> Tuple[Audit, bool]:
    """
    Idempotent audit ingestion:
    1. Checks if idempotency_key was already processed in sync_log.
    2. If yes, returns existing audit record without mutating.
    3. If no, performs polygon geofence check, persists immutable Audit & AuditSamplingUnits,
       and calculates server-authoritative AuditResult.
    """
    # 1. Check idempotency log
    log_q = select(SyncLog).where(SyncLog.idempotency_key == payload.idempotency_key)
    log_res = await session.execute(log_q)
    existing_log = log_res.scalar_one_or_none()

    if existing_log and existing_log.server_reference:
        audit_q = select(Audit).where(Audit.id == existing_log.server_reference)
        audit_res = await session.execute(audit_q)
        existing_audit = audit_res.scalar_one_or_none()
        if existing_audit:
            return existing_audit, False

    # 2. Check plot geometry for geofencing
    plot_q = select(Plot).where(Plot.id == payload.plot_id)
    plot_res = await session.execute(plot_q)
    plot = plot_res.scalar_one_or_none()

    geofence_valid = True
    geofence_method = "BYPASS"

    if plot and payload.start_lat is not None and payload.start_lon is not None:
        # Evaluate geofence
        from shapely import wkb
        import json
        from shapely.geometry import mapping
        
        # Plot geometry conversion
        geom_bytes = bytes(plot.geom.data) if hasattr(plot.geom, "data") else plot.geom
        shapely_geom = wkb.loads(geom_bytes)
        geojson_geom = mapping(shapely_geom)

        is_valid, status, diag = check_geofence(
            lat=payload.start_lat,
            lon=payload.start_lon,
            accuracy_m=payload.start_accuracy_m,
            plot_geometry=geojson_geom,
        )
        geofence_valid = is_valid
        geofence_method = f"POLYGON_ACCURACY_CHECK_{status}"

    # 3. Create Audit record
    audit_id = payload.id or uuid.uuid4()
    now = datetime.now(timezone.utc)

    audit = Audit(
        id=audit_id,
        plot_id=payload.plot_id,
        technician_id=payload.technician_id,
        survey_started_at=payload.survey_started_at,
        survey_completed_at=payload.survey_completed_at or now,
        methodology_version=payload.methodology_version,
        start_lat=payload.start_lat,
        start_lon=payload.start_lon,
        start_accuracy_m=payload.start_accuracy_m,
        end_lat=payload.end_lat,
        end_lon=payload.end_lon,
        end_accuracy_m=payload.end_accuracy_m,
        geofence_valid=geofence_valid,
        geofence_method=geofence_method,
        device_installation_id=payload.device_installation_id,
        client_created_at=payload.client_created_at,
        received_at=now,
    )
    session.add(audit)

    # 4. Create Sampling Units
    for unit_in in payload.sampling_units:
        point_wkt = f"POINT({unit_in.lon} {unit_in.lat})"
        unit = AuditSamplingUnit(
            id=uuid.uuid4(),
            audit_id=audit_id,
            sequence_no=unit_in.sequence_no,
            center=WKTElement(point_wkt, srid=4326),
            radius_m=unit_in.radius_m,
            area_m2=unit_in.area_m2,
            sampled_planting_sites=unit_in.sampled_planting_sites,
            alive_trees=unit_in.alive_trees,
            dead_trees=unit_in.dead_trees,
            unknown_sites=unit_in.unknown_sites,
            gps_accuracy_m=unit_in.gps_accuracy_m,
            captured_at=unit_in.captured_at,
        )
        session.add(unit)

    await session.flush()

    # 5. Compute server-authoritative audit results
    await compute_and_persist_audit_result(session, audit_id)

    # 6. Record sync log
    sync_log = SyncLog(
        id=uuid.uuid4(),
        device_installation_id=payload.device_installation_id,
        idempotency_key=payload.idempotency_key,
        received_at=now,
        processed_at=now,
        status="COMPLETED",
        server_reference=audit_id,
    )
    session.add(sync_log)

    # Update plot audit status
    if plot:
        plot.audit_status = "COMPLETED"

    await session.flush()
    return audit, True
