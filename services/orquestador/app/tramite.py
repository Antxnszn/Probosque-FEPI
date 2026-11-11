from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import sesion
from app.modelos import Cuenta
from app.seguridad import (
    DELEGACIONES,
    PUESTOS,
    cuenta_actual,
    exigir,
    firmar,
    hash_password,
    hay_super_admin,
    verifica_password,
)

router = APIRouter(prefix="/api/tramite/v1", tags=["cuentas"])


class AltaSolicitante(BaseModel):
    nombre: str
    correo: str
    password: str


class AltaSuperAdmin(BaseModel):
    nombre: str
    correo: str
    password: str


class Ingreso(BaseModel):
    correo: str
    password: str
    clase: str


class AltaPersonal(BaseModel):
    nombre: str
    correo: str
    password: str
    puesto: str
    delegacion: str | None = None


class CambioPersonal(BaseModel):
    nombre: str | None = None
    puesto: str | None = None
    delegacion: str | None = None
    activo: bool | None = None


def publico(cuenta: Cuenta, token: str | None = None) -> dict:
    datos = {
        "id": cuenta.id,
        "clase": cuenta.clase,
        "puesto": cuenta.puesto,
        "delegacion": cuenta.delegacion,
        "nombre": cuenta.nombre,
        "correo": cuenta.correo,
        "activo": cuenta.activo,
    }
    if token is not None:
        datos["token"] = token
    return datos


def correo_limpio(valor: str) -> str:
    return valor.strip().lower()


def validar_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña necesita al menos 8 caracteres")


def validar_puesto(puesto: str, delegacion: str | None) -> str | None:
    if puesto not in PUESTOS:
        raise HTTPException(status_code=422, detail="El puesto no está en el trámite")
    if puesto == "delegacion":
        if delegacion not in DELEGACIONES:
            raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
        return delegacion
    return None


@router.get("/arranque")
def arranque(db: Session = Depends(sesion)):
    return {"hay_super_admin": hay_super_admin(db)}


@router.get("/delegaciones")
def delegaciones():
    return sorted(DELEGACIONES)


@router.get("/puestos")
def puestos():
    return sorted(PUESTOS)


@router.post("/cuentas/solicitante")
def alta_solicitante(cuerpo: AltaSolicitante, db: Session = Depends(sesion)):
    validar_password(cuerpo.password)
    correo = correo_limpio(cuerpo.correo)
    existe = db.scalar(select(Cuenta).where(Cuenta.correo == correo, Cuenta.clase == "solicitante"))
    if existe is not None:
        raise HTTPException(status_code=409, detail="Ese correo ya tiene cuenta de solicitante")
    cuenta = Cuenta(
        clase="solicitante",
        nombre=cuerpo.nombre.strip(),
        correo=correo,
        password_hash=hash_password(cuerpo.password),
    )
    db.add(cuenta)
    db.commit()
    db.refresh(cuenta)
    return publico(cuenta, firmar(cuenta))


@router.post("/cuentas/super-admin")
def alta_super_admin(cuerpo: AltaSuperAdmin, db: Session = Depends(sesion)):
    if hay_super_admin(db):
        raise HTTPException(status_code=409, detail="La cuenta de arranque ya existe")
    validar_password(cuerpo.password)
    correo = correo_limpio(cuerpo.correo)
    existe = db.scalar(select(Cuenta).where(Cuenta.correo == correo, Cuenta.clase == "personal"))
    if existe is not None:
        raise HTTPException(status_code=409, detail="Ese correo ya tiene cuenta de personal")
    cuenta = Cuenta(
        clase="personal",
        puesto="super_admin",
        nombre=cuerpo.nombre.strip(),
        correo=correo,
        password_hash=hash_password(cuerpo.password),
    )
    db.add(cuenta)
    db.commit()
    db.refresh(cuenta)
    return publico(cuenta, firmar(cuenta))


@router.post("/sesion")
def ingresar(cuerpo: Ingreso, db: Session = Depends(sesion)):
    if cuerpo.clase not in {"solicitante", "personal"}:
        raise HTTPException(status_code=422, detail="La clase de cuenta no existe")
    cuenta = db.scalar(
        select(Cuenta).where(Cuenta.correo == correo_limpio(cuerpo.correo), Cuenta.clase == cuerpo.clase)
    )
    if cuenta is None or not verifica_password(cuerpo.password, cuenta.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not cuenta.activo:
        raise HTTPException(status_code=403, detail="Esta cuenta está desactivada")
    return publico(cuenta, firmar(cuenta))


@router.get("/yo")
def yo(cuenta: Cuenta = Depends(cuenta_actual)):
    return publico(cuenta)


@router.get("/cuentas")
def listar_personal(cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    exigir(cuenta, {"super_admin"})
    filas = db.scalars(
        select(Cuenta).where(Cuenta.clase == "personal", Cuenta.puesto != "super_admin").order_by(Cuenta.id)
    ).all()
    return [publico(fila) for fila in filas]


@router.post("/cuentas")
def crear_personal(cuerpo: AltaPersonal, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    exigir(cuenta, {"super_admin"})
    validar_password(cuerpo.password)
    delegacion = validar_puesto(cuerpo.puesto, cuerpo.delegacion)
    correo = correo_limpio(cuerpo.correo)
    existe = db.scalar(select(Cuenta).where(Cuenta.correo == correo, Cuenta.clase == "personal"))
    if existe is not None:
        raise HTTPException(status_code=409, detail="Ese correo ya tiene cuenta de personal")
    nueva = Cuenta(
        clase="personal",
        puesto=cuerpo.puesto,
        delegacion=delegacion,
        nombre=cuerpo.nombre.strip(),
        correo=correo,
        password_hash=hash_password(cuerpo.password),
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return publico(nueva)


@router.patch("/cuentas/{cuenta_id}")
def cambiar_personal(
    cuenta_id: int,
    cuerpo: CambioPersonal,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    exigir(cuenta, {"super_admin"})
    fila = db.get(Cuenta, cuenta_id)
    if fila is None or fila.clase != "personal" or fila.puesto == "super_admin":
        raise HTTPException(status_code=404, detail="La cuenta de personal no existe")
    if cuerpo.nombre is not None:
        fila.nombre = cuerpo.nombre.strip()
    puesto = cuerpo.puesto or fila.puesto or ""
    delegacion = cuerpo.delegacion if cuerpo.delegacion is not None else fila.delegacion
    if cuerpo.puesto is not None or cuerpo.delegacion is not None:
        fila.delegacion = validar_puesto(puesto, delegacion)
        fila.puesto = puesto
    if cuerpo.activo is not None:
        fila.activo = cuerpo.activo
    db.commit()
    db.refresh(fila)
    return publico(fila)
