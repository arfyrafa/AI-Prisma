import io
import logging
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import KnowledgeDocument
from app.schemas import KnowledgeDocumentCreate, KnowledgeDocumentUpdate

logger = logging.getLogger(__name__)


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extracts readable text from PDF, DOCX, TXT, or MD files without hard dependencies."""
    lower_name = filename.lower()
    
    # 1. DOCX (Word Document) - Pure Python via standard zipfile & XML
    if lower_name.endswith('.docx'):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as docx_zip:
                xml_content = docx_zip.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                # Word XML namespaces
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in tree.iterfind('.//w:p', namespaces):
                    texts = [node.text for node in p.iterfind('.//w:t', namespaces) if node.text]
                    if texts:
                        paragraphs.append(''.join(texts))
                extracted = '\n\n'.join(paragraphs).strip()
                if extracted:
                    return extracted
        except Exception as e:
            logger.warning("DOCX extraction via zipfile failed: %s", e)

    # 2. PDF (Adobe Acrobat)
    if lower_name.endswith('.pdf'):
        # Try pypdf first if available
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            extracted = '\n\n'.join(pages_text).strip()
            if extracted:
                return extracted
        except Exception:
            pass

        # Fallback PDF text stream regex extractor (Pure Python)
        try:
            raw_str = content.decode('latin-1', errors='ignore')
            # Extract text within BT ... ET blocks or Tj / TJ operators
            text_chunks = []
            for match in re.finditer(r'\((.*?)\)\s*Tj', raw_str):
                chunk = match.group(1).replace(r'\(', '(').replace(r'\)', ')')
                if len(chunk.strip()) > 1:
                    text_chunks.append(chunk)
            for match in re.finditer(r'\[(.*?)\]\s*TJ', raw_str):
                items = re.findall(r'\((.*?)\)', match.group(1))
                chunk = ''.join(items)
                if len(chunk.strip()) > 1:
                    text_chunks.append(chunk)
            if text_chunks:
                return '\n'.join(text_chunks[:500])
        except Exception as e:
            logger.warning("Fallback PDF stream extraction failed: %s", e)

    # 3. Plaintext, Markdown, CSV, JSON
    for enc in ('utf-8', 'utf-8-sig', 'latin-1', 'cp1252'):
        try:
            return content.decode(enc).strip()
        except Exception:
            continue

    return content.decode('utf-8', errors='ignore').strip()


def list_documents(
    db: Session, query: str | None = None, doc_type: str | None = None, limit: int = 100
) -> list[KnowledgeDocument]:
    stmt = select(KnowledgeDocument)
    if doc_type and doc_type != "all":
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


def create_document(db: Session, data: KnowledgeDocumentCreate) -> KnowledgeDocument:
    doc = KnowledgeDocument(
        title=data.title,
        doc_type=data.doc_type,
        reference_code=data.reference_code,
        version=data.version or "1.0",
        summary=data.summary,
        content=data.content,
        tags=data.tags or [],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, document_id: int) -> bool:
    doc = db.get(KnowledgeDocument, document_id)
    if doc is None:
        return False
    db.delete(doc)
    db.commit()
    return True
