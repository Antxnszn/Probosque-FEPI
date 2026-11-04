"""Quién creó y modificó la convocatoria.

Revision ID: 20261102_0004
Revises: 20261102_0003
Create Date: 2026-11-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0004"
down_revision: Union[str, None] = "20261102_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("convocatoria", sa.Column("creado_por", sa.Integer()))
    op.add_column("convocatoria", sa.Column("modificado_por", sa.Integer()))
    op.add_column("convocatoria", sa.Column("modificado_en", sa.DateTime()))


def downgrade() -> None:
    op.drop_column("convocatoria", "modificado_en")
    op.drop_column("convocatoria", "modificado_por")
    op.drop_column("convocatoria", "creado_por")
