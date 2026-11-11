from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

PROGRAMAS = {
    "CC": "Capturando Carbono",
    "PSA": "Pago por Servicios Ambientales Hidrológicos",
    "RHF": "Restauración Hidrológico-Forestal",
    "PS": "Plantaciones Sustentables",
    "MFS": "Manejo Forestal Sustentable",
}

TIPOS_ANEXO = {"material", "resultado"}


class Convocatoria(Base):
    __tablename__ = "convocatoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(240), nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    vigencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    vigencia_fin: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="borrador")
    ruta_pdf: Mapped[str] = mapped_column(String(400), default="")
    creado_por: Mapped[int | None] = mapped_column(Integer)
    modificado_por: Mapped[int | None] = mapped_column(Integer)
    modificado_en: Mapped[datetime | None] = mapped_column(DateTime)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    programas: Mapped[list["ConvocatoriaPrograma"]] = relationship(
        back_populates="convocatoria", cascade="all, delete-orphan"
    )
    documentos: Mapped[list["DocumentoPedido"]] = relationship(
        back_populates="convocatoria", cascade="all, delete-orphan"
    )
    anexos: Mapped[list["Anexo"]] = relationship(back_populates="convocatoria", cascade="all, delete-orphan")


class ConvocatoriaPrograma(Base):
    __tablename__ = "convocatoria_programa"
    __table_args__ = (UniqueConstraint("convocatoria_id", "programa"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    convocatoria_id: Mapped[int] = mapped_column(ForeignKey("convocatoria.id"), nullable=False)
    programa: Mapped[str] = mapped_column(String(8), nullable=False)
    convocatoria: Mapped[Convocatoria] = relationship(back_populates="programas")


class DocumentoPedido(Base):
    __tablename__ = "documento_pedido"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    convocatoria_id: Mapped[int] = mapped_column(ForeignKey("convocatoria.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    convocatoria: Mapped[Convocatoria] = relationship(back_populates="documentos")


class Anexo(Base):
    __tablename__ = "anexo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    convocatoria_id: Mapped[int] = mapped_column(ForeignKey("convocatoria.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    programa: Mapped[str | None] = mapped_column(String(8))
    ruta: Mapped[str] = mapped_column(String(400), nullable=False)
    convocatoria: Mapped[Convocatoria] = relationship(back_populates="anexos")
