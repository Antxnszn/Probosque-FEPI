"""Convocatoria común y documentos que pide.

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
        "convocatoria",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("programa", sa.String(length=8), nullable=False),
        sa.Column("titulo", sa.String(length=240), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("vigencia_inicio", sa.Date(), nullable=False),
        sa.Column("vigencia_fin", sa.Date(), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="borrador"),
        sa.Column("nombre_comite", sa.String(length=240), nullable=False, server_default=""),
        sa.Column("ruta_pdf", sa.String(length=400), nullable=False, server_default=""),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "documento_pedido",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("convocatoria_id", sa.Integer(), sa.ForeignKey("convocatoria.id"), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("documento_pedido")
    op.drop_table("convocatoria")
