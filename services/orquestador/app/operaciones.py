from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import sesion
from app.modelos import Cuenta
from app.reenvio import pedir
from app.seguridad import cuenta_actual, cuenta_opcional, exigir
from app.tramite import avisar, base

router = APIRouter(prefix="/api/tramite/v1", tags=["tramite"])

TENENCIA = "Acreditación de propiedad o posesión"


def hoy() -> date:
    if settings.fecha_operacion is not None:
        return settings.fecha_operacion
    return date.today()


def personal(cuenta: Cuenta, puestos: set[str]) -> None:
    exigir(cuenta, puestos)


async def subir(cuenta: Cuenta, archivo: UploadFile, tipo: str, nombre: str, solicitud_id: int | None) -> dict:
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    datos = {"tipo": tipo, "nombre": nombre}
    if solicitud_id is not None:
        datos["solicitud_id"] = str(solicitud_id)
    return await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/archivos",
        cuenta,
        archivos={"archivo": (archivo.filename or nombre, contenido, archivo.content_type or "application/octet-stream")},
        datos=datos,
    )


class ConvocatoriaEntrada(BaseModel):
    programa: str
    titulo: str
    texto: str = ""
    vigencia_inicio: date
    vigencia_fin: date
    nombre_comite: str = ""
    documentos: list[str] = []
    estado: str | None = None


class ConvocatoriaCambio(BaseModel):
    titulo: str | None = None
    texto: str | None = None
    vigencia_inicio: date | None = None
    vigencia_fin: date | None = None
    nombre_comite: str | None = None
    documentos: list[str] | None = None
    estado: str | None = None


class SolicitudEntrada(BaseModel):
    convocatoria_id: int
    nombre_solicitante: str
    nombre_beneficiario: str = ""
    identificacion: str = ""
    representacion_legal: str = ""
    municipio: str = ""
    delegacion: str


class SolicitudCambio(BaseModel):
    nombre_solicitante: str | None = None
    nombre_beneficiario: str | None = None
    identificacion: str | None = None
    representacion_legal: str | None = None
    municipio: str | None = None
    delegacion: str | None = None


class FechaSubsanacion(BaseModel):
    fecha_limite_subsanacion: date


class PoligonoEntrada(BaseModel):
    vertices: list[dict]


class DictamenEntrada(BaseModel):
    procede: bool
    texto: str = ""


class ResolucionEntrada(BaseModel):
    resultado: str
    texto: str = ""


class ContratoEntrada(BaseModel):
    texto_compromisos: str = ""


class MinistracionEntrada(BaseModel):
    fecha: date
    tipo_apoyo: str
    monto: str


class InformeEntrada(BaseModel):
    texto: str = ""


class CierreEntrada(BaseModel):
    tipo: str
    texto: str = ""


class QuejaEntrada(BaseModel):
    solicitud_id: int
    texto: str


class AtencionEntrada(BaseModel):
    respuesta: str


async def solicitud_de(cuenta: Cuenta, solicitud_id: int) -> dict:
    return await pedir("GET", f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}", cuenta)


@router.get("/programas")
async def programas():
    return await pedir("GET", f"{base('convocatorias')}/interno/v1/programas", None)


@router.get("/convocatorias")
async def convocatorias(cuenta: Cuenta | None = Depends(cuenta_opcional)):
    return await pedir("GET", f"{base('convocatorias')}/interno/v1/convocatorias", cuenta)


@router.post("/convocatorias")
async def crear_convocatoria(cuerpo: ConvocatoriaEntrada, cuenta: Cuenta = Depends(cuenta_actual)):
    personal(cuenta, {"convocatorias"})
    return await pedir("POST", f"{base('convocatorias')}/interno/v1/convocatorias", cuenta, json=cuerpo.model_dump(mode="json"))


@router.patch("/convocatorias/{convocatoria_id}")
async def cambiar_convocatoria(
    convocatoria_id: int,
    cuerpo: ConvocatoriaCambio,
    cuenta: Cuenta = Depends(cuenta_actual),
):
    personal(cuenta, {"convocatorias"})
    return await pedir(
        "PATCH",
        f"{base('convocatorias')}/interno/v1/convocatorias/{convocatoria_id}",
        cuenta,
        json=cuerpo.model_dump(mode="json", exclude_none=True),
    )


@router.post("/convocatorias/{convocatoria_id}/pdf")
async def pdf_convocatoria(
    convocatoria_id: int,
    archivo: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    personal(cuenta, {"convocatorias"})
    guardado = await subir(cuenta, archivo, "convocatoria", archivo.filename or "convocatoria.pdf", None)
    return await pedir(
        "PATCH",
        f"{base('convocatorias')}/interno/v1/convocatorias/{convocatoria_id}",
        cuenta,
        json={"ruta_pdf": str(guardado["id"])},
    )


@router.post("/solicitudes")
async def crear_solicitud(
    cuerpo: SolicitudEntrada,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    if cuenta.clase != "solicitante":
        raise HTTPException(status_code=403, detail="La solicitud la abre la cuenta de solicitante")
    convocatoria = await pedir(
        "GET",
        f"{base('convocatorias')}/interno/v1/convocatorias",
        cuenta,
    )
    elegida = next((fila for fila in convocatoria if fila["id"] == cuerpo.convocatoria_id), None)
    if elegida is None or elegida["estado"] != "publicada":
        raise HTTPException(status_code=404, detail="La convocatoria no está publicada")
    inicio = date.fromisoformat(elegida["vigencia_inicio"])
    fin = date.fromisoformat(elegida["vigencia_fin"])
    if not inicio <= hoy() <= fin:
        raise HTTPException(status_code=409, detail="Hoy, según la fecha de operación, la convocatoria no está vigente")
    creada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes",
        cuenta,
        json={**cuerpo.model_dump(), "programa": elegida["programa"]},
    )
    avisar(db, cuenta.id, f"Abriste la solicitud {creada['id']} de {elegida['titulo']}.")
    return creada


@router.get("/solicitudes")
async def solicitudes(cuenta: Cuenta = Depends(cuenta_actual)):
    return await pedir("GET", f"{base('expediente')}/interno/v1/solicitudes", cuenta)


@router.get("/solicitudes/{solicitud_id}")
async def expediente(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    solicitud = await solicitud_de(cuenta, solicitud_id)
    dictamen = await pedir("GET", f"{base('dictaminacion')}/interno/v1/solicitudes/{solicitud_id}/dictamen", cuenta)
    formalizacion = await pedir(
        "GET",
        f"{base('formalizacion')}/interno/v1/solicitudes/{solicitud_id}/formalizacion",
        cuenta,
    )
    cierre = await pedir("GET", f"{base('cierre')}/interno/v1/solicitudes/{solicitud_id}/cierre", cuenta)
    return {"solicitud": solicitud, "dictamen": dictamen, "formalizacion": formalizacion, "cierre": cierre}


@router.patch("/solicitudes/{solicitud_id}")
async def cambiar_solicitud(
    solicitud_id: int,
    cuerpo: SolicitudCambio,
    cuenta: Cuenta = Depends(cuenta_actual),
):
    return await pedir(
        "PATCH",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}",
        cuenta,
        json=cuerpo.model_dump(exclude_none=True),
    )


@router.post("/solicitudes/{solicitud_id}/documentos")
async def documento(
    solicitud_id: int,
    nombre: str = Form(...),
    archivo: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    contenido = await archivo.read()
    return await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/documentos",
        cuenta,
        archivos={"archivo": (archivo.filename or nombre, contenido, archivo.content_type or "application/octet-stream")},
        datos={"nombre": nombre},
    )


@router.post("/solicitudes/{solicitud_id}/poligono")
async def poligono(solicitud_id: int, cuerpo: PoligonoEntrada, cuenta: Cuenta = Depends(cuenta_actual)):
    return await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/poligono",
        cuenta,
        json=cuerpo.model_dump(),
    )


@router.post("/solicitudes/{solicitud_id}/shapefile")
async def shapefile(
    solicitud_id: int,
    shp: UploadFile = File(...),
    shx: UploadFile = File(...),
    dbf: UploadFile = File(...),
    prj: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
):
    archivos = {
        "shp": (shp.filename or "predio.shp", await shp.read(), "application/octet-stream"),
        "shx": (shx.filename or "predio.shx", await shx.read(), "application/octet-stream"),
        "dbf": (dbf.filename or "predio.dbf", await dbf.read(), "application/octet-stream"),
        "prj": (prj.filename or "predio.prj", await prj.read(), "application/octet-stream"),
    }
    return await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/shapefile",
        cuenta,
        archivos=archivos,
    )


@router.post("/solicitudes/{solicitud_id}/enviar")
async def enviar(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    solicitud = await solicitud_de(cuenta, solicitud_id)
    convocatorias_publicadas = await pedir("GET", f"{base('convocatorias')}/interno/v1/convocatorias", None)
    elegida = next((fila for fila in convocatorias_publicadas if fila["id"] == solicitud["convocatoria_id"]), None)
    pedidos = set(elegida["documentos"]) if elegida else set()
    pedidos.add(TENENCIA)
    entregados = {documento["nombre"] for documento in solicitud["documentos"]}
    faltan = sorted(pedidos - entregados)
    if faltan:
        raise HTTPException(status_code=422, detail="Faltan documentos: " + ", ".join(faltan))
    actualizada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "enviada"},
    )
    avisar(db, cuenta.id, f"Enviaste la solicitud {solicitud_id}.")
    return actualizada


@router.post("/solicitudes/{solicitud_id}/recibir")
async def recibir(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    personal(cuenta, {"delegacion"})
    actualizada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "recibida"},
    )
    avisar(db, actualizada["cuenta_id"], f"Tu solicitud recibió el folio {actualizada['folio']}.")
    return actualizada


@router.post("/solicitudes/{solicitud_id}/subsanar")
async def subsanar(
    solicitud_id: int,
    cuerpo: FechaSubsanacion,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"delegacion"})
    actualizada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "subsanacion", "fecha_limite_subsanacion": cuerpo.fecha_limite_subsanacion.isoformat()},
    )
    avisar(
        db,
        actualizada["cuenta_id"],
        f"La delegación pidió corregir la solicitud {solicitud_id} antes del {cuerpo.fecha_limite_subsanacion.isoformat()}.",
    )
    return actualizada


@router.post("/solicitudes/{solicitud_id}/remitir")
async def remitir(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    personal(cuenta, {"delegacion"})
    actualizada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "remitida"},
    )
    avisar(db, actualizada["cuenta_id"], f"La solicitud {actualizada['folio'] or solicitud_id} pasó a dictamen.")
    return actualizada


async def guardar_dictamen(solicitud_id: int, cuerpo: DictamenEntrada, archivo: UploadFile | None, cuenta: Cuenta, ruta: str, estado: str, db: Session):
    archivo_id = None
    if archivo is not None and archivo.filename:
        guardado = await subir(cuenta, archivo, "dictamen", archivo.filename, solicitud_id)
        archivo_id = guardado["id"]
    resultado = await pedir(
        "POST",
        f"{base('dictaminacion')}{ruta}",
        cuenta,
        json={"solicitud_id": solicitud_id, "procede": cuerpo.procede, "texto": cuerpo.texto, "archivo_id": archivo_id},
    )
    actualizada = await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": estado},
    )
    texto = "procede" if cuerpo.procede else "no procede"
    avisar(db, actualizada["cuenta_id"], f"Hay un dictamen nuevo en la solicitud {solicitud_id}: {texto}.")
    return {"dictamen": resultado, "solicitud": actualizada}


@router.post("/solicitudes/{solicitud_id}/dictamen-juridico")
async def dictamen_juridico(
    solicitud_id: int,
    procede: bool = Form(...),
    texto: str = Form(default=""),
    archivo: UploadFile | None = File(default=None),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"unidad_juridica"})
    return await guardar_dictamen(
        solicitud_id,
        DictamenEntrada(procede=procede, texto=texto),
        archivo,
        cuenta,
        "/interno/v1/dictamenes-juridicos",
        "dictaminada_juridico",
        db,
    )


@router.post("/solicitudes/{solicitud_id}/dictamen-tecnico")
async def dictamen_tecnico(
    solicitud_id: int,
    procede: bool = Form(...),
    texto: str = Form(default=""),
    archivo: UploadFile | None = File(default=None),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"area_tecnica"})
    return await guardar_dictamen(
        solicitud_id,
        DictamenEntrada(procede=procede, texto=texto),
        archivo,
        cuenta,
        "/interno/v1/dictamenes-tecnicos",
        "dictaminada_tecnico",
        db,
    )


@router.post("/solicitudes/{solicitud_id}/resolucion")
async def resolucion(
    solicitud_id: int,
    cuerpo: ResolucionEntrada,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"comite"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    dictamen = await pedir("GET", f"{base('dictaminacion')}/interno/v1/solicitudes/{solicitud_id}/dictamen", cuenta)
    if not dictamen["resoluciones"] and solicitud["estado"] not in {"dictaminada_juridico", "dictaminada_tecnico"}:
        raise HTTPException(status_code=409, detail="El comité resuelve después del dictamen")
    creada = await pedir(
        "POST",
        f"{base('dictaminacion')}/interno/v1/resoluciones",
        cuenta,
        json={
            "solicitud_id": solicitud_id,
            "programa": solicitud["programa"],
            "resultado": cuerpo.resultado,
            "texto": cuerpo.texto,
        },
    )
    if not dictamen["resoluciones"]:
        await pedir(
            "POST",
            f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
            cuenta,
            json={"estado": "resuelta"},
        )
    nombres = {"beneficiario": "beneficiario", "lista_espera": "lista de espera", "fuera": "fuera del programa"}
    avisar(db, solicitud["cuenta_id"], f"El comité resolvió la solicitud {solicitud_id}: {nombres.get(cuerpo.resultado, cuerpo.resultado)}.")
    return creada


@router.get("/lista-espera")
async def lista_espera(cuenta: Cuenta = Depends(cuenta_actual)):
    personal(cuenta, {"comite", "coordinacion_delegaciones", "convocatorias"})
    return await pedir("GET", f"{base('dictaminacion')}/interno/v1/lista-espera", cuenta)


@router.post("/solicitudes/{solicitud_id}/contrato")
async def contrato(
    solicitud_id: int,
    texto_compromisos: str = Form(default=""),
    archivo: UploadFile | None = File(default=None),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"administracion_finanzas"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    dictamen = await pedir("GET", f"{base('dictaminacion')}/interno/v1/solicitudes/{solicitud_id}/dictamen", cuenta)
    ultima = dictamen["resoluciones"][-1] if dictamen["resoluciones"] else None
    if ultima is None or ultima["resultado"] != "beneficiario":
        raise HTTPException(status_code=409, detail="El contrato se registra cuando el comité resolvió beneficiario")
    archivo_id = None
    if archivo is not None and archivo.filename:
        guardado = await subir(cuenta, archivo, "contrato", archivo.filename, solicitud_id)
        archivo_id = guardado["id"]
    guardado_contrato = await pedir(
        "POST",
        f"{base('formalizacion')}/interno/v1/contratos",
        cuenta,
        json={"solicitud_id": solicitud_id, "texto_compromisos": texto_compromisos, "archivo_id": archivo_id},
    )
    if solicitud["estado"] == "resuelta":
        await pedir(
            "POST",
            f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
            cuenta,
            json={"estado": "formalizada"},
        )
    avisar(db, solicitud["cuenta_id"], f"Se registró el contrato de la solicitud {solicitud_id}.")
    return guardado_contrato


@router.post("/solicitudes/{solicitud_id}/ministracion")
async def ministracion(
    solicitud_id: int,
    fecha: date = Form(...),
    tipo_apoyo: str = Form(...),
    monto: str = Form(...),
    archivo: UploadFile | None = File(default=None),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"administracion_finanzas"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    if solicitud["estado"] not in {"formalizada", "seguimiento"}:
        raise HTTPException(status_code=409, detail="La ministración se registra después del contrato")
    archivo_id = None
    if archivo is not None and archivo.filename:
        guardado = await subir(cuenta, archivo, "ministracion", archivo.filename, solicitud_id)
        archivo_id = guardado["id"]
    creada = await pedir(
        "POST",
        f"{base('formalizacion')}/interno/v1/ministraciones",
        cuenta,
        json={
            "solicitud_id": solicitud_id,
            "programa": solicitud["programa"],
            "fecha": fecha.isoformat(),
            "tipo_apoyo": tipo_apoyo,
            "monto": monto,
            "archivo_id": archivo_id,
        },
    )
    avisar(db, solicitud["cuenta_id"], f"Se registró una ministración en la solicitud {solicitud_id}.")
    return creada


@router.get("/ministraciones")
async def ministraciones(cuenta: Cuenta = Depends(cuenta_actual)):
    if cuenta.puesto == "fiduciaria":
        return await pedir("GET", f"{base('formalizacion')}/interno/v1/ministraciones?programa=PSA", cuenta)
    personal(cuenta, {"administracion_finanzas", "coordinacion_delegaciones", "convocatorias"})
    return await pedir("GET", f"{base('formalizacion')}/interno/v1/ministraciones", cuenta)


@router.post("/solicitudes/{solicitud_id}/seguimiento")
async def seguimiento(
    solicitud_id: int,
    nombre: str = Form(...),
    archivo: UploadFile = File(...),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"seguimiento"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    guardado = await subir(cuenta, archivo, "seguimiento", archivo.filename or nombre, solicitud_id)
    creado = await pedir(
        "POST",
        f"{base('formalizacion')}/interno/v1/seguimientos",
        cuenta,
        json={"solicitud_id": solicitud_id, "nombre": nombre, "archivo_id": guardado["id"]},
    )
    if solicitud["estado"] == "formalizada":
        await pedir(
            "POST",
            f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
            cuenta,
            json={"estado": "seguimiento"},
        )
    avisar(db, solicitud["cuenta_id"], f"Seguimiento agregó un documento a la solicitud {solicitud_id}.")
    return creado


@router.post("/solicitudes/{solicitud_id}/informe")
async def informe(
    solicitud_id: int,
    texto: str = Form(default=""),
    archivo: UploadFile | None = File(default=None),
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    if cuenta.clase != "solicitante":
        raise HTTPException(status_code=403, detail="El informe lo escribe quien solicitó")
    archivo_id = None
    if archivo is not None and archivo.filename:
        guardado = await subir(cuenta, archivo, "informe", archivo.filename, solicitud_id)
        archivo_id = guardado["id"]
    creado = await pedir(
        "POST",
        f"{base('formalizacion')}/interno/v1/informes",
        cuenta,
        json={"solicitud_id": solicitud_id, "texto": texto, "archivo_id": archivo_id},
    )
    avisar(db, cuenta.id, f"Enviaste el informe de la solicitud {solicitud_id}.")
    return creado


@router.post("/solicitudes/{solicitud_id}/informe/aprobar")
async def aprobar_informe(solicitud_id: int, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    personal(cuenta, {"seguimiento"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    aprobado = await pedir("POST", f"{base('formalizacion')}/interno/v1/informes/{solicitud_id}/aprobar", cuenta)
    avisar(db, solicitud["cuenta_id"], f"Se aprobó el informe de la solicitud {solicitud_id}.")
    return aprobado


@router.post("/solicitudes/{solicitud_id}/cierre")
async def cierre(
    solicitud_id: int,
    cuerpo: CierreEntrada,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"seguimiento"})
    solicitud = await solicitud_de(cuenta, solicitud_id)
    if solicitud["estado"] not in {"formalizada", "seguimiento"}:
        raise HTTPException(status_code=409, detail="El cierre sigue a la formalización o al seguimiento")
    dictamen = await pedir("GET", f"{base('dictaminacion')}/interno/v1/solicitudes/{solicitud_id}/dictamen", cuenta)
    formalizacion = await pedir(
        "GET",
        f"{base('formalizacion')}/interno/v1/solicitudes/{solicitud_id}/formalizacion",
        cuenta,
    )
    ultima = dictamen["resoluciones"][-1]["resultado"] if dictamen["resoluciones"] else "sin resolución"
    resumen = "\n".join(
        [
            f"Folio: {solicitud['folio'] or solicitud['id']}",
            f"Programa: {solicitud['programa']}",
            f"Delegación: {solicitud['delegacion']}",
            f"Superficie del dibujo: {solicitud['superficie_ha']} ha",
            f"Resolución: {ultima}",
            f"Ministraciones registradas: {len(formalizacion['ministraciones'])}",
            f"Tipo de cierre: {cuerpo.tipo}",
            cuerpo.texto,
        ]
    )
    creado = await pedir(
        "POST",
        f"{base('cierre')}/interno/v1/cierres",
        cuenta,
        json={
            "solicitud_id": solicitud_id,
            "programa": solicitud["programa"],
            "tipo": cuerpo.tipo,
            "texto": cuerpo.texto,
            "resumen": resumen,
        },
    )
    await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "cerrada"},
    )
    await pedir(
        "POST",
        f"{base('expediente')}/interno/v1/solicitudes/{solicitud_id}/estado",
        cuenta,
        json={"estado": "archivada"},
    )
    avisar(db, solicitud["cuenta_id"], f"La solicitud {solicitud_id} quedó en {cuerpo.tipo} y el archivo ya se puede consultar.")
    return creado


@router.get("/indicadores")
async def indicadores(cuenta: Cuenta = Depends(cuenta_actual)):
    personal(cuenta, {"uippe", "convocatorias", "coordinacion_delegaciones"})
    solicitudes_conteo = await pedir("GET", f"{base('expediente')}/interno/v1/conteos", cuenta)
    resoluciones = await pedir("GET", f"{base('dictaminacion')}/interno/v1/conteos", cuenta)
    cierres = await pedir("GET", f"{base('cierre')}/interno/v1/conteos", cuenta)
    return {"solicitudes": solicitudes_conteo, "resoluciones": resoluciones, "cierres": cierres}


@router.get("/archivo")
async def archivo(cuenta: Cuenta = Depends(cuenta_actual)):
    personal(cuenta, {"gestion_documental", "seguimiento", "convocatorias", "coordinacion_delegaciones"})
    return await pedir("GET", f"{base('cierre')}/interno/v1/archivos", cuenta)


@router.post("/quejas")
async def queja(cuerpo: QuejaEntrada, cuenta: Cuenta = Depends(cuenta_actual), db: Session = Depends(sesion)):
    if cuenta.clase != "solicitante":
        raise HTTPException(status_code=403, detail="La queja la presenta quien solicitó")
    await solicitud_de(cuenta, cuerpo.solicitud_id)
    creada = await pedir("POST", f"{base('cierre')}/interno/v1/quejas", cuenta, json=cuerpo.model_dump())
    avisar(db, cuenta.id, f"Recibimos tu queja de la solicitud {cuerpo.solicitud_id}.")
    return creada


@router.get("/quejas")
async def quejas(cuenta: Cuenta = Depends(cuenta_actual)):
    personal(cuenta, {"organo_control"})
    return await pedir("GET", f"{base('cierre')}/interno/v1/quejas", cuenta)


@router.post("/quejas/{queja_id}/atencion")
async def atencion(
    queja_id: int,
    cuerpo: AtencionEntrada,
    cuenta: Cuenta = Depends(cuenta_actual),
    db: Session = Depends(sesion),
):
    personal(cuenta, {"organo_control"})
    atendida = await pedir(
        "POST",
        f"{base('cierre')}/interno/v1/quejas/{queja_id}/atencion",
        cuenta,
        json=cuerpo.model_dump(),
    )
    avisar(db, atendida["cuenta_id"], f"El Órgano Interno de Control respondió tu queja de la solicitud {atendida['solicitud_id']}.")
    return atendida


@router.get("/archivos/{archivo_id}")
async def archivo_binario(archivo_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    respuesta = await pedir("GET", f"{base('expediente')}/interno/v1/archivos/{archivo_id}", cuenta)
    if not hasattr(respuesta, "content"):
        raise HTTPException(status_code=404, detail="El archivo no está en la carpeta del expediente")
    return Response(
        content=respuesta.content,
        media_type=respuesta.headers.get("content-type", "application/octet-stream"),
        headers={"Content-Disposition": respuesta.headers.get("content-disposition", "attachment")},
    )


@router.get("/documentos/{documento_id}")
async def documento_binario(documento_id: int, cuenta: Cuenta = Depends(cuenta_actual)):
    respuesta = await pedir("GET", f"{base('expediente')}/interno/v1/documentos/{documento_id}", cuenta)
    if not hasattr(respuesta, "content"):
        raise HTTPException(status_code=404, detail="El documento no está en la carpeta del expediente")
    return Response(
        content=respuesta.content,
        media_type=respuesta.headers.get("content-type", "application/octet-stream"),
        headers={"Content-Disposition": respuesta.headers.get("content-disposition", "attachment")},
    )
