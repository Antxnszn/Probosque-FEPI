import json

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

from app.config import settings
from app.convocatorias_proxy import cabeceras, empaquetar, poner_nombres
from app.modelos import Cuenta
from app.seguridad import cuenta_actual

router = APIRouter(prefix="/api/tramite/v1", tags=["solicitudes"])


def _solicitante(cuenta: Cuenta) -> None:
    if cuenta.clase != "solicitante":
        raise HTTPException(status_code=403, detail="Solo quien solicita puede modificar su solicitud")


async def pedir(
    method: str,
    ruta: str,
    cuenta: Cuenta | None,
    cuerpo: dict | None = None,
    archivos: list[tuple] | None = None,
) -> Response:
    try:
        async with httpx.AsyncClient(timeout=60) as cliente:
            opciones: dict = {"headers": cabeceras(cuenta)}
            if cuerpo is not None:
                opciones["json"] = cuerpo
            if archivos is not None:
                opciones["files"] = archivos
            respuesta = await cliente.request(method, f"{settings.expediente_digital_url}{ruta}", **opciones)
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=503, content={"detail": f"Expediente digital no responde: {exc.__class__.__name__}"})
    tipo = respuesta.headers.get("content-type", "")
    if "application/json" in tipo:
        datos = respuesta.json()
        if respuesta.status_code < 300:
            datos = poner_nombres(datos)
        return JSONResponse(status_code=respuesta.status_code, content=datos)
    cabecera = {}
    if respuesta.headers.get("content-disposition"):
        cabecera["content-disposition"] = respuesta.headers["content-disposition"]
    return Response(content=respuesta.content, status_code=respuesta.status_code, media_type=tipo, headers=cabecera)


async def convocatoria_abierta(convocatoria_id: int, programa: str, cuenta: Cuenta) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=30) as cliente:
            respuesta = await cliente.get(
                f"{settings.convocatorias_url}/interno/v1/convocatorias/{convocatoria_id}",
                headers=cabeceras(cuenta),
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Convocatorias no responde") from exc
    if respuesta.status_code != 200:
        raise HTTPException(status_code=404, detail="La convocatoria no está publicada")
    fila = respuesta.json()
    from app.convocatorias_proxy import aplicar_lectura

    aplicar_lectura(fila)
    if fila.get("estado") != "publicada" or fila.get("lectura") != "Recepción abierta":
        raise HTTPException(status_code=422, detail="La recepción de esta convocatoria no está abierta")
    claves = {item["clave"] for item in fila.get("programas", [])}
    if programa not in claves:
        raise HTTPException(status_code=422, detail="Ese programa no está en la convocatoria")
    return list(fila.get("documentos") or [])


@router.get("/solicitudes")
async def listar(cuenta: Cuenta = Depends(cuenta_actual)):
    return await pedir("GET", "/interno/v1/solicitudes", cuenta)


@router.post("/solicitudes")
async def crear(cuerpo: dict, cuenta: Cuenta = Depends(cuenta_actual)):
    _solicitante(cuenta)
    await convocatoria_abierta(int(cuerpo.get("convocatoria_id") or 0), str(cuerpo.get("programa") or ""), cuenta)
    return await pedir("POST", "/interno/v1/solicitudes", cuenta, cuerpo)


@router.get("/solicitudes/{solicitud_id}")
async def detalle(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    return await pedir("GET", f"/interno/v1/solicitudes/{solicitud_id}", cuenta)


@router.patch("/solicitudes/{solicitud_id}")
async def cambiar(solicitud_id: int, cuerpo: dict, cuenta: Cuenta = Depends(cuenta_actual)):
    _solicitante(cuenta)
    await convocatoria_abierta(int(cuerpo.get("convocatoria_id") or 0), str(cuerpo.get("programa") or ""), cuenta)
    return await pedir("PATCH", f"/interno/v1/solicitudes/{solicitud_id}", cuenta, cuerpo)


@router.post("/solicitudes/{solicitud_id}/archivos")
async def subir(
    solicitud_id: int,
    clase: str = Form(...),
    nombre: str = Form(""),
    persona_id: int = Form(0),
    archivo: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    _solicitante(cuenta)
    campo, carga = await empaquetar(archivo, "archivo")
    return await pedir(
        "POST",
        f"/interno/v1/solicitudes/{solicitud_id}/archivos",
        cuenta,
        archivos=[
            ("clase", (None, clase)),
            ("nombre", (None, nombre)),
            ("persona_id", (None, str(persona_id))),
            (campo, carga),
        ],
    )


@router.get("/solicitudes/{solicitud_id}/archivos/{archivo_id}")
async def bajar(solicitud_id: int, archivo_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    return await pedir("GET", f"/interno/v1/solicitudes/{solicitud_id}/archivos/{archivo_id}", cuenta)


@router.post("/solicitudes/{solicitud_id}/poligono")
async def poligono(solicitud_id: int, cuerpo: dict, cuenta: Cuenta = Depends(cuenta_actual)):
    _solicitante(cuenta)
    return await pedir("POST", f"/interno/v1/solicitudes/{solicitud_id}/poligono", cuenta, cuerpo)


@router.post("/solicitudes/{solicitud_id}/shapefile")
async def shapefile(
    solicitud_id: int,
    shp: UploadFile = File(...),
    shx: UploadFile = File(...),
    dbf: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    _solicitante(cuenta)
    return await pedir(
        "POST",
        f"/interno/v1/solicitudes/{solicitud_id}/shapefile",
        cuenta,
        archivos=[
            await empaquetar(shp, "shp"),
            await empaquetar(shx, "shx"),
            await empaquetar(dbf, "dbf"),
        ],
    )


@router.post("/solicitudes/{solicitud_id}/enviar")
async def enviar(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    _solicitante(cuenta)
    actual = await pedir("GET", f"/interno/v1/solicitudes/{solicitud_id}", cuenta)
    if actual.status_code != 200:
        return actual
    datos = json.loads(actual.body)
    documentos = await convocatoria_abierta(datos["convocatoria_id"], datos["programa"], cuenta)
    return await pedir(
        "POST",
        f"/interno/v1/solicitudes/{solicitud_id}/enviar",
        cuenta,
        {"documentos": documentos},
    )
