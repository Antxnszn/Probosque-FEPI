"""Dictamen jurídico, dictamen técnico y resolución del comité.

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
        "dictamen_juridico",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("procede", sa.Boolean(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "dictamen_tecnico",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("procede", sa.Boolean(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("archivo_id", sa.Integer()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "resolucion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), nullable=False),
        sa.Column("cuenta_id", sa.Integer(), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False, server_default=""),
        sa.Column("resultado", sa.String(length=20), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("resolucion")
    op.drop_table("dictamen_tecnico")
    op.drop_table("dictamen_juridico")
