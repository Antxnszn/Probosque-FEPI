"""Predio, grupo, refrendos y registro FO-PB-502.

Revision ID: 20261123_0004
Revises: 20261102_0003
Create Date: 2026-11-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261123_0004"
down_revision: Union[str, None] = "20261102_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("solicitud", sa.Column("etiqueta", sa.String(length=32), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("grupo", sa.String(length=80), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("documentacion_en_probosque", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("solicitud", sa.Column("declaratoria_sin_litigio", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("solicitud", sa.Column("aviso_privacidad", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("solicitud", sa.Column("nombre_predio", sa.String(length=200), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("localidad", sa.String(length=160), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("programa_manejo", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("solicitud", sa.Column("tipo_certificado", sa.String(length=120), nullable=False, server_default=""))
    for nombre, largo in (
        ("primer_apellido", 80),
        ("segundo_apellido", 80),
        ("sexo", 20),
        ("estado_civil", 40),
        ("grado_estudios", 80),
        ("folio_identificacion", 40),
        ("nacionalidad", 80),
        ("entidad_nacimiento", 80),
        ("curp", 18),
        ("telefono_fijo", 20),
        ("celular", 20),
        ("correo", 200),
        ("red_social", 120),
        ("calle", 160),
        ("numero_exterior", 20),
        ("numero_interior", 20),
        ("entre_calles", 160),
        ("referencia_domicilio", 160),
        ("colonia", 120),
        ("localidad_domicilio", 120),
        ("municipio_domicilio", 120),
        ("entidad_domicilio", 80),
        ("codigo_postal", 10),
    ):
        op.add_column("persona_solicitud", sa.Column(nombre, sa.String(length=largo), nullable=False, server_default=""))
    op.add_column("persona_solicitud", sa.Column("fecha_nacimiento", sa.Date()))
    op.create_table(
        "refrendo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), sa.ForeignKey("solicitud.id"), nullable=False),
        sa.Column("anio", sa.Integer(), nullable=False),
        sa.Column("folio", sa.String(length=40), nullable=False, server_default=""),
        sa.UniqueConstraint("solicitud_id", "anio"),
    )


def downgrade() -> None:
    op.drop_table("refrendo")
    op.drop_column("persona_solicitud", "fecha_nacimiento")
    for nombre in (
        "codigo_postal",
        "entidad_domicilio",
        "municipio_domicilio",
        "localidad_domicilio",
        "colonia",
        "referencia_domicilio",
        "entre_calles",
        "numero_interior",
        "numero_exterior",
        "calle",
        "red_social",
        "correo",
        "celular",
        "telefono_fijo",
        "curp",
        "entidad_nacimiento",
        "nacionalidad",
        "folio_identificacion",
        "grado_estudios",
        "estado_civil",
        "sexo",
        "segundo_apellido",
        "primer_apellido",
    ):
        op.drop_column("persona_solicitud", nombre)
    for nombre in (
        "tipo_certificado",
        "programa_manejo",
        "localidad",
        "nombre_predio",
        "aviso_privacidad",
        "declaratoria_sin_litigio",
        "documentacion_en_probosque",
        "grupo",
        "etiqueta",
    ):
        op.drop_column("solicitud", nombre)
