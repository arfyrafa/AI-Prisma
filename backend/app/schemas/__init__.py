"""Typed API contracts (Pydantic v2)."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Severity = Literal["INFO", "WARNING", "CRITICAL"]
ParameterStatus = Literal["normal", "warning", "critical", "no_data"]


class ORMModel(BaseModel):
    # protected_namespaces is cleared so fields like ``model_name`` and
    # ``model_metadata`` (predictive model info) don't collide with pydantic's
    # reserved ``model_`` prefix.
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# --------------------------------------------------------------------------
# Users & Auth
# --------------------------------------------------------------------------
class UserOut(ORMModel):
    id: int
    name: str
    email: str
    role: str
    department: str
    engineer_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Operator"
    department: str = "Operasi ClO₂ Unit"
    engineer_id: str = "ENG-001"
    is_active: bool = True


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    department: str | None = None
    engineer_id: str | None = None
    is_active: bool | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# --------------------------------------------------------------------------
# Health & system
# --------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    database: str
    agent_provider: str
    agent_available: bool
    predictive_provider: str
    simulation_mode: bool
    server_time: datetime


# --------------------------------------------------------------------------
# Process
# --------------------------------------------------------------------------
class ProcessOut(ORMModel):
    id: int
    name: str
    description: str | None = None
    status: str
    data_source: str


class ProcessParameterOut(ORMModel):
    id: int
    parameter_name: str
    display_name: str
    unit: str
    target_value: float | None = None
    minimum_value: float | None = None
    maximum_value: float | None = None
    display_order: int


class ProcessParameterUpdate(BaseModel):
    display_name: str | None = None
    unit: str | None = None
    target_value: float | None = None
    minimum_value: float | None = None
    maximum_value: float | None = None


class SensorReadingOut(ORMModel):
    id: int
    process_id: int
    timestamp: datetime
    clo2_concentration: float | None = None
    temperature: float | None = None
    pressure: float | None = None
    ph: float | None = None
    flow_rate: float | None = None
    so2_dosage: float | None = None
    orp: float | None = None
    turbidity: float | None = None
    source: str


class ParameterSnapshot(BaseModel):
    """One parameter evaluated against its configured operating range."""

    parameter_name: str
    display_name: str
    unit: str
    current_value: float | None = None
    target_value: float | None = None
    minimum_value: float | None = None
    maximum_value: float | None = None
    deviation: float | None = None
    status: ParameterStatus
    status_label: str
    last_updated: datetime | None = None


class LatestSnapshot(BaseModel):
    process: ProcessOut
    reading: SensorReadingOut | None = None
    parameters: list[ParameterSnapshot]
    overall_status: ParameterStatus
    active_alert_count: int
    data_source: str
    server_time: datetime


class HistoryPoint(BaseModel):
    timestamp: datetime
    values: dict[str, float | None]


class HistoryResponse(BaseModel):
    process_id: int
    range: str
    parameters: list[str]
    points: list[HistoryPoint]


# --------------------------------------------------------------------------
# Deviations & alerts
# --------------------------------------------------------------------------
class Deviation(BaseModel):
    parameter_name: str
    display_name: str
    unit: str
    current_value: float
    expected_min: float | None = None
    expected_max: float | None = None
    deviation: float
    severity: Severity
    detected_at: datetime
    message: str


class AlertOut(ORMModel):
    id: int
    process_id: int
    parameter_name: str
    severity: Severity
    message: str
    current_value: float | None = None
    expected_min: float | None = None
    expected_max: float | None = None
    deviation: float | None = None
    status: str
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class AlertAcknowledge(BaseModel):
    acknowledged_by: str = Field(default="engineer", max_length=120)
    notes: str | None = None


# --------------------------------------------------------------------------
# Prediction
# --------------------------------------------------------------------------
class PredictionOut(ORMModel):
    id: int
    process_id: int
    timestamp: datetime
    target_parameter: str
    actual_value: float | None = None
    predicted_value: float | None = None
    unit: str
    model_name: str
    model_metadata: dict[str, Any] | None = None
    prediction_horizon: int
    is_simulated: bool
    created_at: datetime


class PredictionRequest(BaseModel):
    process_id: int = 1
    target_parameter: str = "clo2_concentration"
    horizon_minutes: int | None = None


# --------------------------------------------------------------------------
# Insight & recommendation
# --------------------------------------------------------------------------
class InsightOut(ORMModel):
    id: int
    process_id: int
    timestamp: datetime
    summary: str
    details: str | None = None
    related_parameters: list[str] | None = None
    source: str
    confidence: float | None = None
    created_at: datetime


class AnalyzeRequest(BaseModel):
    process_id: int = 1
    requested_by: str = "engineer"


class VerificationOut(ORMModel):
    id: int
    recommendation_id: int
    decision: str
    notes: str | None = None
    verified_by: str
    verified_at: datetime


class RecommendationOut(ORMModel):
    id: int
    process_id: int
    insight_id: int | None = None
    recommendation: str
    reason: str | None = None
    suggested_action: str | None = None
    related_parameters: list[str] | None = None
    source: str
    status: str
    created_at: datetime
    verifications: list[VerificationOut] = []


class VerificationRequest(BaseModel):
    decision: Literal["accept", "reject", "needs_analysis"]
    notes: str | None = None
    verified_by: str = Field(default="engineer", max_length=120)
    reviewed: bool = True


class AnalyzeResponse(BaseModel):
    insight: InsightOut
    recommendations: list[RecommendationOut]


# --------------------------------------------------------------------------
# Chat
# --------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    process_id: int = 1
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    source: str
    related_parameters: list[str] | None = None
    timestamp: datetime


# --------------------------------------------------------------------------
# Knowledge base
# --------------------------------------------------------------------------
class KnowledgeDocumentOut(ORMModel):
    id: int
    title: str
    doc_type: str
    reference_code: str | None = None
    version: str | None = None
    summary: str | None = None
    tags: list[str] | None = None
    updated_at: datetime


class KnowledgeDocumentDetail(KnowledgeDocumentOut):
    content: str | None = None


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------
class AuditLogOut(ORMModel):
    id: int
    user_id: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: int | None = None
    description: str | None = None
    log_metadata: dict[str, Any] | None = None
    created_at: datetime


# --------------------------------------------------------------------------
# Ingestion
# --------------------------------------------------------------------------
class SensorIngestionPayload(BaseModel):
    """Payload accepted from an external sensor bridge, DCS gateway or agent."""

    model_config = ConfigDict(extra="forbid")

    process_id: int = Field(ge=1)
    timestamp: datetime | None = None
    source: str = Field(default="external", max_length=32)
    parameters: dict[str, float | None]

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float | None]) -> dict[str, float | None]:
        from app.models.process import SensorReading

        allowed = set(SensorReading.PARAMETER_COLUMNS) | {"co2_concentration"}
        unknown = sorted(set(value) - allowed)
        if unknown:
            raise ValueError(f"Parameter tidak dikenal: {', '.join(unknown)}")
        if not value:
            raise ValueError("Minimal satu parameter harus dikirim")
        # Legacy key alias kept for backward compatibility with older publishers.
        if "co2_concentration" in value and "clo2_concentration" not in value:
            value["clo2_concentration"] = value.pop("co2_concentration")
        else:
            value.pop("co2_concentration", None)
        return value


class IngestionResponse(BaseModel):
    reading: SensorReadingOut
    deviations: list[Deviation]
    alerts_created: list[AlertOut]


class BatchIngestionPayload(BaseModel):
    process_id: int = Field(ge=1)
    source: str = Field(default="csv_upload", max_length=32)
    items: list[dict[str, Any]]


class BatchIngestionResponse(BaseModel):
    processed_count: int
    alerts_created_count: int
    latest_reading: SensorReadingOut | None = None
