from __future__ import annotations

import asyncio
from collections import deque
from datetime import UTC, datetime
from typing import Literal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.models.node import Node
from app.schemas.node import NodeMetricPoint, NodeStatsResponse
from app.services.monitoring_parser import (
    MEMINFO_MARKER,
    ProcSnapshot,
    build_metric_point,
    parse_proc_snapshot,
)
from app.services.ssh_service import SSHService


NodeStatus = Literal["online", "offline"]

MONITORING_COMMAND = (
    "cat /proc/stat && "
    f"printf '\\n{MEMINFO_MARKER}\\n' && "
    "cat /proc/meminfo"
)


class MonitoringService:
    def __init__(
        self,
        *,
        session_factory: async_sessionmaker[AsyncSession],
        ssh_service: SSHService,
        settings: Settings,
    ) -> None:
        self._session_factory = session_factory
        self._ssh_service = ssh_service
        self._settings = settings
        self._metrics: dict[int, deque[NodeMetricPoint]] = {}
        self._statuses: dict[int, NodeStatus] = {}
        self._proc_snapshots: dict[int, ProcSnapshot] = {}
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()
        self._telegram_client = httpx.AsyncClient(timeout=10.0)

    def start(self) -> None:
        if self._task is not None and not self._task.done():
            return

        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop(), name="node-monitoring-loop")

    async def stop(self) -> None:
        self._stop_event.set()

        task = self._task
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            self._task = None

        await self._telegram_client.aclose()

    def get_status(self, node_id: int) -> NodeStatus:
        return self._statuses.get(node_id, "offline")

    def get_all_statuses(self, node_ids: list[int]) -> dict[int, NodeStatus]:
        return {node_id: self.get_status(node_id) for node_id in node_ids}

    def get_node_stats(self, node_id: int) -> NodeStatsResponse:
        return NodeStatsResponse(
            node_id=node_id,
            status=self.get_status(node_id),
            metrics=list(self._metrics.get(node_id, ())),
        )

    async def _run_loop(self) -> None:
        try:
            while not self._stop_event.is_set():
                await self._poll_all_nodes()
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=self._settings.monitoring_interval_seconds,
                    )
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            raise

    async def _poll_all_nodes(self) -> None:
        async with self._session_factory() as session:
            result = await session.execute(select(Node))
            nodes = result.scalars().all()

        semaphore = asyncio.Semaphore(self._settings.monitoring_max_concurrency)
        await asyncio.gather(*(self._poll_single_node(node, semaphore) for node in nodes))

    async def _poll_single_node(self, node: Node, semaphore: asyncio.Semaphore) -> None:
        async with semaphore:
            timestamp = datetime.now(UTC)
            previous_status = self._statuses.get(node.id)

            try:
                result = await self._ssh_service.run_command(
                    node=node,
                    command=MONITORING_COMMAND,
                    timeout=self._settings.monitoring_command_timeout,
                )
            except Exception:
                current_status: NodeStatus = "offline"
                metric = NodeMetricPoint(timestamp=timestamp, cpu_percent=None, ram_percent=None)
                self._proc_snapshots.pop(node.id, None)
            else:
                current_status = "online"
                metric = self._build_online_metric(node=node, timestamp=timestamp, output=result.stdout, ok=result.success)

            self._statuses[node.id] = current_status
            self._append_metric(node.id, metric)

            if previous_status is not None and previous_status != current_status:
                await self._send_status_change_alert(node=node, status=current_status)

    def _build_online_metric(
        self,
        *,
        node: Node,
        timestamp: datetime,
        output: str,
        ok: bool,
    ) -> NodeMetricPoint:
        if not ok:
            self._proc_snapshots.pop(node.id, None)
            return NodeMetricPoint(timestamp=timestamp, cpu_percent=None, ram_percent=None)

        try:
            current_snapshot = parse_proc_snapshot(output)
        except ValueError:
            self._proc_snapshots.pop(node.id, None)
            return NodeMetricPoint(timestamp=timestamp, cpu_percent=None, ram_percent=None)

        previous_snapshot = self._proc_snapshots.get(node.id)
        metric = build_metric_point(
            timestamp=timestamp,
            current=current_snapshot,
            previous=previous_snapshot,
        )
        self._proc_snapshots[node.id] = current_snapshot
        return metric

    def _append_metric(self, node_id: int, metric: NodeMetricPoint) -> None:
        if node_id not in self._metrics:
            self._metrics[node_id] = deque(maxlen=self._settings.monitoring_max_points)
        self._metrics[node_id].append(metric)

    async def _send_status_change_alert(self, *, node: Node, status: NodeStatus) -> None:
        token = self._settings.telegram_bot_token
        chat_id = self._settings.telegram_chat_id
        if not token or not chat_id:
            return

        emoji = "\u2705" if status == "online" else "\U0001F6A8"
        status_text = "ONLINE" if status == "online" else "OFFLINE"
        message = (
            f"{emoji} Node Controller\n"
            f"Node: {node.name}\n"
            f"Host: {node.host}:{node.port}\n"
            f"Status: {status_text}"
        )

        try:
            await self._telegram_client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": message,
                },
            )
        except Exception:
            return
