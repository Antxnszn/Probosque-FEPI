"""Solicitud, documentos y archivos del expediente.

Revision ID: 20261102_0002
Revises: 20261101_0001
Create Date: 2026-11-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0002"
down_revision: Union[str, None] = "20261101_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "solicitud",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("convocatoria_id", sa.Integer(), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False),
        sa.Column("nombre_solicitante", sa.String(length=200), nullable=False),
        sa.Column("nombre_beneficiario", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("identificacion", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("representacion_legal", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("municipio", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("delegacion", sa.String(length=80), nullable=False),
        sa.Column("estado", sa.String(length=32), nullable=False, server_default="borrador"),
        sa.Column("superficie_ha", sa.Float(), nullable=False, server_default="0"),
        sa.Column("folio", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("fecha_limite_subsanacion", sa.Date()),
        sa.Column("wkt", sa.Text(), nullable=False, server_default=""),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.execute("ALTER TABLE solicitud ADD COLUMN geom geometry(Polygon, 4326)")
    op.create_table(
        "documento_solicitud",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), sa.ForeignKey("solicitud.id"), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
        sa.Column("ruta", sa.String(length=400), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "archivo_guardado",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer()),
        sa.Column("tipo", sa.String(length=40), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
        sa.Column("ruta", sa.String(length=400), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("archivo_guardado")
    op.drop_table("documento_solicitud")
    op.drop_table("solicitud")
