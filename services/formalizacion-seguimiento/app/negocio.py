from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.actor import actor, exige
from app.db import sesion
from app.modelos import Contrato, Informe, Ministracion, SeguimientoDocumento

router = APIRouter(prefix="/interno/v1", tags=["formalizacion"])


class ContratoEntrada(BaseModel):
    solicitud_id: int
    texto_compromisos: str = ""
    archivo_id: int | None = None


class MinistracionEntrada(BaseModel):
    solicitud_id: int
    programa: str = ""
    fecha: date
    tipo_apoyo: str
    monto: Decimal
    archivo_id: int | None = None


class SeguimientoEntrada(BaseModel):
    solicitud_id: int
    nombre: str
    archivo_id: int | None = None


class InformeEntrada(BaseModel):
    solicitud_id: int
    texto: str = ""
    archivo_id: int | None = None


def contrato_de(fila: Contrato) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "texto_compromisos": fila.texto_compromisos,
        "archivo_id": fila.archivo_id,
        "creado_en": fila.creado_en.isoformat(),
    }


def ministracion_de(fila: Ministracion) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "programa": fila.programa,
        "fecha": fila.fecha.isoformat(),
        "tipo_apoyo": fila.tipo_apoyo,
        "monto": str(fila.monto),
        "archivo_id": fila.archivo_id,
        "creado_en": fila.creado_en.isoformat(),
    }


def seguimiento_de(fila: SeguimientoDocumento) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "nombre": fila.nombre,
        "archivo_id": fila.archivo_id,
        "creado_en": fila.creado_en.isoformat(),
    }


def informe_de(fila: Informe) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "texto": fila.texto,
        "archivo_id": fila.archivo_id,
        "estado": fila.estado,
        "creado_en": fila.creado_en.isoformat(),
    }


@router.get("/solicitudes/{solicitud_id}/formalizacion")
def leer(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    if quien["clase"] not in {"solicitante", "personal"}:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
    if quien["puesto"] == "fiduciaria":
        raise HTTPException(status_code=403, detail="La fiduciaria consulta las ministraciones de PSAHEM")
    contrato = db.scalar(select(Contrato).where(Contrato.solicitud_id == solicitud_id))
    ministraciones = db.scalars(select(Ministracion).where(Ministracion.solicitud_id == solicitud_id)).all()
    seguimientos = db.scalars(
        select(SeguimientoDocumento).where(SeguimientoDocumento.solicitud_id == solicitud_id)
    ).all()
    informe = db.scalar(select(Informe).where(Informe.solicitud_id == solicitud_id))
    return {
        "contrato": contrato_de(contrato) if contrato else None,
        "ministraciones": [ministracion_de(fila) for fila in ministraciones],
        "seguimientos": [seguimiento_de(fila) for fila in seguimientos],
        "informe": informe_de(informe) if informe else None,
    }


@router.post("/contratos")
def guardar_contrato(cuerpo: ContratoEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"administracion_finanzas"})
    fila = db.scalar(select(Contrato).where(Contrato.solicitud_id == cuerpo.solicitud_id))
    if fila is None:
        fila = Contrato(solicitud_id=cuerpo.solicitud_id, cuenta_id=quien["id"])
        db.add(fila)
    fila.texto_compromisos = cuerpo.texto_compromisos
    fila.archivo_id = cuerpo.archivo_id
    fila.cuenta_id = quien["id"]
    db.commit()
    db.refresh(fila)
    return contrato_de(fila)


@router.post("/ministraciones")
def guardar_ministracion(cuerpo: MinistracionEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"administracion_finanzas"})
    if cuerpo.monto < 0:
        raise HTTPException(status_code=422, detail="El monto lo escribe el personal y no puede ser negativo")
    fila = Ministracion(
        solicitud_id=cuerpo.solicitud_id,
        cuenta_id=quien["id"],
        programa=cuerpo.programa,
        fecha=cuerpo.fecha,
        tipo_apoyo=cuerpo.tipo_apoyo.strip(),
        monto=cuerpo.monto,
        archivo_id=cuerpo.archivo_id,
    )
    db.add(fila)
    db.commit()
    db.refresh(fila)
    return ministracion_de(fila)


@router.get("/ministraciones")
def listar_ministraciones(programa: str = "", db: Session = Depends(sesion), quien: dict = Depends(actor)):
    if quien["puesto"] == "fiduciaria":
        programa = "PSA"
    else:
        exige(quien, {"administracion_finanzas", "coordinacion_delegaciones", "convocatorias", "uippe"})
    consulta = select(Ministracion).order_by(Ministracion.id.desc())
    if programa:
        consulta = consulta.where(Ministracion.programa == programa)
    return [ministracion_de(fila) for fila in db.scalars(consulta).all()]


@router.post("/seguimientos")
def guardar_seguimiento(cuerpo: SeguimientoEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"seguimiento"})
    fila = SeguimientoDocumento(
        solicitud_id=cuerpo.solicitud_id,
        cuenta_id=quien["id"],
        nombre=cuerpo.nombre.strip(),
        archivo_id=cuerpo.archivo_id,
    )
    db.add(fila)
    db.commit()
    db.refresh(fila)
    return seguimiento_de(fila)


@router.post("/informes")
def guardar_informe(cuerpo: InformeEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"solicitante"})
    fila = db.scalar(select(Informe).where(Informe.solicitud_id == cuerpo.solicitud_id))
    if fila is not None and fila.estado == "aprobado":
        raise HTTPException(status_code=409, detail="El informe ya fue aprobado")
    if fila is None:
        fila = Informe(solicitud_id=cuerpo.solicitud_id, cuenta_id=quien["id"])
        db.add(fila)
    fila.texto = cuerpo.texto
    fila.archivo_id = cuerpo.archivo_id
    fila.estado = "pendiente"
    db.commit()
    db.refresh(fila)
    return informe_de(fila)


@router.post("/informes/{solicitud_id}/aprobar")
def aprobar_informe(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"seguimiento"})
    fila = db.scalar(select(Informe).where(Informe.solicitud_id == solicitud_id))
    if fila is None:
        raise HTTPException(status_code=404, detail="Todavía no hay informe")
    fila.estado = "aprobado"
    fila.aprobado_por = quien["id"]
    db.commit()
    db.refresh(fila)
    return informe_de(fila)
