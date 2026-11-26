from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

DELEGACIONES = {
    "Toluca",
    "Naucalpan",
    "Texcoco",
    "Tejupilco",
    "Atlacomulco",
    "Coatepec Harinas",
    "Valle de Bravo",
    "Amecameca",
    "Jilotepec",
}

ESTADOS = {
    "borrador",
    "enviada",
    "subsanacion",
    "recibida",
    "remitida",
    "dictaminada_juridico",
    "dictaminada_tecnico",
    "resuelta",
    "formalizada",
    "seguimiento",
    "cerrada",
    "archivada",
}

LECTURA = {
    "convocatorias",
    "coordinacion_delegaciones",
    "unidad_juridica",
    "area_tecnica",
    "comite",
    "administracion_finanzas",
    "seguimiento",
}


class Solicitud(Base):
    __tablename__ = "solicitud"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    convocatoria_id: Mapped[int] = mapped_column(Integer, nullable=False)
    programa: Mapped[str] = mapped_column(String(8), nullable=False)
    nombre_solicitante: Mapped[str] = mapped_column(String(200), nullable=False)
    nombre_beneficiario: Mapped[str] = mapped_column(String(200), default="")
    identificacion: Mapped[str] = mapped_column(String(40), default="")
    representacion_legal: Mapped[str] = mapped_column(String(200), default="")
    municipio: Mapped[str] = mapped_column(String(120), default="")
    delegacion: Mapped[str] = mapped_column(String(80), nullable=False)
    estado: Mapped[str] = mapped_column(String(32), default="borrador")
    superficie_ha: Mapped[float] = mapped_column(Float, default=0)
    folio: Mapped[str] = mapped_column(String(40), default="")
    quien_recibio: Mapped[str] = mapped_column(String(200), default="")
    fecha_recepcion: Mapped[date | None] = mapped_column(Date)
    observaciones: Mapped[str] = mapped_column(Text, default="")
    lugar_visita: Mapped[str] = mapped_column(String(200), default="")
    fecha_visita: Mapped[date | None] = mapped_column(Date)
    correccion: Mapped[str] = mapped_column(Text, default="")
    fecha_limite_subsanacion: Mapped[date | None] = mapped_column(Date)
    wkt: Mapped[str] = mapped_column(Text, default="")
    tipo: Mapped[str] = mapped_column(String(32), default="persona_fisica")
    etiqueta: Mapped[str] = mapped_column(String(32), default="")
    grupo: Mapped[str] = mapped_column(String(80), default="")
    documentacion_en_probosque: Mapped[bool] = mapped_column(Boolean, default=False)
    declaratoria_sin_litigio: Mapped[bool] = mapped_column(Boolean, default=False)
    aviso_privacidad: Mapped[bool] = mapped_column(Boolean, default=False)
    nombre_predio: Mapped[str] = mapped_column(String(200), default="")
    localidad: Mapped[str] = mapped_column(String(160), default="")
    programa_manejo: Mapped[bool] = mapped_column(Boolean, default=False)
    tipo_certificado: Mapped[str] = mapped_column(String(120), default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    modificado_en: Mapped[datetime | None] = mapped_column(DateTime)
    modificado_por: Mapped[int | None] = mapped_column(Integer)
    documentos: Mapped[list["DocumentoSolicitud"]] = relationship(back_populates="solicitud")
    personas: Mapped[list["PersonaSolicitud"]] = relationship(back_populates="solicitud")
    refrendos: Mapped[list["Refrendo"]] = relationship(back_populates="solicitud")


class DocumentoSolicitud(Base):
    __tablename__ = "documento_solicitud"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(ForeignKey("solicitud.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    clase: Mapped[str] = mapped_column(String(40), default="pedido")
    persona_id: Mapped[int | None] = mapped_column(Integer)
    subido_por: Mapped[int | None] = mapped_column(Integer)
    ruta: Mapped[str] = mapped_column(String(400), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    solicitud: Mapped[Solicitud] = relationship(back_populates="documentos")


class PersonaSolicitud(Base):
    __tablename__ = "persona_solicitud"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(ForeignKey("solicitud.id"), nullable=False)
    papel: Mapped[str] = mapped_column(String(32), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    primer_apellido: Mapped[str] = mapped_column(String(80), default="")
    segundo_apellido: Mapped[str] = mapped_column(String(80), default="")
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    sexo: Mapped[str] = mapped_column(String(20), default="")
    estado_civil: Mapped[str] = mapped_column(String(40), default="")
    grado_estudios: Mapped[str] = mapped_column(String(80), default="")
    tipo_identificacion: Mapped[str] = mapped_column(String(20), default="")
    folio_identificacion: Mapped[str] = mapped_column(String(40), default="")
    nacionalidad: Mapped[str] = mapped_column(String(80), default="")
    entidad_nacimiento: Mapped[str] = mapped_column(String(80), default="")
    curp: Mapped[str] = mapped_column(String(18), default="")
    telefono_fijo: Mapped[str] = mapped_column(String(20), default="")
    celular: Mapped[str] = mapped_column(String(20), default="")
    correo: Mapped[str] = mapped_column(String(200), default="")
    red_social: Mapped[str] = mapped_column(String(120), default="")
    calle: Mapped[str] = mapped_column(String(160), default="")
    numero_exterior: Mapped[str] = mapped_column(String(20), default="")
    numero_interior: Mapped[str] = mapped_column(String(20), default="")
    entre_calles: Mapped[str] = mapped_column(String(160), default="")
    referencia_domicilio: Mapped[str] = mapped_column(String(160), default="")
    colonia: Mapped[str] = mapped_column(String(120), default="")
    localidad_domicilio: Mapped[str] = mapped_column(String(120), default="")
    municipio_domicilio: Mapped[str] = mapped_column(String(120), default="")
    entidad_domicilio: Mapped[str] = mapped_column(String(80), default="")
    codigo_postal: Mapped[str] = mapped_column(String(10), default="")
    sin_domicilio: Mapped[bool] = mapped_column(Boolean, default=False)
    solicitud: Mapped[Solicitud] = relationship(back_populates="personas")


class Refrendo(Base):
    __tablename__ = "refrendo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(ForeignKey("solicitud.id"), nullable=False)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    folio: Mapped[str] = mapped_column(String(40), default="")
    solicitud: Mapped[Solicitud] = relationship(back_populates="refrendos")


class ArchivoGuardado(Base):
    __tablename__ = "archivo_guardado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int | None] = mapped_column(Integer)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    ruta: Mapped[str] = mapped_column(String(400), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
