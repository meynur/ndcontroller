from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quick_command import QuickCommand
from app.schemas.quick_command import QuickCommandCreate, QuickCommandRead, QuickCommandUpdate


class QuickCommandService:
    @staticmethod
    async def list_commands(session: AsyncSession) -> list[QuickCommandRead]:
        result = await session.execute(
            select(QuickCommand).order_by(QuickCommand.created_at.desc(), QuickCommand.id.desc())
        )
        commands = result.scalars().all()
        return [QuickCommandRead.model_validate(command) for command in commands]

    @staticmethod
    async def create_command(
        session: AsyncSession,
        payload: QuickCommandCreate,
    ) -> QuickCommandRead:
        command = QuickCommand(**payload.model_dump())
        session.add(command)
        await session.commit()
        await session.refresh(command)
        return QuickCommandRead.model_validate(command)

    @staticmethod
    async def get_command(session: AsyncSession, command_id: int) -> QuickCommandRead | None:
        command = await session.get(QuickCommand, command_id)
        if command is None:
            return None
        return QuickCommandRead.model_validate(command)

    @staticmethod
    async def update_command(
        session: AsyncSession,
        command_id: int,
        payload: QuickCommandUpdate,
    ) -> QuickCommandRead | None:
        command = await session.get(QuickCommand, command_id)
        if command is None:
            return None

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(command, field, value)

        await session.commit()
        await session.refresh(command)
        return QuickCommandRead.model_validate(command)

    @staticmethod
    async def delete_command(session: AsyncSession, command_id: int) -> bool:
        command = await session.get(QuickCommand, command_id)
        if command is None:
            return False

        await session.delete(command)
        await session.commit()
        return True
