from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import BulkJobResultStatus, BulkJobStatus


class BulkJobCreate(BaseModel):
    title: str | None = Field(default=None, max_length=160)
    node_ids: list[int] = Field(min_length=1)
    command: str | None = None
    quick_command_id: int | None = None

    @model_validator(mode="after")
    def validate_command_source(self) -> "BulkJobCreate":
        if not self.command and self.quick_command_id is None:
            raise ValueError("Either command or quick_command_id must be provided")
        if self.command and self.quick_command_id is not None:
            raise ValueError("Provide either command or quick_command_id, not both")
        return self


class BulkJobResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    node_id: int
    status: BulkJobResultStatus
    exit_code: int | None
    stdout: str | None
    stderr: str | None
    started_at: datetime | None
    finished_at: datetime | None


class BulkJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None
    command: str
    quick_command_id: int | None
    status: BulkJobStatus
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    results: list[BulkJobResultRead]
