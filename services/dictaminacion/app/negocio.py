from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.actor import actor, exige
from app.db import sesion
from app.modelos import DictamenJuridico, DictamenTecnico, Resolucion

router = APIRouter(prefix="/interno/v1", tags=["dictaminacion"])
RESULTADOS = {"beneficiario", "lista_espera", "fuera"}


class DictamenEntrada(BaseModel):
    solicitud_id: int
    procede: bool
    texto: str = ""
    archivo_id: int | None = None


class ResolucionEntrada(BaseModel):
    solicitud_id: int
    programa: str = ""
    resultado: str
    texto: str = ""


def juridico_de(fila: DictamenJuridico) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "procede": fila.procede,
        "texto": fila.texto,
        "archivo_id": fila.archivo_id,
        "creado_en": fila.creado_en.isoformat(),
    }


def tecnico_de(fila: DictamenTecnico) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "procede": fila.procede,
        "texto": fila.texto,
        "archivo_id": fila.archivo_id,
        "creado_en": fila.creado_en.isoformat(),
    }


def resolucion_de(fila: Resolucion) -> dict:
    return {
        "id": fila.id,
        "solicitud_id": fila.solicitud_id,
        "programa": fila.programa,
        "resultado": fila.resultado,
        "texto": fila.texto,
        "creado_en": fila.creado_en.isoformat(),
    }


def ultimas(filas: list[Resolucion]) -> dict[int, Resolucion]:
    elegidas: dict[int, Resolucion] = {}
    for fila in filas:
        elegidas[fila.solicitud_id] = fila
    return elegidas


@router.get("/solicitudes/{solicitud_id}/dictamen")
def leer(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    if quien["clase"] not in {"solicitante", "personal"}:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
    juridico = db.scalar(select(DictamenJuridico).where(DictamenJuridico.solicitud_id == solicitud_id))
    tecnico = db.scalar(select(DictamenTecnico).where(DictamenTecnico.solicitud_id == solicitud_id))
    resoluciones = db.scalars(
        select(Resolucion).where(Resolucion.solicitud_id == solicitud_id).order_by(Resolucion.id)
    ).all()
    return {
        "juridico": juridico_de(juridico) if juridico else None,
        "tecnico": tecnico_de(tecnico) if tecnico else None,
        "resoluciones": [resolucion_de(fila) for fila in resoluciones],
    }


@router.post("/dictamenes-juridicos")
def guardar_juridico(cuerpo: DictamenEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"unidad_juridica"})
    fila = db.scalar(select(DictamenJuridico).where(DictamenJuridico.solicitud_id == cuerpo.solicitud_id))
    if fila is None:
        fila = DictamenJuridico(solicitud_id=cuerpo.solicitud_id, cuenta_id=quien["id"], procede=cuerpo.procede)
        db.add(fila)
    fila.procede = cuerpo.procede
    fila.texto = cuerpo.texto
    fila.archivo_id = cuerpo.archivo_id
    fila.cuenta_id = quien["id"]
    db.commit()
    db.refresh(fila)
    return juridico_de(fila)


@router.post("/dictamenes-tecnicos")
def guardar_tecnico(cuerpo: DictamenEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"area_tecnica"})
    fila = db.scalar(select(DictamenTecnico).where(DictamenTecnico.solicitud_id == cuerpo.solicitud_id))
    if fila is None:
        fila = DictamenTecnico(solicitud_id=cuerpo.solicitud_id, cuenta_id=quien["id"], procede=cuerpo.procede)
        db.add(fila)
    fila.procede = cuerpo.procede
    fila.texto = cuerpo.texto
    fila.archivo_id = cuerpo.archivo_id
    fila.cuenta_id = quien["id"]
    db.commit()
    db.refresh(fila)
    return tecnico_de(fila)


@router.post("/resoluciones")
def resolver(cuerpo: ResolucionEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"comite"})
    if cuerpo.resultado not in RESULTADOS:
        raise HTTPException(status_code=422, detail="El resultado es beneficiario, lista de espera o fuera")
    previas = db.scalars(
        select(Resolucion).where(Resolucion.solicitud_id == cuerpo.solicitud_id).order_by(Resolucion.id)
    ).all()
    if previas:
        ultima = previas[-1]
        if not (ultima.resultado == "lista_espera" and cuerpo.resultado == "beneficiario"):
            raise HTTPException(
                status_code=409,
                detail="La reasignación solo pasa de lista de espera a beneficiario",
            )
    fila = Resolucion(
        solicitud_id=cuerpo.solicitud_id,
        cuenta_id=quien["id"],
        programa=cuerpo.programa,
        resultado=cuerpo.resultado,
        texto=cuerpo.texto,
    )
    db.add(fila)
    db.commit()
    db.refresh(fila)
    return resolucion_de(fila)


@router.get("/lista-espera")
def lista(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"comite", "coordinacion_delegaciones", "convocatorias"})
    filas = db.scalars(select(Resolucion).order_by(Resolucion.id)).all()
    return [resolucion_de(fila) for fila in ultimas(filas).values() if fila.resultado == "lista_espera"]


@router.get("/conteos")
def conteos(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"uippe", "convocatorias", "coordinacion_delegaciones"})
    filas = db.scalars(select(Resolucion).order_by(Resolucion.id)).all()
    grupos: dict[str, int] = {}
    for fila in ultimas(filas).values():
        clave = f"{fila.programa}|{fila.resultado}"
        grupos[clave] = grupos.get(clave, 0) + 1
    return [
        {"programa": clave.split("|")[0], "resultado": clave.split("|")[1], "total": total}
        for clave, total in grupos.items()
    ]
