from pydantic import BaseModel, Field


class TerminalInputMessage(BaseModel):
    type: str
    data: str | None = None
    cols: int | None = Field(default=None, ge=1)
    rows: int | None = Field(default=None, ge=1)


class TerminalOutputMessage(BaseModel):
    type: str
    data: str | None = None
    message: str | None = None
    cols: int | None = None
    rows: int | None = None
