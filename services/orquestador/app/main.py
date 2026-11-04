from datetime import date

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis import Redis
from redis.exceptions import RedisError

from app.config import settings
from app.convocatorias_proxy import router as convocatorias_router
from app.solicitudes_proxy import router as solicitudes_router
from app.tramite import router as tramite_router

app = FastAPI(
    title=settings.nombre,
    version="0.1.0",
    description="Coordina el trámite. No guarda convocatorias, expedientes, dictámenes ni polígonos.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ServicioRemoto:
    def __init__(self, clave: str, requisito: str, nombre: str, url_base: str) -> None:
        self.clave = clave
        self.requisito = requisito
        self.nombre = nombre
        self.url_base = url_base.rstrip("/")


def servicios() -> list[ServicioRemoto]:
    return [
    ServicioRemoto(
        clave="convocatorias",
        requisito="REQ-01",
        nombre="Publicación y consulta de convocatorias",
        url_base=settings.convocatorias_url,
    ),
    ServicioRemoto(
        clave="expediente-digital",
        requisito="REQ-02",
        nombre="Postulación, registro de solicitud y expediente digital",
        url_base=settings.expediente_digital_url,
    ),
    ServicioRemoto(
        clave="dictaminacion",
        requisito="REQ-03",
        nombre="Evaluación integral, dictaminación y asignación colegiada",
        url_base=settings.dictaminacion_url,
    ),
    ServicioRemoto(
        clave="formalizacion-seguimiento",
        requisito="REQ-04",
        nombre="Formalización contractual, asignación de insumos, dispersión financiera y seguimiento",
        url_base=settings.formalizacion_seguimiento_url,
    ),
    ServicioRemoto(
        clave="metricas-cierre",
        requisito="REQ-05",
        nombre="Métricas de desempeño y cierre del programa",
        url_base=settings.metricas_cierre_url,
    ),
        ServicioRemoto(
            clave="visor-calculadora",
            requisito="",
            nombre="Calculadora de masa forestal y visor",
            url_base=settings.visor_url,
        ),
    ]


def fecha_operacion() -> dict[str, str]:
    if settings.fecha_operacion is not None:
        return {"valor": settings.fecha_operacion.isoformat(), "origen": "configuracion"}
    return {"valor": date.today().isoformat(), "origen": "reloj"}


@app.get("/health", tags=["sistema"])
async def health():
    return {"estado": "disponible", "servicio": settings.servicio, "nombre": settings.nombre}


@app.get("/api/tramite/v1/fecha-operacion", tags=["sistema"])
async def leer_fecha_operacion():
    return fecha_operacion()


@app.get("/api/tramite/v1/salud", tags=["sistema"])
async def salud_servicios():
    resultado = []
    async with httpx.AsyncClient(timeout=2.0) as cliente:
        for servicio in servicios():
            try:
                respuesta = await cliente.get(f"{servicio.url_base}/health")
                cuerpo = respuesta.json() if respuesta.status_code == 200 else {}
                resultado.append(
                    {
                        "clave": servicio.clave,
                        "requisito": servicio.requisito or cuerpo.get("requisito", ""),
                        "nombre": cuerpo.get("nombre", servicio.nombre),
                        "estado": "disponible" if respuesta.status_code == 200 else "no_disponible",
                        "bus": cuerpo.get("bus", ""),
                    }
                )
            except httpx.HTTPError as exc:
                resultado.append(
                    {
                        "clave": servicio.clave,
                        "requisito": servicio.requisito,
                        "nombre": servicio.nombre,
                        "estado": "no_disponible",
                        "bus": "",
                        "detalle": exc.__class__.__name__,
                    }
                )
    return {"orquestador": "disponible", "fecha_operacion": fecha_operacion(), "servicios": resultado}


@app.post("/api/tramite/v1/bus/prueba", tags=["bus"])
async def prueba_bus():
    canal = "fepi.bus.orquestador"
    try:
        cliente = Redis.from_url(settings.redis_url, socket_connect_timeout=0.5)
        identificador = cliente.xadd(canal, {"origen": "orquestador", "tipo": "prueba"})
        reciente = cliente.xrevrange(canal, count=1)
    except RedisError as exc:
        return JSONResponse(
            status_code=503,
            content={"codigo": "BUS_NO_DISPONIBLE", "detalle": str(exc)},
        )
    publicado = identificador.decode()
    leido = reciente[0][0].decode() if reciente else None
    ecos = []
    async with httpx.AsyncClient(timeout=2.0) as http:
        for servicio in servicios():
            if servicio.clave == "visor-calculadora":
                continue
            try:
                respuesta = await http.post(f"{servicio.url_base}/interno/v1/bus/eco")
                ecos.append({"clave": servicio.clave, "estado": respuesta.status_code, "cuerpo": respuesta.json()})
            except httpx.HTTPError as exc:
                ecos.append({"clave": servicio.clave, "estado": "no_disponible", "detalle": exc.__class__.__name__})
    return {
        "canal": canal,
        "publicado": publicado,
        "leido": leido,
        "ida_y_vuelta": publicado == leido,
        "servicios": ecos,
    }


app.include_router(tramite_router)
app.include_router(convocatorias_router)
app.include_router(solicitudes_router)


@app.api_route(
    "/api/tramite/v1/{resto:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["negocio"],
)
async def pendiente(resto: str):
    if resto in {"fecha-operacion", "salud", "bus/prueba"}:
        return JSONResponse(status_code=405, content={"codigo": "METODO_NO_PERMITIDO"})
    return JSONResponse(
        status_code=501,
        content={
            "codigo": "PENDIENTE",
            "servicio": "orquestador",
            "ruta": resto,
            "mensaje": "La operación de este trámite todavía no está implementada.",
        },
    )
