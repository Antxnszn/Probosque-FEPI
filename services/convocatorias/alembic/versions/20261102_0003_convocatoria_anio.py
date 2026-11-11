"""Una convocatoria por año, con programas y anexos.

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
    op.create_table(
        "convocatoria_programa",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("convocatoria_id", sa.Integer(), sa.ForeignKey("convocatoria.id"), nullable=False),
        sa.Column("programa", sa.String(length=8), nullable=False),
        sa.UniqueConstraint("convocatoria_id", "programa", name="uq_convocatoria_programa"),
    )
    op.execute(
        "INSERT INTO convocatoria_programa (convocatoria_id, programa) "
        "SELECT id, programa FROM convocatoria"
    )
    op.drop_column("convocatoria", "programa")
    op.drop_column("convocatoria", "nombre_comite")
    op.execute("UPDATE convocatoria SET estado = 'publicada' WHERE estado = 'cerrada'")
    op.create_table(
        "anexo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("convocatoria_id", sa.Integer(), sa.ForeignKey("convocatoria.id"), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("programa", sa.String(length=8)),
        sa.Column("ruta", sa.String(length=400), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("anexo")
    op.add_column("convocatoria", sa.Column("nombre_comite", sa.String(length=240), nullable=False, server_default=""))
    op.add_column("convocatoria", sa.Column("programa", sa.String(length=8), nullable=False, server_default="CC"))
    op.execute(
        "UPDATE convocatoria SET programa = COALESCE("
        "(SELECT programa FROM convocatoria_programa WHERE convocatoria_id = convocatoria.id LIMIT 1), 'CC')"
    )
    op.drop_table("convocatoria_programa")
