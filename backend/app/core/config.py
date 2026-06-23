from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Node Controller API"
    api_prefix: str = "/api"
    debug: bool = False

    database_url: str = "sqlite+aiosqlite:///./data/node_controller.db"
    app_secret_key: str = Field(..., min_length=16)

    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    ssh_connect_timeout: int = 10
    ssh_command_timeout: int = 120
    ssh_disable_known_hosts: bool = True
    ssh_known_hosts_file: str | None = None
    monitoring_interval_seconds: int = 60
    monitoring_max_points: int = 30
    monitoring_command_timeout: int = 15
    monitoring_max_concurrency: int = 5
    max_bulk_job_concurrency: int = 5
    default_terminal_cols: int = 120
    default_terminal_rows: int = 32
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    def ensure_sqlite_directory(self) -> None:
        prefix = "sqlite+aiosqlite:///"
        if not self.database_url.startswith(prefix):
            return

        database_path = self.database_url.removeprefix(prefix)
        path = Path(database_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_sqlite_directory()
    return settings
