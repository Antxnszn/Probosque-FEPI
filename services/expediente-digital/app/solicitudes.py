from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.actor import actor, exige
from app.db import sesion
from app.geometria import a_wkt, anillo, carpeta_solicitud, escribir_shapefile, leer_shapefile, superficie_ha
from app.modelos import DELEGACIONES, DocumentoSolicitud, PersonaSolicitud, Solicitud

router = APIRouter(prefix="/interno/v1", tags=["solicitudes"])

TIPOS = {"persona_fisica", "persona_juridica", "nucleo_agrario"}
IDENTIFICACIONES = {"ine", "pasaporte", "otra"}
PAPELES = {
    "titular",
    "segunda",
    "apoderado",
    "presidencia",
    "secretaria",
    "tesoreria",
    "otorgante",
    "representante",
    "testigo_1",
    "testigo_2",
}
CARTA = {"otorgante", "representante", "testigo_1", "testigo_2"}
OBLIGADOS = {
    "persona_fisica": {"titular", "segunda"},
    "persona_juridica": {"titular", "apoderado", "segunda"},
    "nucleo_agrario": {"titular", "presidencia", "secretaria", "tesoreria", "segunda"},
}
CONSULTA = {"convocatorias", "coordinacion_delegaciones", "super_admin"}


class PersonaEntrada(BaseModel):
    papel: str
    nombre: str
    tipo_identificacion: str = ""
    sin_domicilio: bool = False


class SolicitudEntrada(BaseModel):
    convocatoria_id: int
    programa: str
    tipo: str
    municipio: str
    delegacion: str
    personas: list[PersonaEntrada]


class PoligonoEntrada(BaseModel):
    vertices: list[dict]


class EnvioEntrada(BaseModel):
    documentos: list[str] = []


def carga(db: Session, solicitud_id: int) -> Solicitud | None:
    return db.scalar(
        select(Solicitud)
        .options(selectinload(Solicitud.personas), selectinload(Solicitud.documentos))
        .where(Solicitud.id == solicitud_id)
    )


def serializar(fila: Solicitud) -> dict:
    return {
        "id": fila.id,
        "cuenta_id": fila.cuenta_id,
        "convocatoria_id": fila.convocatoria_id,
        "programa": fila.programa,
        "tipo": fila.tipo,
        "municipio": fila.municipio,
        "delegacion": fila.delegacion,
        "estado": fila.estado,
        "superficie_ha": fila.superficie_ha,
        "tiene_poligono": bool(fila.wkt),
        "creado_en": fila.creado_en.isoformat() if fila.creado_en else None,
        "modificado_en": fila.modificado_en.isoformat() if fila.modificado_en else None,
        "modificado_por": fila.modificado_por,
        "personas": [
            {
                "id": persona.id,
                "papel": persona.papel,
                "nombre": persona.nombre,
                "tipo_identificacion": persona.tipo_identificacion,
                "sin_domicilio": persona.sin_domicilio,
            }
            for persona in fila.personas
        ],
        "archivos": [
            {
                "id": archivo.id,
                "clase": archivo.clase,
                "nombre": archivo.nombre,
                "persona_id": archivo.persona_id,
            }
            for archivo in fila.documentos
        ],
    }


def puede_ver(fila: Solicitud, quien: dict) -> bool:
    if quien["clase"] == "solicitante":
        return fila.cuenta_id == quien["id"]
    if quien["puesto"] == "delegacion":
        return fila.estado == "enviada" and fila.delegacion == quien["delegacion"]
    if quien["puesto"] in CONSULTA:
        return True if quien["puesto"] == "super_admin" else fila.estado == "enviada"
    return False


def exigir_vista(fila: Solicitud | None, quien: dict) -> Solicitud:
    if fila is None or not puede_ver(fila, quien):
        raise HTTPException(status_code=404, detail="La solicitud no existe")
    return fila


def exigir_borrador(fila: Solicitud, quien: dict) -> None:
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"] or fila.estado != "borrador":
        raise HTTPException(status_code=409, detail="Esta solicitud ya no se puede modificar")


def marcar(fila: Solicitud, quien: dict) -> None:
    fila.modificado_en = datetime.utcnow()
    fila.modificado_por = quien["id"] or None


def guardar_pdf(solicitud_id: int, archivo: UploadFile) -> tuple[str, str]:
    nombre = archivo.filename or "archivo.pdf"
    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="El archivo tiene que ser PDF")
    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    relativo = f"{uuid4().hex}.pdf"
    (carpeta_solicitud(solicitud_id) / relativo).write_bytes(contenido)
    return relativo, nombre


@router.get("/solicitudes")
def listar(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    filas = db.scalars(
        select(Solicitud)
        .options(selectinload(Solicitud.personas), selectinload(Solicitud.documentos))
        .order_by(Solicitud.id.desc())
    ).all()
    return [serializar(fila) for fila in filas if puede_ver(fila, quien)]


@router.post("/solicitudes")
def crear(cuerpo: SolicitudEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"solicitante"})
    if cuerpo.tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="El tipo de solicitante no existe")
    if cuerpo.delegacion not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    fila = Solicitud(
        cuenta_id=quien["id"],
        convocatoria_id=cuerpo.convocatoria_id,
        programa=cuerpo.programa,
        nombre_solicitante=next((persona.nombre.strip() for persona in cuerpo.personas if persona.papel == "titular" and persona.nombre.strip()), "") or "Borrador",
        municipio=cuerpo.municipio.strip(),
        delegacion=cuerpo.delegacion,
        tipo=cuerpo.tipo,
        modificado_por=quien["id"],
        modificado_en=datetime.utcnow(),
    )
    db.add(fila)
    db.flush()
    _guardar_personas(db, fila, cuerpo.personas)
    db.commit()
    return serializar(carga(db, fila.id))


def _guardar_personas(db: Session, fila: Solicitud, personas: list[PersonaEntrada]) -> None:
    actuales = {persona.papel: persona for persona in fila.personas}
    vistos: set[str] = set()
    for persona in personas:
        if persona.papel not in PAPELES:
            raise HTTPException(status_code=422, detail="El papel de la persona no existe")
        if persona.papel in vistos:
            raise HTTPException(status_code=422, detail="Ese papel ya está en la solicitud")
        nombre = persona.nombre.strip()
        if not nombre:
            continue
        vistos.add(persona.papel)
        if persona.tipo_identificacion and persona.tipo_identificacion not in IDENTIFICACIONES:
            raise HTTPException(status_code=422, detail="La identificación es INE, pasaporte u otra oficial con fotografía")
        existente = actuales.get(persona.papel)
        if existente is None:
            db.add(
                PersonaSolicitud(
                    solicitud_id=fila.id,
                    papel=persona.papel,
                    nombre=nombre,
                    tipo_identificacion=persona.tipo_identificacion,
                    sin_domicilio=persona.sin_domicilio,
                )
            )
            continue
        existente.nombre = nombre
        existente.tipo_identificacion = persona.tipo_identificacion
        existente.sin_domicilio = persona.sin_domicilio
    for papel, existente in actuales.items():
        if papel not in vistos:
            db.delete(existente)


@router.get("/solicitudes/{solicitud_id}")
def detalle(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    return serializar(exigir_vista(carga(db, solicitud_id), quien))


@router.patch("/solicitudes/{solicitud_id}")
def cambiar(
    solicitud_id: int,
    cuerpo: SolicitudEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    if cuerpo.tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="El tipo de solicitante no existe")
    if cuerpo.delegacion not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    fila.tipo = cuerpo.tipo
    fila.nombre_solicitante = next((persona.nombre.strip() for persona in cuerpo.personas if persona.papel == "titular" and persona.nombre.strip()), "") or "Borrador"
    fila.municipio = cuerpo.municipio.strip()
    fila.delegacion = cuerpo.delegacion
    fila.programa = cuerpo.programa
    fila.convocatoria_id = cuerpo.convocatoria_id
    _guardar_personas(db, fila, cuerpo.personas)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.post("/solicitudes/{solicitud_id}/archivos")
def subir(
    solicitud_id: int,
    clase: str = Form(...),
    nombre: str = Form(""),
    persona_id: int = Form(0),
    archivo: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    if clase not in {
        "identificacion",
        "curp",
        "comprobante",
        "acta_constitutiva",
        "acta_eleccion",
        "acta_predio",
        "carta_poder",
        "tenencia",
        "pedido",
    }:
        raise HTTPException(status_code=422, detail="Ese documento no forma parte de la solicitud")
    if persona_id and persona_id not in {persona.id for persona in fila.personas}:
        raise HTTPException(status_code=422, detail="La persona no está en la solicitud")
    ruta, original = guardar_pdf(fila.id, archivo)
    db.add(
        DocumentoSolicitud(
            solicitud_id=fila.id,
            clase=clase,
            nombre=(nombre or original).strip(),
            persona_id=persona_id or None,
            subido_por=quien["id"],
            ruta=ruta,
        )
    )
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.get("/solicitudes/{solicitud_id}/archivos/{archivo_id}")
def bajar(solicitud_id: int, archivo_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    archivo = next((item for item in fila.documentos if item.id == archivo_id), None)
    if archivo is None:
        raise HTTPException(status_code=404, detail="El archivo no está")
    return FileResponse(carpeta_solicitud(fila.id) / archivo.ruta, filename="documento.pdf")


@router.post("/solicitudes/{solicitud_id}/poligono")
def poligono(
    solicitud_id: int,
    cuerpo: PoligonoEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    try:
        puntos = anillo(cuerpo.vertices)
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="El predio se dibuja con al menos tres puntos") from exc
    _aplicar_predio(db, fila, puntos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


def _aplicar_predio(db: Session, fila: Solicitud, puntos: list[tuple[float, float]]) -> None:
    for lon, lat in puntos:
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise HTTPException(status_code=422, detail="El predio tiene que venir en coordenadas geográficas, en grados")
    fila.wkt = a_wkt(puntos)
    fila.superficie_ha = superficie_ha(puntos)
    escribir_shapefile(fila.id, puntos)
    db.execute(
        text("UPDATE solicitud SET geom = ST_GeomFromText(:wkt, 4326) WHERE id = :id"),
        {"wkt": fila.wkt, "id": fila.id},
    )


def _bytes_shape(archivo: UploadFile, extension: str) -> bytes:
    nombre = (archivo.filename or "").lower()
    if not nombre.endswith(extension):
        raise HTTPException(status_code=422, detail=f"Falta el archivo {extension}")
    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    return contenido


@router.post("/solicitudes/{solicitud_id}/shapefile")
def shapefile(
    solicitud_id: int,
    shp: UploadFile = File(...),
    shx: UploadFile = File(...),
    dbf: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    try:
        puntos = leer_shapefile(_bytes_shape(shp, ".shp"), _bytes_shape(shx, ".shx"), _bytes_shape(dbf, ".dbf"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    _aplicar_predio(db, fila, puntos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


def _tiene(fila: Solicitud, clase: str, persona_id: int | None = None, nombre: str = "") -> bool:
    for archivo in fila.documentos:
        if archivo.clase != clase:
            continue
        if persona_id is not None and archivo.persona_id != persona_id:
            continue
        if nombre and archivo.nombre != nombre:
            continue
        return True
    return False


@router.post("/solicitudes/{solicitud_id}/enviar")
def enviar(
    solicitud_id: int,
    cuerpo: EnvioEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    papeles = {persona.papel: persona for persona in fila.personas}
    faltan = OBLIGADOS[fila.tipo] - set(papeles)
    if faltan:
        raise HTTPException(status_code=422, detail="Faltan personas de la solicitud")
    if fila.tipo == "nucleo_agrario":
        oficiales = {papeles[papel].nombre.strip().lower() for papel in ("presidencia", "secretaria", "tesoreria")}
        if papeles["segunda"].nombre.strip().lower() not in oficiales:
            raise HTTPException(
                status_code=422,
                detail="En un núcleo agrario la segunda persona beneficiaria es del comisariado",
            )
    carta = CARTA & set(papeles)
    if carta and carta != CARTA:
        raise HTTPException(status_code=422, detail="La carta poder necesita otorgante, apoderado y dos testigos")
    if carta == CARTA and not _tiene(fila, "carta_poder"):
        raise HTTPException(status_code=422, detail="Falta el PDF de la carta poder")
    for papel, persona in papeles.items():
        if fila.tipo != "persona_fisica" and papel == "titular":
            continue
        if not persona.tipo_identificacion:
            raise HTTPException(status_code=422, detail=f"Falta el tipo de identificación de {persona.nombre}")
        if not _tiene(fila, "identificacion", persona.id):
            raise HTTPException(status_code=422, detail=f"Falta la identificación de {persona.nombre}")
        if not _tiene(fila, "curp", persona.id):
            raise HTTPException(status_code=422, detail=f"Falta la CURP de {persona.nombre}")
        if persona.sin_domicilio and not _tiene(fila, "comprobante", persona.id):
            raise HTTPException(status_code=422, detail=f"Falta el comprobante de domicilio de {persona.nombre}")
    if fila.tipo == "persona_juridica" and not _tiene(fila, "acta_constitutiva"):
        raise HTTPException(status_code=422, detail="Falta el acta constitutiva o los estatutos")
    if fila.tipo == "nucleo_agrario" and not (_tiene(fila, "acta_eleccion") and _tiene(fila, "acta_predio")):
        raise HTTPException(status_code=422, detail="Faltan las actas del núcleo agrario")
    if not _tiene(fila, "tenencia"):
        raise HTTPException(status_code=422, detail="Falta la acreditación de propiedad o posesión")
    if not fila.wkt:
        raise HTTPException(status_code=422, detail="Falta dibujar el predio")
    for nombre in cuerpo.documentos:
        if not _tiene(fila, "pedido", nombre=nombre):
            raise HTTPException(status_code=422, detail=f"Falta el documento {nombre}")
    fila.estado = "enviada"
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))
