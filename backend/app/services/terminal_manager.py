import asyncio
import contextlib
import json

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.node import Node
from app.schemas.terminal import TerminalInputMessage
from app.services.ssh_service import SSHService


class TerminalManager:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        ssh_service: SSHService,
        default_cols: int = 120,
        default_rows: int = 32,
    ) -> None:
        self._session_factory = session_factory
        self._ssh_service = ssh_service
        self._default_cols = default_cols
        self._default_rows = default_rows

    async def handle_connection(self, websocket: WebSocket, node_id: int) -> None:
        await websocket.accept()

        node = await self._load_node(node_id)
        if node is None:
            await websocket.send_json({"type": "error", "message": "Node not found"})
            await websocket.close(code=4404)
            return

        try:
            connection, process = await self._ssh_service.open_terminal(
                node=node,
                cols=self._default_cols,
                rows=self._default_rows,
            )
        except Exception as exc:  # noqa: BLE001
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close(code=1011)
            return

        forward_task = asyncio.create_task(self._forward_terminal_output(websocket, process))

        try:
            while True:
                raw_message = await websocket.receive_text()
                payload = TerminalInputMessage.model_validate(json.loads(raw_message))

                if payload.type == "input" and payload.data is not None:
                    process.stdin.write(payload.data)
                    await process.stdin.drain()
                elif payload.type == "resize" and payload.cols and payload.rows:
                    process.channel.change_terminal_size(payload.cols, payload.rows)
                elif payload.type == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        finally:
            forward_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await forward_task

            process.close()
            connection.close()
            await connection.wait_closed()

    async def _load_node(self, node_id: int) -> Node | None:
        async with self._session_factory() as session:
            return await session.get(Node, node_id)

    async def _forward_terminal_output(self, websocket: WebSocket, process) -> None:
        while True:
            chunk = await process.stdout.read(1024)
            if not chunk:
                break
            await websocket.send_json({"type": "output", "data": chunk})

        exit_status = process.exit_status if process.exit_status is not None else 0
        await websocket.send_json({"type": "exit", "data": str(exit_status)})
