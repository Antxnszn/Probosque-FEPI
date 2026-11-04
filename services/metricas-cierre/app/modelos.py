from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Cierre(Base):
    __tablename__ = "cierre"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    programa: Mapped[str] = mapped_column(String(8), default="")
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ArchivoExpediente(Base):
    __tablename__ = "archivo_expediente"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    programa: Mapped[str] = mapped_column(String(8), default="")
    resumen: Mapped[str] = mapped_column(Text, default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Queja(Base):
    __tablename__ = "queja"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    respuesta: Mapped[str] = mapped_column(Text, default="")
    respondida_por: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
