from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.actor import actor, exige
from app.db import sesion
from app.modelos import ArchivoExpediente, Cierre, Queja

router = APIRouter(prefix="/interno/v1", tags=["cierre"])
TIPOS = {"cierre", "terminacion", "reintegro"}


class CierreEntrada(BaseModel):
    solicitud_id: int
    programa: str = ""
    tipo: str
    texto: str = ""
    resumen: str = ""


class QuejaEntrada(BaseModel):
    solicitud_id: int
    texto: str


class AtencionEntrada(BaseModel):
    respuesta: str


def cierre_de(fila: Cierre) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "programa": fila.programa,
        "tipo": fila.tipo,
        "texto": fila.texto,
        "creado_en": fila.creado_en.isoformat(),
    }


def archivo_de(fila: ArchivoExpediente) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "cuenta_id": fila.cuenta_id,
        "programa": fila.programa,
        "resumen": fila.resumen,
        "creado_en": fila.creado_en.isoformat(),
    }


def queja_de(fila: Queja) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "cuenta_id": fila.cuenta_id,
        "texto": fila.texto,
        "respuesta": fila.respuesta,
        "creado_en": fila.creado_en.isoformat(),
    }


@router.post("/cierres")
def cerrar(cuerpo: CierreEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"seguimiento"})
    if cuerpo.tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="El cierre es cierre, terminación o reintegro")
    existe = db.scalar(select(Cierre).where(Cierre.solicitud_id == cuerpo.solicitud_id))
    if existe is not None:
        raise HTTPException(status_code=409, detail="Este expediente ya tiene cierre")
    fila = Cierre(
        solicitud_id=cuerpo.solicitud_id,
        cuenta_id=quien["id"],
        programa=cuerpo.programa,
        tipo=cuerpo.tipo,
        texto=cuerpo.texto,
    )
    db.add(fila)
    db.flush()
    db.add(
        ArchivoExpediente(
            solicitud_id=cuerpo.solicitud_id,
            cuenta_id=quien["id"],
            programa=cuerpo.programa,
            resumen=cuerpo.resumen,
        )
    )
    db.commit()
    db.refresh(fila)
    return cierre_de(fila)


@router.get("/cierres")
def listar_cierres(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"seguimiento", "gestion_documental", "uippe", "convocatorias", "coordinacion_delegaciones"})
    return [cierre_de(fila) for fila in db.scalars(select(Cierre).order_by(Cierre.id.desc())).all()]


@router.get("/archivos")
def listar_archivos(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    if quien["puesto"] != "gestion_documental" and quien["clase"] != "solicitante":
        exige(quien, {"gestion_documental", "seguimiento", "convocatorias", "coordinacion_delegaciones"})
    filas = db.scalars(select(ArchivoExpediente).order_by(ArchivoExpediente.id.desc())).all()
    if quien["clase"] == "solicitante":
        return []
    return [archivo_de(fila) for fila in filas]


@router.get("/solicitudes/{solicitud_id}/cierre")
def leer(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    if quien["clase"] not in {"solicitante", "personal"}:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
    cierre = db.scalar(select(Cierre).where(Cierre.solicitud_id == solicitud_id))
    archivo = db.scalar(select(ArchivoExpediente).where(ArchivoExpediente.solicitud_id == solicitud_id))
    quejas = db.scalars(select(Queja).where(Queja.solicitud_id == solicitud_id).order_by(Queja.id)).all()
    if quien["clase"] == "solicitante":
        quejas = [fila for fila in quejas if fila.cuenta_id == quien["id"]]
    return {
        "cierre": cierre_de(cierre) if cierre else None,
        "archivo": archivo_de(archivo) if archivo else None,
        "quejas": [queja_de(fila) for fila in quejas],
    }


@router.get("/conteos")
def conteos(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"uippe", "convocatorias", "coordinacion_delegaciones"})
    grupos: dict[str, int] = {}
    for fila in db.scalars(select(Cierre)).all():
        clave = f"{fila.programa}|{fila.tipo}"
        grupos[clave] = grupos.get(clave, 0) + 1
    return [
        {"programa": clave.split("|")[0], "tipo": clave.split("|")[1], "total": total}
        for clave, total in grupos.items()
    ]


@router.post("/quejas")
def crear_queja(cuerpo: QuejaEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"solicitante"})
    if not cuerpo.texto.strip():
        raise HTTPException(status_code=422, detail="La queja necesita un texto")
    fila = Queja(solicitud_id=cuerpo.solicitud_id, cuenta_id=quien["id"], texto=cuerpo.texto.strip())
    db.add(fila)
    db.commit()
    db.refresh(fila)
    return queja_de(fila)


@router.get("/quejas")
def listar_quejas(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"organo_control"})
    return [queja_de(fila) for fila in db.scalars(select(Queja).order_by(Queja.id.desc())).all()]


@router.post("/quejas/{queja_id}/atencion")
def atender(queja_id: int, cuerpo: AtencionEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"organo_control"})
    fila = db.get(Queja, queja_id)
    if fila is None:
        raise HTTPException(status_code=404, detail="La queja no existe")
    if not cuerpo.respuesta.strip():
        raise HTTPException(status_code=422, detail="La atención necesita un texto")
    fila.respuesta = cuerpo.respuesta.strip()
    fila.respondida_por = quien["id"]
    db.commit()
    return queja_de(fila)
