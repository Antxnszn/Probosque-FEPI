from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.actor import actor, exige
from app.archivos import borrar_carpeta, guardar, ruta_absoluta
from app.db import sesion
from app.modelos import PROGRAMAS, TIPOS_ANEXO, Anexo, Convocatoria, ConvocatoriaPrograma, DocumentoPedido

router = APIRouter(prefix="/interno/v1", tags=["convocatorias"])


class ConvocatoriaEntrada(BaseModel):
    titulo: str
    texto: str = ""
    vigencia_inicio: date
    vigencia_fin: date
    programas: list[str] = []
    documentos: list[str] = []


class ConvocatoriaCambio(BaseModel):
    titulo: str | None = None
    texto: str | None = None
    vigencia_inicio: date | None = None
    vigencia_fin: date | None = None
    programas: list[str] | None = None
    documentos: list[str] | None = None


def carga(db: Session, convocatoria_id: int) -> Convocatoria | None:
    return db.scalar(
        select(Convocatoria)
        .options(
            selectinload(Convocatoria.programas),
            selectinload(Convocatoria.documentos),
            selectinload(Convocatoria.anexos),
        )
        .where(Convocatoria.id == convocatoria_id)
    )


def serializar(fila: Convocatoria) -> dict:
    return {
        "id": fila.id,
        "titulo": fila.titulo,
        "texto": fila.texto,
        "vigencia_inicio": fila.vigencia_inicio.isoformat(),
        "vigencia_fin": fila.vigencia_fin.isoformat(),
        "estado": fila.estado,
        "tiene_pdf": bool(fila.ruta_pdf),
        "programas": [
            {"clave": item.programa, "nombre": PROGRAMAS.get(item.programa, item.programa)}
            for item in fila.programas
        ],
        "documentos": [documento.nombre for documento in fila.documentos],
        "creado_en": fila.creado_en.isoformat() if fila.creado_en else None,
        "creado_por": fila.creado_por,
        "modificado_en": fila.modificado_en.isoformat() if fila.modificado_en else None,
        "modificado_por": fila.modificado_por,
        "anexos": [
            {
                "id": anexo.id,
                "nombre": anexo.nombre,
                "tipo": anexo.tipo,
                "programa": anexo.programa,
                "nombre_programa": PROGRAMAS.get(anexo.programa) if anexo.programa else None,
            }
            for anexo in fila.anexos
        ],
    }


def administra(quien: dict) -> bool:
    return quien["clase"] == "personal" and quien["puesto"] == "convocatorias"


def visible(fila: Convocatoria, quien: dict) -> bool:
    if administra(quien) or quien.get("puesto") == "super_admin":
        return True
    return fila.estado == "publicada"


def marcar(fila: Convocatoria, quien: dict, alta: bool = False) -> None:
    if alta:
        fila.creado_por = quien["id"] or None
    fila.modificado_por = quien["id"] or None
    fila.modificado_en = datetime.utcnow()


def validar_fechas(inicio: date, fin: date) -> None:
    if fin < inicio:
        raise HTTPException(status_code=422, detail="El fin de la recepción es anterior al inicio")


def validar_programas(claves: list[str]) -> list[str]:
    limpias = []
    for clave in claves:
        if clave not in PROGRAMAS:
            raise HTTPException(status_code=422, detail="El programa no es uno de los cinco")
        if clave not in limpias:
            limpias.append(clave)
    return limpias


def reemplazar_programas(db: Session, fila: Convocatoria, claves: list[str]) -> None:
    limpias = validar_programas(claves)
    actuales = {anexo.programa for anexo in fila.anexos if anexo.programa}
    quitados = actuales - set(limpias)
    if quitados:
        raise HTTPException(status_code=422, detail="Hay un anexo del programa que quieres quitar")
    for item in list(fila.programas):
        db.delete(item)
    db.flush()
    for clave in limpias:
        db.add(ConvocatoriaPrograma(convocatoria_id=fila.id, programa=clave))


def reemplazar_documentos(db: Session, fila: Convocatoria, nombres: list[str]) -> None:
    for documento in list(fila.documentos):
        db.delete(documento)
    db.flush()
    vistos: list[str] = []
    for nombre in nombres:
        limpio = nombre.strip()
        if limpio and limpio not in vistos:
            vistos.append(limpio)
            db.add(DocumentoPedido(convocatoria_id=fila.id, nombre=limpio))


def exigir_visible(fila: Convocatoria | None, quien: dict) -> Convocatoria:
    if fila is None or not visible(fila, quien):
        raise HTTPException(status_code=404, detail="La convocatoria no existe")
    return fila


@router.get("/programas")
def programas():
    return [{"clave": clave, "nombre": nombre} for clave, nombre in PROGRAMAS.items()]


@router.get("/convocatorias")
def listar(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    filas = db.scalars(
        select(Convocatoria)
        .options(
            selectinload(Convocatoria.programas),
            selectinload(Convocatoria.documentos),
            selectinload(Convocatoria.anexos),
        )
        .order_by(Convocatoria.id.desc())
    ).all()
    return [serializar(fila) for fila in filas if visible(fila, quien)]


@router.post("/convocatorias")
def crear(cuerpo: ConvocatoriaEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"convocatorias"})
    titulo = cuerpo.titulo.strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="La convocatoria necesita un título")
    validar_fechas(cuerpo.vigencia_inicio, cuerpo.vigencia_fin)
    fila = Convocatoria(
        titulo=titulo,
        texto=cuerpo.texto.strip(),
        vigencia_inicio=cuerpo.vigencia_inicio,
        vigencia_fin=cuerpo.vigencia_fin,
    )
    db.add(fila)
    db.flush()
    reemplazar_programas(db, fila, cuerpo.programas)
    reemplazar_documentos(db, fila, cuerpo.documentos)
    marcar(fila, quien, alta=True)
    db.commit()
    return serializar(carga(db, fila.id))


@router.get("/convocatorias/{convocatoria_id}")
def detalle(convocatoria_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    return serializar(exigir_visible(carga(db, convocatoria_id), quien))


@router.patch("/convocatorias/{convocatoria_id}")
def cambiar(
    convocatoria_id: int,
    cuerpo: ConvocatoriaCambio,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    if cuerpo.titulo is not None:
        titulo = cuerpo.titulo.strip()
        if not titulo:
            raise HTTPException(status_code=422, detail="La convocatoria necesita un título")
        fila.titulo = titulo
    if cuerpo.texto is not None:
        fila.texto = cuerpo.texto.strip()
    inicio = cuerpo.vigencia_inicio or fila.vigencia_inicio
    fin = cuerpo.vigencia_fin or fila.vigencia_fin
    validar_fechas(inicio, fin)
    fila.vigencia_inicio = inicio
    fila.vigencia_fin = fin
    if cuerpo.programas is not None:
        reemplazar_programas(db, fila, cuerpo.programas)
    if cuerpo.documentos is not None:
        reemplazar_documentos(db, fila, cuerpo.documentos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.post("/convocatorias/{convocatoria_id}/publicar")
def publicar(convocatoria_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    if not fila.programas:
        raise HTTPException(status_code=422, detail="Elige al menos un programa antes de publicar")
    if not fila.ruta_pdf:
        raise HTTPException(status_code=422, detail="Falta el PDF de la convocatoria")
    if not fila.texto.strip():
        raise HTTPException(status_code=422, detail="Falta el texto de la convocatoria")
    if not fila.documentos:
        raise HTTPException(status_code=422, detail="Escribe al menos un documento que pedirá la solicitud")
    fila.estado = "publicada"
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.delete("/convocatorias/{convocatoria_id}")
def eliminar(convocatoria_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    if fila.estado != "borrador":
        raise HTTPException(status_code=409, detail="Una convocatoria publicada se conserva")
    borrar_carpeta(fila.id)
    db.delete(fila)
    db.commit()
    return {"eliminada": convocatoria_id}


@router.post("/convocatorias/{convocatoria_id}/pdf")
def subir_pdf(
    convocatoria_id: int,
    pdf: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    fila.ruta_pdf = guardar(fila.id, pdf, "convocatoria")
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.get("/convocatorias/{convocatoria_id}/pdf")
def bajar_pdf(convocatoria_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    if not fila.ruta_pdf:
        raise HTTPException(status_code=404, detail="Esta convocatoria no tiene PDF")
    return FileResponse(ruta_absoluta(fila.id, fila.ruta_pdf), filename="convocatoria.pdf")


@router.post("/convocatorias/{convocatoria_id}/anexos")
def subir_anexo(
    convocatoria_id: int,
    nombre: str = Form(...),
    tipo: str = Form(...),
    programa: str = Form(""),
    archivo: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    limpio = nombre.strip()
    if not limpio:
        raise HTTPException(status_code=422, detail="El anexo necesita un nombre")
    if tipo not in TIPOS_ANEXO:
        raise HTTPException(status_code=422, detail="El anexo es material de la convocatoria o un resultado publicado")
    clave = programa.strip() or None
    if clave is not None and clave not in {item.programa for item in fila.programas}:
        raise HTTPException(status_code=422, detail="El anexo tiene que ser de un programa de esta convocatoria")
    anexo = Anexo(
        convocatoria_id=fila.id,
        nombre=limpio,
        tipo=tipo,
        programa=clave,
        ruta=guardar(fila.id, archivo, "anexo"),
    )
    db.add(anexo)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.delete("/convocatorias/{convocatoria_id}/anexos/{anexo_id}")
def quitar_anexo(
    convocatoria_id: int,
    anexo_id: int,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    exige(quien, {"convocatorias"})
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    anexo = next((item for item in fila.anexos if item.id == anexo_id), None)
    if anexo is None:
        raise HTTPException(status_code=404, detail="El anexo no existe")
    try:
        ruta = ruta_absoluta(fila.id, anexo.ruta)
    except HTTPException:
        ruta = None
    db.delete(anexo)
    marcar(fila, quien)
    db.commit()
    if ruta is not None:
        ruta.unlink(missing_ok=True)
    return serializar(carga(db, fila.id))


@router.get("/convocatorias/{convocatoria_id}/anexos/{anexo_id}/archivo")
def bajar_anexo(
    convocatoria_id: int,
    anexo_id: int,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_visible(carga(db, convocatoria_id), quien)
    anexo = next((item for item in fila.anexos if item.id == anexo_id), None)
    if anexo is None:
        raise HTTPException(status_code=404, detail="El anexo no existe")
    return FileResponse(ruta_absoluta(fila.id, anexo.ruta), filename=f"anexo{Path(anexo.ruta).suffix}")
