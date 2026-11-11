import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import sesion
from app.modelos import Cuenta

bearer = HTTPBearer(auto_error=False)

PUESTOS = {
    "convocatorias",
    "delegacion",
    "coordinacion_delegaciones",
    "unidad_juridica",
    "area_tecnica",
    "comite",
    "administracion_finanzas",
    "seguimiento",
    "gestion_documental",
    "uippe",
    "fiduciaria",
    "organo_control",
}

DELEGACIONES = {
    "Toluca",
    "Naucalpan",
    "Texcoco",
    "Tejupilco",
    "Atlacomulco",
    "Coatepec Harinas",
    "Valle de Bravo",
    "Amecameca",
    "Jilotepec",
}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derivado = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return base64.b64encode(salt + derivado).decode()


def verifica_password(password: str, guardado: str) -> bool:
    crudo = base64.b64decode(guardado.encode())
    salt, derivado = crudo[:16], crudo[16:]
    prueba = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return hmac.compare_digest(derivado, prueba)


def firmar(cuenta: Cuenta) -> str:
    payload = {
        "id": cuenta.id,
        "clase": cuenta.clase,
        "puesto": cuenta.puesto or "",
        "delegacion": cuenta.delegacion or "",
        "nombre": cuenta.nombre,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=12)).timestamp()),
    }
    cuerpo = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    firma = hmac.new(settings.secreto.encode(), cuerpo.encode(), hashlib.sha256).hexdigest()
    return f"{cuerpo}.{firma}"


def leer_token(token: str) -> dict:
    try:
        cuerpo, firma = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Sesión inválida") from exc
    esperada = hmac.new(settings.secreto.encode(), cuerpo.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(firma, esperada):
        raise HTTPException(status_code=401, detail="Sesión inválida")
    relleno = "=" * (-len(cuerpo) % 4)
    payload = json.loads(base64.urlsafe_b64decode(cuerpo + relleno))
    if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=401, detail="La sesión expiró")
    return payload


def cuenta_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(sesion),
) -> Cuenta:
    if credenciales is None:
        raise HTTPException(status_code=401, detail="Falta la sesión")
    datos = leer_token(credenciales.credentials)
    cuenta = db.get(Cuenta, datos["id"])
    if cuenta is None:
        raise HTTPException(status_code=401, detail="La cuenta ya no existe")
    if not cuenta.activo:
        raise HTTPException(status_code=403, detail="Esta cuenta está desactivada")
    return cuenta


def cuenta_opcional(
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(sesion),
) -> Cuenta | None:
    if credenciales is None:
        return None
    datos = leer_token(credenciales.credentials)
    cuenta = db.get(Cuenta, datos["id"])
    if cuenta is None:
        raise HTTPException(status_code=401, detail="La cuenta ya no existe")
    return cuenta


def exigir(cuenta: Cuenta, puestos: set[str]) -> None:
    if cuenta.clase != "personal" or cuenta.puesto not in puestos:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")


def hay_super_admin(db: Session) -> bool:
    total = db.scalar(
        select(func.count()).select_from(Cuenta).where(Cuenta.clase == "personal", Cuenta.puesto == "super_admin")
    )
    return total != 0
