"""La cuenta se puede desactivar.

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
    op.add_column("cuenta", sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("cuenta", "activo")
