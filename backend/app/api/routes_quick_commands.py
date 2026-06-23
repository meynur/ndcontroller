from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.quick_command import QuickCommandCreate, QuickCommandRead, QuickCommandUpdate
from app.services.quick_command_service import QuickCommandService


router = APIRouter(prefix="/quick-commands", tags=["quick-commands"])


@router.get("", response_model=list[QuickCommandRead])
async def list_quick_commands(
    session: AsyncSession = Depends(get_db_session),
) -> list[QuickCommandRead]:
    return await QuickCommandService.list_commands(session)


@router.post("", response_model=QuickCommandRead, status_code=status.HTTP_201_CREATED)
async def create_quick_command(
    payload: QuickCommandCreate,
    session: AsyncSession = Depends(get_db_session),
) -> QuickCommandRead:
    return await QuickCommandService.create_command(session, payload)


@router.get("/{command_id}", response_model=QuickCommandRead)
async def get_quick_command(
    command_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> QuickCommandRead:
    command = await QuickCommandService.get_command(session, command_id)
    if command is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick command not found")

    return command


@router.put("/{command_id}", response_model=QuickCommandRead)
async def update_quick_command(
    command_id: int,
    payload: QuickCommandUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> QuickCommandRead:
    command = await QuickCommandService.update_command(session, command_id, payload)
    if command is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick command not found")

    return command


@router.delete("/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quick_command(
    command_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    deleted = await QuickCommandService.delete_command(session, command_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick command not found")
