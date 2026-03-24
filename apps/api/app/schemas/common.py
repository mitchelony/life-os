from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedRead(ORMBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class DateWindow(BaseModel):
    start: date | None = None
    end: date | None = None

