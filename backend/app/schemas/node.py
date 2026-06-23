from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NodeBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=22, ge=1, le=65535)
    username: str = Field(min_length=1, max_length=120)
    note: str | None = None


class NodeCreate(NodeBase):
    password: str = Field(min_length=1)


class NodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    host: str | None = Field(default=None, min_length=1, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    username: str | None = Field(default=None, min_length=1, max_length=120)
    password: str | None = None
    note: str | None = None


class NodeSummary(NodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    has_password: bool
    created_at: datetime
    updated_at: datetime


class NodeDetail(NodeSummary):
    password: str


class NodeCommandRequest(BaseModel):
    command: str = Field(min_length=1)


class CommandExecutionResponse(BaseModel):
    node_id: int
    command: str
    exit_code: int
    stdout: str
    stderr: str
    success: bool
