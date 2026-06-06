"""add day_fractions column to future_invoice_plans

Revision ID: 0008
Revises: 0007
Create Date: 2026-01-01 00:08:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "future_invoice_plans",
        sa.Column("day_fractions", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("future_invoice_plans", "day_fractions")
