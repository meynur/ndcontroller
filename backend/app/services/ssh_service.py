import asyncio
from dataclasses import dataclass

import asyncssh

from app.core.config import Settings
from app.core.security import decrypt_secret
from app.models.node import Node


@dataclass(slots=True)
class SSHCommandResult:
    exit_code: int
    stdout: str
    stderr: str

    @property
    def success(self) -> bool:
        return self.exit_code == 0


class SSHService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def run_command(self, node: Node, command: str) -> SSHCommandResult:
        connection = await self._connect(node)
        try:
            result = await asyncio.wait_for(
                connection.run(command, check=False),
                timeout=self._settings.ssh_command_timeout,
            )
            return SSHCommandResult(
                exit_code=result.exit_status,
                stdout=result.stdout,
                stderr=result.stderr,
            )
        finally:
            connection.close()
            await connection.wait_closed()

    async def open_terminal(
        self,
        node: Node,
        cols: int,
        rows: int,
    ) -> tuple[asyncssh.SSHClientConnection, asyncssh.SSHClientProcess[str]]:
        connection = await self._connect(node)
        process = await connection.create_process(
            term_type="xterm-256color",
            term_size=(cols, rows),
            encoding="utf-8",
        )
        return connection, process

    async def _connect(self, node: Node) -> asyncssh.SSHClientConnection:
        password = decrypt_secret(node.password_encrypted)
        known_hosts = None if self._settings.ssh_disable_known_hosts else self._settings.ssh_known_hosts_file

        return await asyncssh.connect(
            host=node.host,
            port=node.port,
            username=node.username,
            password=password,
            known_hosts=known_hosts,
            connect_timeout=self._settings.ssh_connect_timeout,
        )
