from datetime import date

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.modelos import Cuenta
from app.seguridad import cuenta_actual, cuenta_opcional, exigir

router = APIRouter(prefix="/api/tramite/v1", tags=["convocatorias"])


def cabeceras(cuenta: Cuenta | None) -> dict[str, str]:
    return {
        "X-Interno": settings.interno_token,
        "X-Usuario-Id": str(cuenta.id if cuenta else 0),
        "X-Clase": cuenta.clase if cuenta else "",
        "X-Puesto": cuenta.puesto or "" if cuenta else "",
        "X-Delegacion": cuenta.delegacion or "" if cuenta else "",
    }


def hoy() -> date:
    return settings.fecha_operacion or date.today()


def aplicar_lectura(fila: dict) -> dict:
    inicio = date.fromisoformat(fila["vigencia_inicio"])
    fin = date.fromisoformat(fila["vigencia_fin"])
    dia = hoy()
    if fila["estado"] == "borrador":
        fila["lectura"] = "Borrador"
    elif dia < inicio:
        fila["lectura"] = "Recepción próxima"
    elif dia > fin:
        fila["lectura"] = "Recepción cerrada"
    else:
        fila["lectura"] = "Recepción abierta"
    return fila


def poner_nombres(datos):
    filas = datos if isinstance(datos, list) else [datos] if isinstance(datos, dict) else []
    ids = {
        fila.get(clave)
        for fila in filas
        if isinstance(fila, dict)
        for clave in ("creado_por", "modificado_por", "cuenta_id")
        if fila.get(clave)
    }
    nombres: dict[int, str] = {}
    if ids:
        db = SessionLocal()
        try:
            cuentas = db.scalars(select(Cuenta).where(Cuenta.id.in_(ids))).all()
            nombres = {cuenta.id: cuenta.nombre for cuenta in cuentas}
        finally:
            db.close()
    for fila in filas:
        if not isinstance(fila, dict):
            continue
        if fila.get("cuenta_id"):
            fila["cuenta_nombre"] = nombres.get(fila["cuenta_id"], "")
        if "creado_por" in fila:
            fila["creado_por_nombre"] = nombres.get(fila.get("creado_por") or 0, "")
        if "modificado_por" in fila:
            fila["modificado_por_nombre"] = nombres.get(fila.get("modificado_por") or 0, "")
    return datos


def con_lectura(datos):
    if isinstance(datos, list):
        return [aplicar_lectura(fila) for fila in datos]
    if isinstance(datos, dict) and "vigencia_inicio" in datos:
        return aplicar_lectura(datos)
    return datos


async def reenviar(
    method: str,
    ruta: str,
    cuenta: Cuenta | None,
    cuerpo: dict | None = None,
    archivos: list[tuple] | None = None,
    params: dict | None = None,
) -> Response:
    try:
        async with httpx.AsyncClient(timeout=60) as cliente:
            opciones: dict = {"headers": cabeceras(cuenta)}
            if cuerpo is not None:
                opciones["json"] = cuerpo
            if archivos is not None:
                opciones["files"] = archivos
            if params is not None:
                opciones["params"] = params
            respuesta = await cliente.request(method, f"{settings.convocatorias_url}{ruta}", **opciones)
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=503, content={"detail": f"Convocatorias no responde: {exc.__class__.__name__}"})
    tipo = respuesta.headers.get("content-type", "")
    if "application/json" in tipo:
        datos = respuesta.json()
        if respuesta.status_code < 300:
            datos = poner_nombres(con_lectura(datos))
        return JSONResponse(status_code=respuesta.status_code, content=datos)
    cabecera = {}
    if respuesta.headers.get("content-disposition"):
        cabecera["content-disposition"] = respuesta.headers["content-disposition"]
    return Response(content=respuesta.content, status_code=respuesta.status_code, media_type=tipo, headers=cabecera)


async def empaquetar(subida: UploadFile, campo: str) -> tuple:
    contenido = await subida.read()
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    return campo, (subida.filename or campo, contenido, subida.content_type or "application/octet-stream")


@router.get("/programas")
async def programas(cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await reenviar("GET", "/interno/v1/programas", cuenta)


@router.get("/convocatorias")
async def listar(cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await reenviar("GET", "/interno/v1/convocatorias", cuenta)


@router.post("/convocatorias")
async def crear(cuerpo: dict, cuenta: Cuenta = Depends(cuenta_actual)):
    exigir(cuenta, {"convocatorias"})
    return await reenviar("POST", "/interno/v1/convocatorias", cuenta, cuerpo)


@router.get("/convocatorias/{convocatoria_id}")
async def detalle(convocatoria_id: int, cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await reenviar("GET", f"/interno/v1/convocatorias/{convocatoria_id}", cuenta)


@router.patch("/convocatorias/{convocatoria_id}")
async def cambiar(convocatoria_id: int, cuerpo: dict, cuenta: Cuenta = Depends(cuenta_actual)):
    exigir(cuenta, {"convocatorias"})
    return await reenviar("PATCH", f"/interno/v1/convocatorias/{convocatoria_id}", cuenta, cuerpo)


@router.post("/convocatorias/{convocatoria_id}/publicar")
async def publicar(convocatoria_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    exigir(cuenta, {"convocatorias"})
    return await reenviar("POST", f"/interno/v1/convocatorias/{convocatoria_id}/publicar", cuenta)


@router.delete("/convocatorias/{convocatoria_id}")
async def eliminar(convocatoria_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    exigir(cuenta, {"convocatorias"})
    return await reenviar("DELETE", f"/interno/v1/convocatorias/{convocatoria_id}", cuenta)


@router.post("/convocatorias/{convocatoria_id}/pdf")
async def subir_pdf(
    convocatoria_id: int,
    pdf: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    exigir(cuenta, {"convocatorias"})
    return await reenviar(
        "POST",
        f"/interno/v1/convocatorias/{convocatoria_id}/pdf",
        cuenta,
        archivos=[await empaquetar(pdf, "pdf")],
    )


@router.get("/convocatorias/{convocatoria_id}/pdf")
async def bajar_pdf(convocatoria_id: int, cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await reenviar("GET", f"/interno/v1/convocatorias/{convocatoria_id}/pdf", cuenta)


@router.post("/convocatorias/{convocatoria_id}/anexos")
async def subir_anexo(
    convocatoria_id: int,
    nombre: str = Form(...),
    tipo: str = Form(...),
    programa: str = Form(""),
    archivo: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    exigir(cuenta, {"convocatorias"})
    campo, carga = await empaquetar(archivo, "archivo")
    return await reenviar(
        "POST",
        f"/interno/v1/convocatorias/{convocatoria_id}/anexos",
        cuenta,
        archivos=[
            ("nombre", (None, nombre)),
            ("tipo", (None, tipo)),
            ("programa", (None, programa)),
            (campo, carga),
        ],
    )


@router.delete("/convocatorias/{convocatoria_id}/anexos/{anexo_id}")
async def quitar_anexo(convocatoria_id: int, anexo_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    exigir(cuenta, {"convocatorias"})
    return await reenviar("DELETE", f"/interno/v1/convocatorias/{convocatoria_id}/anexos/{anexo_id}", cuenta)


@router.get("/convocatorias/{convocatoria_id}/anexos/{anexo_id}/archivo")
async def bajar_anexo(convocatoria_id: int, anexo_id: int, cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await reenviar("GET", f"/interno/v1/convocatorias/{convocatoria_id}/anexos/{anexo_id}/archivo", cuenta)
