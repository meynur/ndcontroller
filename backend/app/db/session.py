from collections.abc import AsyncGenerator

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models import Base


settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_apply_compat_migrations)


def _apply_compat_migrations(connection: Connection) -> None:
    inspector = inspect(connection)

    if "nodes" not in inspector.get_table_names():
        return

    node_columns = {column["name"] for column in inspector.get_columns("nodes")}
    if "is_pinned" not in node_columns:
        connection.execute(
            text("ALTER TABLE nodes ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0")
        )
