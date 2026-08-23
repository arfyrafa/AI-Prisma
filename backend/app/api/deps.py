"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Process
from app.repositories import readings as reading_repo

DbSession = Annotated[Session, Depends(get_db)]


def get_process_or_404(process_id: Annotated[int, Path(ge=1)], db: DbSession) -> Process:
    process = reading_repo.get_process(db, process_id)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proses tidak ditemukan.")
    return process


CurrentProcess = Annotated[Process, Depends(get_process_or_404)]


def current_user() -> str:
    """Placeholder identity.

    Authentication is intentionally out of scope for the MVP, but every write
    path already carries an actor so role-based access can be added here
    without touching the routes.
    """
    return "engineer"


CurrentUser = Annotated[str, Depends(current_user)]
