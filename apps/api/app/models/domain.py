from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDTimestampMixin
from app.models.enums import (
    AccountType,
    DebtStatus,
    IncomeStatus,
    ObligationFrequency,
    ReserveKind,
    TaskStatus,
    TransactionKind,
)


class Profile(UUIDTimestampMixin, Base):
    __tablename__ = "profiles"

    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AppSetting(UUIDTimestampMixin, Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)


class OnboardingState(UUIDTimestampMixin, Base):
    __tablename__ = "onboarding_state"

    is_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_step: Mapped[str] = mapped_column(String(80), default="start", nullable=False)
    completed_at: Mapped[date | None] = mapped_column(Date, nullable=True)


class Category(UUIDTimestampMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    group: Mapped[str] = mapped_column(String(40), default="general", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Account(UUIDTimestampMixin, Base):
    __tablename__ = "accounts"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[AccountType] = mapped_column(String(24), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(120), nullable=True)
    balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Merchant(UUIDTimestampMixin, Base):
    __tablename__ = "merchants"

    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(24), default="merchant", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class IncomeSource(UUIDTimestampMixin, Base):
    __tablename__ = "income_sources"

    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(24), default="income", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Transaction(UUIDTimestampMixin, Base):
    __tablename__ = "transactions"

    kind: Mapped[TransactionKind] = mapped_column(String(24), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    merchant_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("merchants.id"), nullable=True)
    income_source_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("income_sources.id"), nullable=True)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_planned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_cleared: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    account = relationship("Account")
    category = relationship("Category")
    merchant = relationship("Merchant")
    income_source = relationship("IncomeSource")


class IncomeEntry(UUIDTimestampMixin, Base):
    __tablename__ = "income_entries"

    source_name: Mapped[str] = mapped_column(String(160), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[IncomeStatus] = mapped_column(String(24), default=IncomeStatus.expected.value, nullable=False)
    expected_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    received_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Obligation(UUIDTimestampMixin, Base):
    __tablename__ = "obligations"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    due_on: Mapped[date] = mapped_column(Date, nullable=False)
    frequency: Mapped[ObligationFrequency] = mapped_column(String(24), default=ObligationFrequency.one_time.value)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Debt(UUIDTimestampMixin, Base):
    __tablename__ = "debts"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    balance: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    minimum_payment: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[DebtStatus] = mapped_column(String(24), default=DebtStatus.active.value, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Task(UUIDTimestampMixin, Base):
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(String(24), default=TaskStatus.todo.value, nullable=False)
    due_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    linked_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    linked_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Reserve(UUIDTimestampMixin, Base):
    __tablename__ = "reserves"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    kind: Mapped[ReserveKind] = mapped_column(String(24), default=ReserveKind.manual.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

