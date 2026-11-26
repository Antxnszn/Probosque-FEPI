"""Tipo individual o general de la convocatoria.

Revision ID: 20261123_0005
Revises: 20261102_0004
Create Date: 2026-11-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261123_0005"
down_revision: Union[str, None] = "20261102_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("convocatoria", sa.Column("tipo", sa.String(length=20), nullable=False, server_default="general"))


def downgrade() -> None:
    op.drop_column("convocatoria", "tipo")
