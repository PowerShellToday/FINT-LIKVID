"""add match_amount column to recurring_invoice_configs

Revision ID: 0009
Revises: 0008
Create Date: 2026-01-01 00:09:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recurring_invoice_configs",
        sa.Column("match_amount", sa.Numeric(12, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recurring_invoice_configs", "match_amount")
