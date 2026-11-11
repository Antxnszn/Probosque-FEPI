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
    fecha_limite_subsanacion: Mapped[date | None] = mapped_column(Date)
    wkt: Mapped[str] = mapped_column(Text, default="")
    tipo: Mapped[str] = mapped_column(String(32), default="persona_fisica")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    modificado_en: Mapped[datetime | None] = mapped_column(DateTime)
    modificado_por: Mapped[int | None] = mapped_column(Integer)
    documentos: Mapped[list["DocumentoSolicitud"]] = relationship(back_populates="solicitud")
    personas: Mapped[list["PersonaSolicitud"]] = relationship(back_populates="solicitud")


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
    tipo_identificacion: Mapped[str] = mapped_column(String(20), default="")
    sin_domicilio: Mapped[bool] = mapped_column(Boolean, default=False)
    solicitud: Mapped[Solicitud] = relationship(back_populates="personas")


class ArchivoGuardado(Base):
    __tablename__ = "archivo_guardado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int | None] = mapped_column(Integer)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    ruta: Mapped[str] = mapped_column(String(400), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
