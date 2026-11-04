import httpx
from fastapi import HTTPException

from app.config import settings
from app.modelos import Cuenta


def headers(cuenta: Cuenta) -> dict[str, str]:
    return {
        "X-Interno": settings.interno_token,
        "X-Usuario-Id": str(cuenta.id),
        "X-Clase": cuenta.clase,
        "X-Puesto": cuenta.puesto or "",
        "X-Delegacion": cuenta.delegacion or "",
    }


async def pedir(
    metodo: str,
    url: str,
    cuenta: Cuenta | None,
    json: dict | None = None,
    archivos=None,
    datos: dict | None = None,
):
    cabeceras = headers(cuenta) if cuenta is not None else {
        "X-Interno": settings.interno_token,
        "X-Usuario-Id": "0",
        "X-Clase": "solicitante",
        "X-Puesto": "",
        "X-Delegacion": "",
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as cliente:
            respuesta = await cliente.request(
                metodo,
                url,
                headers=cabeceras,
                json=json,
                files=archivos,
                data=datos,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="El servicio del trámite no respondió") from exc
    if respuesta.status_code >= 400:
        detalle = respuesta.text
        try:
            detalle = respuesta.json().get("detail", detalle)
        except Exception:
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)
    if not respuesta.content:
        return {}
    content_type = respuesta.headers.get("content-type", "")
    if "application/json" not in content_type:
        return respuesta
    return respuesta.json()
