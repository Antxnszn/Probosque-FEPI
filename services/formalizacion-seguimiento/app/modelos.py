from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Contrato(Base):
    __tablename__ = "contrato"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    texto_compromisos: Mapped[str] = mapped_column(Text, default="")
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Ministracion(Base):
    __tablename__ = "ministracion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    programa: Mapped[str] = mapped_column(String(8), default="")
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    tipo_apoyo: Mapped[str] = mapped_column(String(120), nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SeguimientoDocumento(Base):
    __tablename__ = "seguimiento_documento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str] = mapped_column(String(240), nullable=False)
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Informe(Base):
    __tablename__ = "informe"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(String(20), default="pendiente")
    aprobado_por: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
