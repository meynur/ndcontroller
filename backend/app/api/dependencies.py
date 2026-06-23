from starlette.requests import HTTPConnection

from app.services.bulk_exec_service import BulkExecutionService
from app.services.ssh_service import SSHService
from app.services.terminal_manager import TerminalManager


def get_ssh_service(connection: HTTPConnection) -> SSHService:
    return connection.app.state.ssh_service


def get_bulk_execution_service(connection: HTTPConnection) -> BulkExecutionService:
    return connection.app.state.bulk_execution_service


def get_terminal_manager(connection: HTTPConnection) -> TerminalManager:
    return connection.app.state.terminal_manager
