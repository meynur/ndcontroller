from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class QuickCommandBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    command: str = Field(min_length=1)
    description: str | None = None


class QuickCommandCreate(QuickCommandBase):
    pass


class QuickCommandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    command: str | None = Field(default=None, min_length=1)
    description: str | None = None


class QuickCommandRead(QuickCommandBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
