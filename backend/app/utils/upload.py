"""Upload validation helpers."""
from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.services.materials import SUPPORTED_EXTENSIONS
from app.utils.errors import api_error

ZIP_SIGNATURE = b"PK\x03\x04"
PDF_SIGNATURE = b"%PDF-"
TEXT_EXTENSIONS = {".txt", ".md"}
ZIP_EXTENSIONS = {".docx", ".epub"}


def max_upload_bytes() -> int:
    return max(1, settings.MAX_UPLOAD_SIZE_MB) * 1024 * 1024


async def read_validated_upload(file: UploadFile) -> bytes:
    """Read an UploadFile while enforcing size and basic magic-byte checks."""
    filename = file.filename or "material"
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise api_error(400, "unsupported_material_type", f"Unsupported material file type: {suffix or 'unknown'}")

    content = await _read_with_limit(file)
    validate_magic_bytes(filename, content)
    return content


async def _read_with_limit(file: UploadFile) -> bytes:
    limit = max_upload_bytes()
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise api_error(413, "upload_too_large", f"Upload exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")
        chunks.append(chunk)

    return b"".join(chunks)


def validate_magic_bytes(filename: str, content: bytes) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix in ZIP_EXTENSIONS and not content.startswith(ZIP_SIGNATURE):
        raise api_error(400, "invalid_upload_signature", f"{suffix} upload does not look like a valid ZIP-based document")
    if suffix == ".pdf" and not content.startswith(PDF_SIGNATURE):
        raise api_error(400, "invalid_upload_signature", "PDF upload does not start with a PDF signature")
    if suffix in TEXT_EXTENSIONS:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError as error:
            raise api_error(400, "invalid_text_upload", "Text uploads must be valid UTF-8") from error
