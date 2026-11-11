"""Tipo de solicitante, personas y clase de cada PDF.

Revision ID: 20261102_0003
Revises: 20261102_0002
Create Date: 2026-11-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0003"
down_revision: Union[str, None] = "20261102_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("solicitud", sa.Column("tipo", sa.String(length=32), nullable=False, server_default="persona_fisica"))
    op.add_column("solicitud", sa.Column("modificado_en", sa.DateTime()))
    op.add_column("solicitud", sa.Column("modificado_por", sa.Integer()))
    op.add_column("documento_solicitud", sa.Column("clase", sa.String(length=40), nullable=False, server_default="pedido"))
    op.add_column("documento_solicitud", sa.Column("persona_id", sa.Integer()))
    op.add_column("documento_solicitud", sa.Column("subido_por", sa.Integer()))
    op.create_table(
        "persona_solicitud",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("solicitud_id", sa.Integer(), sa.ForeignKey("solicitud.id"), nullable=False),
        sa.Column("papel", sa.String(length=32), nullable=False),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("tipo_identificacion", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("sin_domicilio", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_table("persona_solicitud")
    op.drop_column("documento_solicitud", "subido_por")
    op.drop_column("documento_solicitud", "persona_id")
    op.drop_column("documento_solicitud", "clase")
    op.drop_column("solicitud", "modificado_por")
    op.drop_column("solicitud", "modificado_en")
    op.drop_column("solicitud", "tipo")
