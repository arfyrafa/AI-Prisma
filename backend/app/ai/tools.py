"""Structured OpenClaw Tool Definitions.

Provides controlled interfaces for the AI Agent to query validated sensor data,
retrieve process knowledge, detect anomalies, and execute deterministic ML inference.
"""

from typing import Any
from sqlalchemy.orm import Session

from app.ml.predictor import predict_clo2
from app.ml.schemas import Clo2PredictionInput, Clo2PredictionResult
from app.models.audit import KnowledgeDocument
from app.repositories import readings as reading_repo
from app.services import deviation as deviation_service


def predict_clo2_tool(
    X1: float,
    X2: float,
    X3: float,
    X4: float,
    X5: float,
    X7: float,
    X9: float,
    X10: float,
    actual_value: float | None = None,
) -> dict[str, Any]:
    """Tool: Deterministic ClO2 Multiple Linear Regression inference via Python ML service."""
    inp = Clo2PredictionInput(
        X1=X1, X2=X2, X3=X3, X4=X4, X5=X5, X7=X7, X9=X9, X10=X10, actual_value=actual_value
    )
    res: Clo2PredictionResult = predict_clo2(inp)
    return res.model_dump()


def get_latest_sensor_data_tool(db: Session, process_id: int) -> dict[str, Any]:
    """Tool: Retrieve latest verified telemetry readings for 10 process control elements."""
    parameters = reading_repo.get_parameters(db, process_id)
    reading = reading_repo.get_latest_reading(db, process_id)
    snapshots = deviation_service.build_snapshots(parameters, reading)

    return {
        "timestamp": reading.timestamp.isoformat() if reading else None,
        "parameters": [s.model_dump() for s in snapshots],
    }


def detect_anomaly_tool(db: Session, process_id: int) -> dict[str, Any]:
    """Tool: Detect parameter deviations outside configured safe operating boundaries."""
    parameters = reading_repo.get_parameters(db, process_id)
    reading = reading_repo.get_latest_reading(db, process_id)
    deviations = deviation_service.detect_deviations(parameters, reading)

    return {
        "has_anomaly": len(deviations) > 0,
        "anomaly_count": len(deviations),
        "deviations": [d.model_dump() for d in deviations],
    }


def get_process_knowledge_tool(topic: str, db: Session) -> list[dict[str, Any]]:
    """Tool: Retrieve relevant SOP, kinetics theory, or troubleshooting guidelines."""
    docs = db.query(KnowledgeDocument).all()
    topic_lower = topic.lower()

    matched = []
    for d in docs:
        if (
            topic_lower in d.title.lower()
            or topic_lower in (d.summary or "").lower()
            or any(topic_lower in tag.lower() for tag in (d.tags or []))
        ):
            matched.append({
                "reference_code": d.reference_code,
                "title": d.title,
                "doc_type": d.doc_type,
                "summary": d.summary,
                "content": d.content,
            })
    return matched[:3]
