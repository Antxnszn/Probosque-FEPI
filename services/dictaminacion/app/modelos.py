from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DictamenJuridico(Base):
    __tablename__ = "dictamen_juridico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    procede: Mapped[bool] = mapped_column(Boolean, nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DictamenTecnico(Base):
    __tablename__ = "dictamen_tecnico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    procede: Mapped[bool] = mapped_column(Boolean, nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    archivo_id: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Resolucion(Base):
    __tablename__ = "resolucion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cuenta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    programa: Mapped[str] = mapped_column(String(8), default="")
    resultado: Mapped[str] = mapped_column(String(20), nullable=False)
    texto: Mapped[str] = mapped_column(Text, default="")
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
