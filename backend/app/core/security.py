import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _build_fernet() -> Fernet:
    secret = get_settings().app_secret_key.encode("utf-8")
    digest = hashlib.sha256(secret).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    if value == "":
        return ""
    return _build_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    if value == "":
        return ""
    try:
        return _build_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt secret with current APP_SECRET_KEY") from exc
