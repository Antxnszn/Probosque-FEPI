from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Cuenta(Base):
    __tablename__ = "cuenta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clase: Mapped[str] = mapped_column(String(20), nullable=False)
    puesto: Mapped[str | None] = mapped_column(String(40))
    delegacion: Mapped[str | None] = mapped_column(String(80))
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    correo: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Aviso(Base):
    __tablename__ = "aviso"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"), nullable=False)
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    leido: Mapped[bool] = mapped_column(Boolean, default=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
