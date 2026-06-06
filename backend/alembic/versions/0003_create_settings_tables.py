"""create settings tables

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-01 00:02:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "salary_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("net_monthly_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "tax_social_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("net_monthly_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "recurring_invoice_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("supplier_name", sa.String(255), nullable=False),
        sa.Column("interval_months", sa.Integer(), nullable=False),
        sa.Column("override_total", sa.Numeric(12, 2), nullable=True),
        sa.Column("override_vat", sa.Numeric(12, 2), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "future_invoice_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_month", sa.Date(), nullable=False),
        sa.Column("billable_hours", sa.Numeric(8, 2), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("payment_delay_days", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "one_off_expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("planned_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "user_defaults",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("default_hourly_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("default_payment_delay_days", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_defaults")
    op.drop_table("one_off_expenses")
    op.drop_table("future_invoice_plans")
    op.drop_table("recurring_invoice_configs")
    op.drop_table("tax_social_settings")
    op.drop_table("salary_settings")
