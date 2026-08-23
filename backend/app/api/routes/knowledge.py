"""Knowledge base endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession
from app.schemas import KnowledgeDocumentDetail, KnowledgeDocumentOut
from app.services import knowledge as knowledge_service

router = APIRouter(prefix="/knowledge-base", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeDocumentOut])
def list_documents(
    db: DbSession,
    q: Annotated[str | None, Query(description="Kata kunci pencarian")] = None,
    doc_type: str | None = None,
) -> list[KnowledgeDocumentOut]:
    rows = knowledge_service.list_documents(db, q, doc_type)
    return [KnowledgeDocumentOut.model_validate(row) for row in rows]


@router.get("/{document_id}", response_model=KnowledgeDocumentDetail)
def get_document(document_id: int, db: DbSession) -> KnowledgeDocumentDetail:
    document = knowledge_service.get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan.")
    return KnowledgeDocumentDetail.model_validate(document)
