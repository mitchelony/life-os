from sqlalchemy import Enum as SQLEnum

from app.models.domain import Account, Debt, IncomeEntry, Obligation, Reserve, Task, Transaction


def test_postgres_enum_columns_use_sqlalchemy_enum_types() -> None:
    assert isinstance(Account.__table__.c.type.type, SQLEnum)
    assert isinstance(Transaction.__table__.c.kind.type, SQLEnum)
    assert isinstance(IncomeEntry.__table__.c.status.type, SQLEnum)
    assert isinstance(Obligation.__table__.c.frequency.type, SQLEnum)
    assert isinstance(Debt.__table__.c.status.type, SQLEnum)
    assert isinstance(Task.__table__.c.status.type, SQLEnum)
    assert isinstance(Reserve.__table__.c.kind.type, SQLEnum)
