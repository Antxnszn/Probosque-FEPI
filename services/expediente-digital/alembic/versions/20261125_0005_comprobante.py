"""Comprobante de recepción y texto de la corrección.

Revision ID: 20261125_0005
Revises: 20261123_0004
Create Date: 2026-11-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261125_0005"
down_revision: Union[str, None] = "20261123_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("solicitud", sa.Column("quien_recibio", sa.String(length=200), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("fecha_recepcion", sa.Date()))
    op.add_column("solicitud", sa.Column("observaciones", sa.Text(), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("lugar_visita", sa.String(length=200), nullable=False, server_default=""))
    op.add_column("solicitud", sa.Column("fecha_visita", sa.Date()))
    op.add_column("solicitud", sa.Column("correccion", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("solicitud", "correccion")
    op.drop_column("solicitud", "fecha_visita")
    op.drop_column("solicitud", "lugar_visita")
    op.drop_column("solicitud", "observaciones")
    op.drop_column("solicitud", "fecha_recepcion")
    op.drop_column("solicitud", "quien_recibio")
