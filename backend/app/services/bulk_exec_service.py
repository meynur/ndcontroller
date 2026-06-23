import asyncio
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models.bulk_job import BulkJob, BulkJobResult
from app.models.enums import BulkJobResultStatus, BulkJobStatus
from app.models.node import Node
from app.models.quick_command import QuickCommand
from app.schemas.bulk_job import BulkJobCreate, BulkJobRead
from app.services.ssh_service import SSHCommandResult, SSHService


class BulkExecutionService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        ssh_service: SSHService,
        max_concurrency: int = 5,
    ) -> None:
        self._session_factory = session_factory
        self._ssh_service = ssh_service
        self._max_concurrency = max_concurrency
        self._tasks: set[asyncio.Task[None]] = set()

    async def create_job(self, payload: BulkJobCreate) -> BulkJobRead:
        async with self._session_factory() as session:
            command = await self._resolve_command(session, payload)
            nodes = await self._get_nodes(session, payload.node_ids)

            job = BulkJob(
                title=payload.title,
                command=command,
                quick_command_id=payload.quick_command_id,
                status=BulkJobStatus.PENDING,
                results=[
                    BulkJobResult(node_id=node.id, status=BulkJobResultStatus.PENDING)
                    for node in nodes
                ],
            )

            session.add(job)
            await session.commit()

            created_job = await self.get_job(session, job.id)
            if created_job is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Unable to create bulk job",
                )

            self._schedule(job.id)
            return created_job

    def _schedule(self, job_id: int) -> None:
        task = asyncio.create_task(self._run_job(job_id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run_job(self, job_id: int) -> None:
        async with self._session_factory() as session:
            job = await self._load_job_model(session, job_id)
            if job is None:
                return

            job.status = BulkJobStatus.RUNNING
            job.started_at = datetime.now(UTC)
            await session.commit()

            result_ids = [result.id for result in job.results]

        semaphore = asyncio.Semaphore(self._max_concurrency)
        await asyncio.gather(*(self._run_job_result(result_id, semaphore) for result_id in result_ids))

        async with self._session_factory() as session:
            job = await self._load_job_model(session, job_id)
            if job is None:
                return

            success_count = sum(1 for result in job.results if result.status == BulkJobResultStatus.SUCCESS)
            error_count = sum(1 for result in job.results if result.status == BulkJobResultStatus.ERROR)

            if success_count and error_count:
                job.status = BulkJobStatus.PARTIAL
            elif success_count and not error_count:
                job.status = BulkJobStatus.COMPLETED
            else:
                job.status = BulkJobStatus.FAILED

            job.finished_at = datetime.now(UTC)
            await session.commit()

    async def _run_job_result(self, result_id: int, semaphore: asyncio.Semaphore) -> None:
        async with semaphore:
            async with self._session_factory() as session:
                result = await session.get(
                    BulkJobResult,
                    result_id,
                    options=[
                        selectinload(BulkJobResult.node),
                        selectinload(BulkJobResult.job),
                    ],
                )
                if result is None or result.job is None or result.node is None:
                    return

                result.status = BulkJobResultStatus.RUNNING
                result.started_at = datetime.now(UTC)
                await session.commit()

                try:
                    execution_result = await self._ssh_service.run_command(
                        node=result.node,
                        command=result.job.command,
                    )
                    self._apply_execution_result(result, execution_result)
                except Exception as exc:  # noqa: BLE001
                    result.status = BulkJobResultStatus.ERROR
                    result.exit_code = -1
                    result.stdout = ""
                    result.stderr = str(exc)
                finally:
                    result.finished_at = datetime.now(UTC)
                    await session.commit()

    @staticmethod
    def _apply_execution_result(result: BulkJobResult, execution_result: SSHCommandResult) -> None:
        result.exit_code = execution_result.exit_code
        result.stdout = execution_result.stdout
        result.stderr = execution_result.stderr
        result.status = (
            BulkJobResultStatus.SUCCESS if execution_result.success else BulkJobResultStatus.ERROR
        )

    async def _resolve_command(self, session: AsyncSession, payload: BulkJobCreate) -> str:
        if payload.command:
            return payload.command

        quick_command = await session.get(QuickCommand, payload.quick_command_id)
        if quick_command is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quick command not found",
            )
        return quick_command.command

    async def _get_nodes(self, session: AsyncSession, node_ids: list[int]) -> list[Node]:
        result = await session.execute(select(Node).where(Node.id.in_(node_ids)).order_by(Node.id.asc()))
        nodes = result.scalars().all()

        requested_ids = set(node_ids)
        found_ids = {node.id for node in nodes}
        missing_ids = sorted(requested_ids - found_ids)
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nodes not found: {', '.join(map(str, missing_ids))}",
            )

        return nodes

    @staticmethod
    async def _load_job_model(session: AsyncSession, job_id: int) -> BulkJob | None:
        result = await session.execute(
            select(BulkJob)
            .where(BulkJob.id == job_id)
            .options(selectinload(BulkJob.results))
        )
        return result.scalars().unique().one_or_none()

    @classmethod
    async def get_job(cls, session: AsyncSession, job_id: int) -> BulkJobRead | None:
        result = await session.execute(
            select(BulkJob)
            .where(BulkJob.id == job_id)
            .options(selectinload(BulkJob.results))
        )
        job = result.scalars().unique().one_or_none()
        if job is None:
            return None
        return BulkJobRead.model_validate(job)

    @classmethod
    async def list_jobs(cls, session: AsyncSession) -> list[BulkJobRead]:
        result = await session.execute(
            select(BulkJob)
            .order_by(BulkJob.created_at.desc(), BulkJob.id.desc())
            .options(selectinload(BulkJob.results))
        )
        jobs = result.scalars().unique().all()
        return [BulkJobRead.model_validate(job) for job in jobs]
