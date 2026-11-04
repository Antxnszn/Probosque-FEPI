from fastapi import FastAPI
from fastapi.responses import JSONResponse
from redis import Redis
from redis.exceptions import RedisError

from app.config import settings
from app.negocio import router as negocio_router

app = FastAPI(
    title=settings.nombre,
    version="0.1.0",
    description="REQ-01. Publicación y consulta de convocatorias.",
)
app.include_router(negocio_router)


def estado_bus() -> str:
    try:
        cliente = Redis.from_url(settings.redis_url, socket_connect_timeout=0.5)
        cliente.ping()
        return "disponible"
    except RedisError:
        return "no_disponible"


@app.get("/health", tags=["sistema"])
async def health():
    return {
        "estado": "disponible",
        "servicio": settings.servicio,
        "requisito": settings.requisito,
        "nombre": settings.nombre,
        "bus": estado_bus(),
    }


@app.api_route("/api/convocatorias/v1/pendiente", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["negocio"])
async def pendiente():
    return JSONResponse(
        status_code=501,
        content={
            "codigo": "PENDIENTE",
            "servicio": settings.servicio,
            "requisito": settings.requisito,
            "mensaje": "La operación de este servicio todavía no está implementada.",
        },
    )


@app.post("/interno/v1/bus/eco", tags=["bus"])
async def eco_bus():
    canal = "fepi.bus.convocatorias"
    try:
        cliente = Redis.from_url(settings.redis_url, socket_connect_timeout=0.5)
        identificador = cliente.xadd(canal, {"origen": settings.servicio, "tipo": "prueba"})
        reciente = cliente.xrevrange(canal, count=1)
    except RedisError as exc:
        return JSONResponse(
            status_code=503,
            content={"codigo": "BUS_NO_DISPONIBLE", "servicio": settings.servicio, "detalle": str(exc)},
        )
    leido = reciente[0][0].decode() if reciente else None
    publicado = identificador.decode()
    return {
        "servicio": settings.servicio,
        "canal": canal,
        "publicado": publicado,
        "leido": leido,
        "ida_y_vuelta": publicado == leido,
    }
