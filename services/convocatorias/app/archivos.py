import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings

PERMITIDOS = {".pdf", ".doc", ".docx", ".odt", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".kml", ".kmz", ".zip"}
TOPE = 20 * 1024 * 1024


def carpeta(convocatoria_id: int) -> Path:
    destino = Path(settings.archivos_dir) / str(convocatoria_id)
    destino.mkdir(parents=True, exist_ok=True)
    return destino


def guardar(convocatoria_id: int, archivo: UploadFile, prefijo: str) -> str:
    nombre = archivo.filename or ""
    sufijo = Path(nombre).suffix.lower()
    if sufijo not in PERMITIDOS:
        raise HTTPException(status_code=422, detail="El archivo tiene que ser PDF, documento, hoja, imagen, KML o ZIP")
    contenido = archivo.file.read()
    if len(contenido) > TOPE:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    relativo = f"{prefijo}-{uuid4().hex}{sufijo}"
    (carpeta(convocatoria_id) / relativo).write_bytes(contenido)
    return relativo


def ruta_absoluta(convocatoria_id: int, relativo: str) -> Path:
    base = Path(settings.archivos_dir).resolve()
    destino = (base / str(convocatoria_id) / relativo).resolve()
    if base not in destino.parents:
        raise HTTPException(status_code=404, detail="El archivo no está")
    if not destino.is_file():
        raise HTTPException(status_code=404, detail="El archivo no está")
    return destino


def borrar_carpeta(convocatoria_id: int) -> None:
    destino = Path(settings.archivos_dir) / str(convocatoria_id)
    if destino.exists():
        shutil.rmtree(destino)
