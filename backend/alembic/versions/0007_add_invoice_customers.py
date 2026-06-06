"""add invoice_customers table and customer columns to future_invoice_plans

Revision ID: 0007
Revises: 0006
Create Date: 2026-01-01 00:07:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invoice_customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_delay_days", sa.Integer(), nullable=False),
        sa.Column("invoice_day_rule", sa.String(50), nullable=False, server_default="last_day"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.add_column(
        "future_invoice_plans",
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("invoice_customers.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column(
        "future_invoice_plans",
        sa.Column("customer_name", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("future_invoice_plans", "customer_name")
    op.drop_column("future_invoice_plans", "customer_id")
    op.drop_table("invoice_customers")
