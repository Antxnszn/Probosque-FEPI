"""Tabla de metadato del servicio, sin datos de negocio.

Revision ID: 20261101_0001
Revises:
Create Date: 2026-11-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261101_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "metadato_servicio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("servicio", sa.String(length=80), nullable=False),
        sa.Column("requisito", sa.String(length=20), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("metadato_servicio")
