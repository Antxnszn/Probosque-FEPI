import math
import re
from pathlib import Path

import shapefile

from app.config import settings

PRJ_WGS84 = (
    'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],'
    'PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]'
)


def carpeta_solicitud(solicitud_id: int) -> Path:
    destino = Path(settings.archivos_dir) / "solicitudes" / str(solicitud_id)
    destino.mkdir(parents=True, exist_ok=True)
    return destino


def nombre_seguro(nombre: str) -> str:
    limpio = re.sub(r"[^A-Za-z0-9._-]+", "_", nombre).strip("._")
    return (limpio or "archivo")[:80]


def anillo(vertices: list[dict]) -> list[tuple[float, float]]:
    puntos = [(float(vertice["lng"]), float(vertice["lat"])) for vertice in vertices]
    if len(puntos) < 3:
        raise ValueError("El polígono necesita al menos tres vértices")
    if puntos[0] != puntos[-1]:
        puntos.append(puntos[0])
    return puntos


def superficie_ha(puntos: list[tuple[float, float]]) -> float:
    latitud = sum(lat for _, lat in puntos) / len(puntos)
    metros_lon = 111_320 * math.cos(math.radians(latitud))
    metros_lat = 111_320
    planos = [(lon * metros_lon, lat * metros_lat) for lon, lat in puntos]
    area = 0.0
    for indice, (x, y) in enumerate(planos):
        siguiente_x, siguiente_y = planos[(indice + 1) % len(planos)]
        area += x * siguiente_y - siguiente_x * y
    return round(abs(area) / 2 / 10_000, 4)


def a_wkt(puntos: list[tuple[float, float]]) -> str:
    texto = ", ".join(f"{lon} {lat}" for lon, lat in puntos)
    return f"POLYGON(({texto}))"


def escribir_shapefile(solicitud_id: int, puntos: list[tuple[float, float]]) -> str:
    destino = carpeta_solicitud(solicitud_id) / "predio"
    with shapefile.Writer(str(destino), shapeType=shapefile.POLYGON) as escritor:
        escritor.field("solicitud", "N", 10, 0)
        escritor.poly([puntos])
        escritor.record(solicitud_id)
    destino.with_suffix(".prj").write_text(PRJ_WGS84, encoding="utf-8")
    return str(destino.with_suffix(".shp"))


def leer_shapefile(shp: bytes, shx: bytes, dbf: bytes) -> list[tuple[float, float]]:
    import io

    with shapefile.Reader(shp=io.BytesIO(shp), shx=io.BytesIO(shx), dbf=io.BytesIO(dbf)) as lector:
        formas = lector.shapes()
        if not formas or not formas[0].points:
            raise ValueError("El shapefile no trae geometría")
        forma = formas[0]
        corte = forma.parts[1] if len(forma.parts) > 1 else len(forma.points)
        puntos = [(float(x), float(y)) for x, y in forma.points[:corte]]
    if len(puntos) < 4:
        raise ValueError("El shapefile no trae un polígono")
    return puntos
