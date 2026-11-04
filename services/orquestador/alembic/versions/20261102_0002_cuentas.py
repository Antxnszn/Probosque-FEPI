"""Cuentas separadas y avisos del trámite.

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
        "cuenta",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clase", sa.String(length=20), nullable=False),
        sa.Column("puesto", sa.String(length=40)),
        sa.Column("delegacion", sa.String(length=80)),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("correo", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=200), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_cuenta_correo_clase", "cuenta", ["correo", "clase"], unique=True)
    op.create_table(
        "aviso",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cuenta_id", sa.Integer(), sa.ForeignKey("cuenta.id"), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("leido", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("aviso")
    op.drop_index("ix_cuenta_correo_clase", table_name="cuenta")
    op.drop_table("cuenta")
