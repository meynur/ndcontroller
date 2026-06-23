from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_bulk_execution_service
from app.db.session import get_db_session
from app.schemas.bulk_job import BulkJobCreate, BulkJobRead
from app.services.bulk_exec_service import BulkExecutionService


router = APIRouter(prefix="/bulk-jobs", tags=["bulk-jobs"])


@router.get("", response_model=list[BulkJobRead])
async def list_bulk_jobs(session: AsyncSession = Depends(get_db_session)) -> list[BulkJobRead]:
    return await BulkExecutionService.list_jobs(session)


@router.post("", response_model=BulkJobRead, status_code=status.HTTP_202_ACCEPTED)
async def create_bulk_job(
    payload: BulkJobCreate,
    service: BulkExecutionService = Depends(get_bulk_execution_service),
) -> BulkJobRead:
    return await service.create_job(payload)


@router.get("/{job_id}", response_model=BulkJobRead)
async def get_bulk_job(
    job_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> BulkJobRead:
    job = await BulkExecutionService.get_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bulk job not found")

    return job
