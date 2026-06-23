from fastapi import APIRouter, Depends, WebSocket

from app.api.dependencies import get_terminal_manager
from app.services.terminal_manager import TerminalManager


router = APIRouter(tags=["terminal"])


@router.websocket("/ws/terminal/{node_id}")
async def terminal_websocket(
    websocket: WebSocket,
    node_id: int,
    terminal_manager: TerminalManager = Depends(get_terminal_manager),
) -> None:
    await terminal_manager.handle_connection(websocket=websocket, node_id=node_id)
