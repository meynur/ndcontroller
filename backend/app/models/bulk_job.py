from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import BulkJobResultStatus, BulkJobStatus


class BulkJob(Base):
    __tablename__ = "bulk_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str | None] = mapped_column(String(160), nullable=True)
    command: Mapped[str] = mapped_column(Text, nullable=False)
    quick_command_id: Mapped[int | None] = mapped_column(
        ForeignKey("quick_commands.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[BulkJobStatus] = mapped_column(
        Enum(BulkJobStatus, native_enum=False), nullable=False, default=BulkJobStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    quick_command: Mapped["QuickCommand | None"] = relationship(
        "QuickCommand",
        back_populates="bulk_jobs",
    )
    results: Mapped[list["BulkJobResult"]] = relationship(
        "BulkJobResult",
        back_populates="job",
        cascade="all, delete-orphan",
    )


class BulkJobResult(Base):
    __tablename__ = "bulk_job_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=False)
    node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[BulkJobResultStatus] = mapped_column(
        Enum(BulkJobResultStatus, native_enum=False),
        nullable=False,
        default=BulkJobResultStatus.PENDING,
    )
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    job: Mapped["BulkJob"] = relationship("BulkJob", back_populates="results")
    node: Mapped["Node"] = relationship("Node", back_populates="bulk_job_results")
