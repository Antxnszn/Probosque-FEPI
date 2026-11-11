"""Cierre, archivo armado y quejas.

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
        "cierre",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False, server_default=""),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "archivo_expediente",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False, server_default=""),
        sa.Column("resumen", sa.Text(), nullable=False, server_default=""),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "queja",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("respuesta", sa.Text(), nullable=False, server_default=""),
        sa.Column("respondida_por", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("queja")
    op.drop_table("archivo_expediente")
    op.drop_table("cierre")
