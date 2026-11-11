from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.actor import actor, exige
from app.config import settings
from app.db import sesion
from app.geometria import (
    anillo,
    carpeta_solicitud,
    escribir_shapefile,
    leer_shapefile,
    nombre_seguro,
    superficie_ha,
    a_wkt,
)
from app.modelos import DELEGACIONES, ESTADOS, LECTURA, ArchivoGuardado, DocumentoSolicitud, Solicitud

router = APIRouter(prefix="/interno/v1", tags=["expediente"])

TRANSICIONES = {
    ("borrador", "enviada"): {"solicitante"},
    ("subsanacion", "enviada"): {"solicitante"},
    ("enviada", "recibida"): {"delegacion"},
    ("enviada", "subsanacion"): {"delegacion"},
    ("recibida", "subsanacion"): {"delegacion"},
    ("recibida", "remitida"): {"delegacion"},
    ("remitida", "dictaminada_juridico"): {"unidad_juridica"},
    ("dictaminada_juridico", "dictaminada_tecnico"): {"area_tecnica"},
    ("dictaminada_juridico", "resuelta"): {"comite"},
    ("dictaminada_tecnico", "resuelta"): {"comite"},
    ("resuelta", "formalizada"): {"administracion_finanzas"},
    ("formalizada", "seguimiento"): {"seguimiento"},
    ("formalizada", "cerrada"): {"seguimiento"},
    ("seguimiento", "cerrada"): {"seguimiento"},
    ("cerrada", "archivada"): {"seguimiento"},
}


class SolicitudEntrada(BaseModel):
    convocatoria_id: int
    programa: str
    nombre_solicitante: str
    nombre_beneficiario: str = ""
    identificacion: str = ""
    representacion_legal: str = ""
    municipio: str = ""
    delegacion: str


class SolicitudCambio(BaseModel):
    nombre_solicitante: str | None = None
    nombre_beneficiario: str | None = None
    identificacion: str | None = None
    representacion_legal: str | None = None
    municipio: str | None = None
    delegacion: str | None = None


class EstadoEntrada(BaseModel):
    estado: str
    fecha_limite_subsanacion: date | None = None


class PoligonoEntrada(BaseModel):
    vertices: list[dict]


def puede_ver(quien: dict, fila: Solicitud) -> bool:
    if quien["clase"] == "solicitante":
        return fila.cuenta_id == quien["id"]
    if quien["puesto"] == "delegacion":
        return fila.delegacion == quien["delegacion"]
    if quien["puesto"] == "gestion_documental":
        return fila.estado == "archivada"
    return quien["puesto"] in LECTURA


def exigir_vista(quien: dict, fila: Solicitud) -> None:
    if not puede_ver(quien, fila):
        raise HTTPException(status_code=403, detail="Este expediente no está en tu bandeja")


def serializar(fila: Solicitud) -> dict:
    return {
        "id": fila.id,
        "cuenta_id": fila.cuenta_id,
        "convocatoria_id": fila.convocatoria_id,
        "programa": fila.programa,
        "nombre_solicitante": fila.nombre_solicitante,
        "nombre_beneficiario": fila.nombre_beneficiario,
        "identificacion": fila.identificacion,
        "representacion_legal": fila.representacion_legal,
        "municipio": fila.municipio,
        "delegacion": fila.delegacion,
        "estado": fila.estado,
        "superficie_ha": fila.superficie_ha,
        "folio": fila.folio,
        "fecha_limite_subsanacion": fila.fecha_limite_subsanacion.isoformat() if fila.fecha_limite_subsanacion else None,
        "tiene_poligono": bool(fila.wkt),
        "documentos": [
            {"id": documento.id, "nombre": documento.nombre, "archivo_id": None, "creado_en": documento.creado_en.isoformat()}
            for documento in fila.documentos
        ],
    }


def cargar(db: Session, solicitud_id: int) -> Solicitud:
    fila = db.scalar(
        select(Solicitud).options(selectinload(Solicitud.documentos)).where(Solicitud.id == solicitud_id)
    )
    if fila is None:
        raise HTTPException(status_code=404, detail="La solicitud no existe")
    return fila


def guardar_geom(db: Session, fila: Solicitud, puntos: list[tuple[float, float]]) -> None:
    fila.wkt = a_wkt(puntos)
    fila.superficie_ha = superficie_ha(puntos)
    escribir_shapefile(fila.id, puntos)
    db.flush()
    db.execute(
        text("UPDATE solicitud SET geom = ST_GeomFromText(:wkt, 4326) WHERE id = :id"),
        {"wkt": fila.wkt, "id": fila.id},
    )


def guardar_bytes(solicitud_id: int | None, tipo: str, nombre: str, contenido: bytes) -> str:
    if solicitud_id is None:
        destino = Path(settings.archivos_dir) / "convocatorias"
        destino.mkdir(parents=True, exist_ok=True)
    else:
        destino = carpeta_solicitud(solicitud_id) / tipo
        destino.mkdir(parents=True, exist_ok=True)
    marca = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    ruta = destino / f"{marca}_{nombre_seguro(nombre)}"
    ruta.write_bytes(contenido)
    return str(ruta)


@router.get("/solicitudes")
def listar(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    filas = db.scalars(
        select(Solicitud).options(selectinload(Solicitud.documentos)).order_by(Solicitud.id.desc())
    ).all()
    return [serializar(fila) for fila in filas if puede_ver(quien, fila)]


@router.get("/conteos")
def conteos(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"uippe", "convocatorias", "coordinacion_delegaciones"})
    filas = db.scalars(select(Solicitud)).all()
    grupos: dict[str, int] = {}
    for fila in filas:
        clave = f"{fila.programa}|{fila.estado}"
        grupos[clave] = grupos.get(clave, 0) + 1
    return [{"programa": clave.split("|")[0], "estado": clave.split("|")[1], "total": total} for clave, total in grupos.items()]


@router.post("/solicitudes")
def crear(cuerpo: SolicitudEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"solicitante"})
    if cuerpo.delegacion not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    fila = Solicitud(
        cuenta_id=quien["id"],
        convocatoria_id=cuerpo.convocatoria_id,
        programa=cuerpo.programa,
        nombre_solicitante=cuerpo.nombre_solicitante.strip(),
        nombre_beneficiario=cuerpo.nombre_beneficiario.strip(),
        identificacion=cuerpo.identificacion.strip(),
        representacion_legal=cuerpo.representacion_legal.strip(),
        municipio=cuerpo.municipio.strip(),
        delegacion=cuerpo.delegacion,
    )
    db.add(fila)
    db.commit()
    return serializar(cargar(db, fila.id))


@router.get("/solicitudes/{solicitud_id}")
def detalle(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    fila = cargar(db, solicitud_id)
    exigir_vista(quien, fila)
    return serializar(fila)


@router.patch("/solicitudes/{solicitud_id}")
def cambiar(
    solicitud_id: int,
    cuerpo: SolicitudCambio,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = cargar(db, solicitud_id)
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"]:
        raise HTTPException(status_code=403, detail="Esta solicitud es de otra cuenta")
    if fila.estado not in {"borrador", "subsanacion"}:
        raise HTTPException(status_code=409, detail="La solicitud ya no se puede corregir")
    datos = cuerpo.model_dump(exclude_none=True)
    if "delegacion" in datos and datos["delegacion"] not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    for campo, valor in datos.items():
        setattr(fila, campo, valor.strip() if isinstance(valor, str) else valor)
    db.commit()
    return serializar(cargar(db, solicitud_id))


@router.post("/solicitudes/{solicitud_id}/estado")
def cambiar_estado(
    solicitud_id: int,
    cuerpo: EstadoEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = cargar(db, solicitud_id)
    if cuerpo.estado not in ESTADOS:
        raise HTTPException(status_code=422, detail="El estado no existe")
    permitidos = TRANSICIONES.get((fila.estado, cuerpo.estado))
    if permitidos is None:
        raise HTTPException(status_code=409, detail="Ese paso no sigue al estado actual")
    if quien["clase"] == "solicitante":
        if "solicitante" not in permitidos or fila.cuenta_id != quien["id"]:
            raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
    else:
        exige(quien, permitidos)
        if quien["puesto"] == "delegacion" and fila.delegacion != quien["delegacion"]:
            raise HTTPException(status_code=403, detail="La solicitud es de otra delegación")
    if cuerpo.estado == "enviada":
        if not fila.wkt or not fila.identificacion or not fila.municipio or not fila.nombre_solicitante:
            raise HTTPException(status_code=422, detail="Faltan el nombre, la identificación, el municipio o el polígono")
    if cuerpo.estado == "subsanacion" and cuerpo.fecha_limite_subsanacion is None:
        raise HTTPException(status_code=422, detail="La delegación escribe la fecha límite de subsanación")
    if cuerpo.estado == "recibida" and not fila.folio:
        fila.folio = f"EXP-{fila.id:06d}"
    if cuerpo.fecha_limite_subsanacion is not None:
        fila.fecha_limite_subsanacion = cuerpo.fecha_limite_subsanacion
    fila.estado = cuerpo.estado
    db.commit()
    return serializar(cargar(db, solicitud_id))


@router.post("/solicitudes/{solicitud_id}/documentos")
async def subir_documento(
    solicitud_id: int,
    nombre: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = cargar(db, solicitud_id)
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"] or fila.estado not in {"borrador", "subsanacion"}:
        raise HTTPException(status_code=403, detail="En este momento no puedes cambiar los documentos")
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    ruta = guardar_bytes(solicitud_id, "documentos", archivo.filename or nombre, contenido)
    documento = DocumentoSolicitud(solicitud_id=solicitud_id, nombre=nombre.strip(), ruta=ruta)
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return {"id": documento.id, "nombre": documento.nombre}


@router.post("/solicitudes/{solicitud_id}/poligono")
def guardar_poligono(
    solicitud_id: int,
    cuerpo: PoligonoEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = cargar(db, solicitud_id)
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"] or fila.estado not in {"borrador", "subsanacion"}:
        raise HTTPException(status_code=403, detail="En este momento no puedes cambiar el polígono")
    try:
        puntos = anillo(cuerpo.vertices)
        guardar_geom(db, fila, puntos)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit()
    return serializar(cargar(db, solicitud_id))


@router.post("/solicitudes/{solicitud_id}/shapefile")
async def subir_shapefile(
    solicitud_id: int,
    shp: UploadFile = File(...),
    shx: UploadFile = File(...),
    dbf: UploadFile = File(...),
    prj: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = cargar(db, solicitud_id)
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"] or fila.estado not in {"borrador", "subsanacion"}:
        raise HTTPException(status_code=403, detail="En este momento no puedes cambiar el polígono")
    try:
        puntos = leer_shapefile(await shp.read(), await shx.read(), await dbf.read())
        if puntos[0] != puntos[-1]:
            puntos.append(puntos[0])
        guardar_geom(db, fila, puntos)
        carpeta_solicitud(solicitud_id).joinpath("predio.prj").write_bytes(await prj.read())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit()
    return serializar(cargar(db, solicitud_id))


@router.post("/archivos")
async def subir_archivo(
    tipo: str = Form(...),
    nombre: str = Form(...),
    solicitud_id: int | None = Form(default=None),
    archivo: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    if quien["clase"] not in {"solicitante", "personal"}:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    ruta = guardar_bytes(solicitud_id, tipo, archivo.filename or nombre, contenido)
    guardado = ArchivoGuardado(solicitud_id=solicitud_id, tipo=tipo, nombre=nombre.strip(), ruta=ruta)
    db.add(guardado)
    db.commit()
    db.refresh(guardado)
    return {"id": guardado.id, "ruta": guardado.ruta, "nombre": guardado.nombre}


@router.get("/archivos/{archivo_id}")
def bajar_archivo(archivo_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    guardado = db.get(ArchivoGuardado, archivo_id)
    if guardado is None or not Path(guardado.ruta).is_file():
        raise HTTPException(status_code=404, detail="El archivo no está en la carpeta del expediente")
    if guardado.solicitud_id is not None:
        exigir_vista(quien, cargar(db, guardado.solicitud_id))
    return FileResponse(guardado.ruta, filename=guardado.nombre)


@router.get("/documentos/{documento_id}")
def bajar_documento(documento_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    documento = db.get(DocumentoSolicitud, documento_id)
    if documento is None or not Path(documento.ruta).is_file():
        raise HTTPException(status_code=404, detail="El documento no está en la carpeta del expediente")
    exigir_vista(quien, cargar(db, documento.solicitud_id))
    return FileResponse(documento.ruta, filename=documento.nombre)
