"""Knowledge base endpoints with PDF/DOCX/TXT upload support."""

import os
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import DbSession
from app.schemas import (
    KnowledgeDocumentCreate,
    KnowledgeDocumentDetail,
    KnowledgeDocumentOut,
)
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


@router.post("/upload", response_model=KnowledgeDocumentDetail, status_code=status.HTTP_201_CREATED)
async def upload_document(
    db: DbSession,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    doc_type: str = Form("SOP"),
    reference_code: str | None = Form(None),
    summary: str | None = Form(None),
    version: str = Form("1.0"),
    tags: str | None = Form(None),
) -> KnowledgeDocumentDetail:
    """Extract text from uploaded PDF/Word/TXT/MD file and index into RAG Knowledge Base."""
    try:
        content_bytes = await file.read()
        filename = file.filename or "uploaded_document"
        
        extracted_text = knowledge_service.extract_text_from_file(filename, content_bytes)
        if not extracted_text or len(extracted_text.strip()) < 10:
            if filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tidak dapat mengekstrak teks dari PDF ini. Pastikan file PDF memiliki layer teks (bukan hasil scan/foto murni tanpa OCR).",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat mengekstrak teks dari file yang diunggah. Pastikan file berisi teks yang dapat dibaca.",
            )

        doc_title = title.strip() if title and title.strip() else os.path.splitext(filename)[0].replace("_", " ").title()
        ref_code = reference_code.strip() if reference_code and reference_code.strip() else f"SOP-USR-{filename[:6].upper().replace('.', '')}"
        doc_summary = summary.strip() if summary and summary.strip() else f"Dokumen diunggah dari file {filename} ({len(extracted_text.splitlines())} baris)."

        tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else ["upload", doc_type.lower()]

        doc_create = KnowledgeDocumentCreate(
            title=doc_title,
            doc_type=doc_type,
            reference_code=ref_code,
            version=version,
            summary=doc_summary,
            content=extracted_text,
            tags=tag_list,
        )
        saved_doc = knowledge_service.create_document(db, doc_create)
        return KnowledgeDocumentDetail.model_validate(saved_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses unggahan dokumen: {str(e)}",
        ) from e


@router.post("", response_model=KnowledgeDocumentDetail, status_code=status.HTTP_201_CREATED)
def create_document(payload: KnowledgeDocumentCreate, db: DbSession) -> KnowledgeDocumentDetail:
    saved_doc = knowledge_service.create_document(db, payload)
    return KnowledgeDocumentDetail.model_validate(saved_doc)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: DbSession) -> None:
    success = knowledge_service.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokumen tidak ditemukan.")
