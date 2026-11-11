"""Contrato, ministración, seguimiento e informe.

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
        "contrato",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("texto_compromisos", sa.Text(), nullable=False, server_default=""),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "ministracion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False, server_default=""),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("tipo_apoyo", sa.String(length=120), nullable=False),
        sa.Column("monto", sa.Numeric(14, 2), nullable=False),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "seguimiento_documento",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "informe",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="pendiente"),
        sa.Column("aprobado_por", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("informe")
    op.drop_table("seguimiento_documento")
    op.drop_table("ministracion")
    op.drop_table("contrato")
