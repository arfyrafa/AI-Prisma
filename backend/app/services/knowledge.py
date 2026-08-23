"""Knowledge base retrieval. Kept deliberately simple so it can later be
replaced by a RAG index without touching the API contract."""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import KnowledgeDocument


def list_documents(
    db: Session, query: str | None = None, doc_type: str | None = None, limit: int = 100
) -> list[KnowledgeDocument]:
    stmt = select(KnowledgeDocument)
    if doc_type:
        stmt = stmt.where(KnowledgeDocument.doc_type == doc_type)
    if query:
        pattern = f"%{query.lower()}%"
        stmt = stmt.where(
            or_(
                KnowledgeDocument.title.ilike(pattern),
                KnowledgeDocument.summary.ilike(pattern),
                KnowledgeDocument.content.ilike(pattern),
                KnowledgeDocument.reference_code.ilike(pattern),
            )
        )
    return list(db.scalars(stmt.order_by(KnowledgeDocument.doc_type, KnowledgeDocument.title).limit(limit)))


def get_document(db: Session, document_id: int) -> KnowledgeDocument | None:
    return db.get(KnowledgeDocument, document_id)
