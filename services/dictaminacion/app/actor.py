from fastapi import Header, HTTPException

from app.config import settings


def actor(
    x_interno: str = Header(default=""),
    x_usuario_id: str = Header(default="0"),
    x_clase: str = Header(default=""),
    x_puesto: str = Header(default=""),
    x_delegacion: str = Header(default=""),
) -> dict:
    if x_interno != settings.interno_token:
        raise HTTPException(status_code=401, detail="Llamada interna rechazada")
    return {
        "id": int(x_usuario_id or 0),
        "clase": x_clase,
        "puesto": x_puesto,
        "delegacion": x_delegacion,
    }


def exige(quien: dict, puestos: set[str]) -> None:
    if quien["clase"] != "personal" or quien["puesto"] not in puestos:
        raise HTTPException(status_code=403, detail="Este puesto no puede hacer esa operación")
