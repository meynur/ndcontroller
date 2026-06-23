from fastapi import APIRouter

from app.api.routes_bulk_jobs import router as bulk_jobs_router
from app.api.routes_nodes import router as nodes_router
from app.api.routes_quick_commands import router as quick_commands_router


api_router = APIRouter()
api_router.include_router(nodes_router)
api_router.include_router(quick_commands_router)
api_router.include_router(bulk_jobs_router)
