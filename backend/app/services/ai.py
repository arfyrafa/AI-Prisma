"""Orchestration between the process data and the external AI agent."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.integrations.agent.base import AgentUnavailableError, ProcessContext
from app.integrations.factory import get_agent_provider
from app.models import AIInsight, EngineerVerification, KnowledgeDocument, Recommendation
from app.repositories import readings as reading_repo
from app.services import deviation as deviation_service
from app.services.audit import log_event

TREND_WINDOW = 60


def build_context(db: Session, process_id: int) -> ProcessContext:
    """Assemble everything the agent needs: values, ranges, deviations, trend, SOP refs."""
    process = reading_repo.get_process(db, process_id)
    if process is None:
        raise ValueError("Proses tidak ditemukan.")

    parameters = reading_repo.get_parameters(db, process_id)
    reading = reading_repo.get_latest_reading(db, process_id)
    snapshots = deviation_service.build_snapshots(parameters, reading)
    deviations = deviation_service.detect_deviations(parameters, reading)

    recent = reading_repo.get_recent_readings(db, process_id, limit=TREND_WINDOW)
    trend: dict[str, list[float]] = {}
    from app.services.monitoring import COLUMN_ALIASES

    for parameter in parameters:
        col_name = COLUMN_ALIASES.get(parameter.parameter_name, parameter.parameter_name)
        series = [
            getattr(row, col_name)
            for row in recent
            if getattr(row, col_name, None) is not None
        ]
        if series:
            trend[parameter.parameter_name] = [float(value) for value in series]

    deviating_names = {d.parameter_name for d in deviations}
    documents = list(db.scalars(select(KnowledgeDocument).limit(50)))
    refs = [
        {
            "id": doc.id,
            "title": doc.title,
            "reference_code": doc.reference_code,
            "doc_type": doc.doc_type,
        }
        for doc in documents
        if not deviating_names
        or any(tag in deviating_names for tag in (doc.tags or []))
    ][:5]

    return ProcessContext(
        process_id=process.id,
        process_name=process.name,
        timestamp=reading.timestamp if reading else datetime.now(timezone.utc),
        parameters=[snapshot.model_dump() for snapshot in snapshots],
        deviations=[item.model_dump() for item in deviations],
        recent_trend=trend,
        knowledge_refs=refs,
    )


def run_analysis(
    db: Session, process_id: int, requested_by: str = "engineer"
) -> tuple[AIInsight, list[Recommendation]]:
    """Ask the agent to analyse the process and persist the result."""
    provider = get_agent_provider()
    context = build_context(db, process_id)

    log_event(
        db,
        action="ai_analysis_requested",
        user_id=requested_by,
        entity_type="process",
        entity_id=process_id,
        description="Analisis AI diminta oleh engineer.",
        metadata={"provider": provider.name},
        commit=False,
    )

    try:
        analysis = provider.analyze_process(context)
    except AgentUnavailableError:
        db.rollback()
        raise

    insight = AIInsight(
        process_id=process_id,
        timestamp=datetime.now(timezone.utc),
        summary=analysis.insight.summary,
        details=analysis.insight.details,
        related_parameters=analysis.insight.related_parameters or None,
        source=analysis.insight.source,
        confidence=analysis.insight.confidence,
    )
    db.add(insight)
    db.flush()

    recommendations: list[Recommendation] = []
    for item in analysis.recommendations:
        recommendation = Recommendation(
            process_id=process_id,
            insight_id=insight.id,
            recommendation=item.recommendation,
            reason=item.reason,
            suggested_action=item.suggested_action,
            related_parameters=item.related_parameters or None,
            source=item.source,
            status="pending",
        )
        db.add(recommendation)
        recommendations.append(recommendation)
    db.flush()

    log_event(
        db,
        action="ai_insight_generated",
        entity_type="ai_insight",
        entity_id=insight.id,
        description=insight.summary,
        metadata={"source": insight.source},
        commit=False,
    )
    for recommendation in recommendations:
        log_event(
            db,
            action="recommendation_generated",
            entity_type="recommendation",
            entity_id=recommendation.id,
            description=recommendation.recommendation,
            commit=False,
        )

    db.commit()
    db.refresh(insight)
    for recommendation in recommendations:
        db.refresh(recommendation)
    return insight, recommendations


def list_insights(db: Session, process_id: int | None = None, limit: int = 50) -> list[AIInsight]:
    stmt = select(AIInsight)
    if process_id:
        stmt = stmt.where(AIInsight.process_id == process_id)
    return list(db.scalars(stmt.order_by(AIInsight.created_at.desc()).limit(limit)))


def list_recommendations(
    db: Session, process_id: int | None = None, status: str | None = None, limit: int = 50
) -> list[Recommendation]:
    stmt = select(Recommendation).options(selectinload(Recommendation.verifications))
    if process_id:
        stmt = stmt.where(Recommendation.process_id == process_id)
    if status:
        stmt = stmt.where(Recommendation.status == status)
    return list(db.scalars(stmt.order_by(Recommendation.created_at.desc()).limit(limit)))


DECISION_TO_STATUS = {
    "accept": "verified",
    "reject": "rejected",
    "needs_analysis": "needs_analysis",
}


def verify_recommendation(
    db: Session,
    recommendation: Recommendation,
    decision: str,
    verified_by: str,
    notes: str | None = None,
) -> EngineerVerification:
    """Record the engineer's decision. The system never acts on it by itself."""
    verification = EngineerVerification(
        recommendation_id=recommendation.id,
        decision=decision,
        notes=notes,
        verified_by=verified_by,
    )
    db.add(verification)
    recommendation.status = DECISION_TO_STATUS.get(decision, "pending")

    log_event(
        db,
        action="engineer_verification",
        user_id=verified_by,
        entity_type="recommendation",
        entity_id=recommendation.id,
        description=f"Keputusan engineer: {decision}.",
        metadata={"decision": decision, "notes": notes},
        commit=False,
    )
    db.commit()
    db.refresh(verification)
    return verification


def chat(
    db: Session, process_id: int, message: str, history: list[dict[str, str]]
) -> tuple[str, str, list[str]]:
    import re
    provider = get_agent_provider()
    context = build_context(db, process_id)

    # Dynamic RAG search across Knowledge Base documents based on user message
    keywords = [w.strip().lower() for w in re.findall(r'\w+', message) if len(w) > 2]
    all_docs = list(db.scalars(select(KnowledgeDocument).order_by(KnowledgeDocument.updated_at.desc()).limit(40)))
    
    scored_docs: list[tuple[int, KnowledgeDocument]] = []
    for doc in all_docs:
        doc_text = f"{doc.title} {doc.reference_code or ''} {' '.join(doc.tags or [])} {doc.content or ''}".lower()
        score = sum(1 for kw in keywords if kw in doc_text)
        title_score = sum(3 for kw in keywords if kw in doc.title.lower())
        total_score = score + title_score
        if total_score > 0:
            scored_docs.append((total_score, doc))
            
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    selected_docs = [doc for _, doc in scored_docs[:5]] if scored_docs else all_docs[:3]
    
    context.knowledge_refs = [
        {
            "id": doc.id,
            "title": doc.title,
            "reference_code": doc.reference_code,
            "doc_type": doc.doc_type,
            "summary": doc.summary,
            "content": doc.content[:1500] if doc.content else "",
        }
        for doc in selected_docs
    ]

    reply = provider.chat(context, message, history)
    log_event(
        db,
        action="ai_chat_message",
        entity_type="process",
        entity_id=process_id,
        description=message[:200],
        metadata={"provider": provider.name},
    )
    return reply.reply, reply.source, reply.related_parameters
