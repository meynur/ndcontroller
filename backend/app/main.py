from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api.routes_terminal import router as terminal_router
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, init_db
from app.services.bulk_exec_service import BulkExecutionService
from app.services.ssh_service import SSHService
from app.services.terminal_manager import TerminalManager


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    ssh_service = SSHService(settings=settings)
    bulk_execution_service = BulkExecutionService(
        session_factory=AsyncSessionLocal,
        ssh_service=ssh_service,
        max_concurrency=settings.max_bulk_job_concurrency,
    )
    terminal_manager = TerminalManager(
        session_factory=AsyncSessionLocal,
        ssh_service=ssh_service,
        default_cols=settings.default_terminal_cols,
        default_rows=settings.default_terminal_rows,
    )

    app.state.ssh_service = ssh_service
    app.state.bulk_execution_service = bulk_execution_service
    app.state.terminal_manager = terminal_manager

    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)
app.include_router(terminal_router)


@app.get("/health", tags=["system"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
