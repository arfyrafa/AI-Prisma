"""Prediction, insight, recommendation and engineer verification tables."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    target_parameter: Mapped[str] = mapped_column(String(64), nullable=False)
    actual_value: Mapped[float | None] = mapped_column(Float)
    predicted_value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(32), default="")
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    model_metadata: Mapped[dict | None] = mapped_column(JSON)
    prediction_horizon: Mapped[int] = mapped_column(Integer, default=30)  # minutes
    is_simulated: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str | None] = mapped_column(Text)
    related_parameters: Mapped[list | None] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    # Confidence is stored only when the agent actually returns one.
    confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="insight")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    insight_id: Mapped[int | None] = mapped_column(ForeignKey("ai_insights.id", ondelete="SET NULL"))
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    suggested_action: Mapped[str | None] = mapped_column(Text)
    related_parameters: Mapped[list | None] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    # pending | verified | rejected | needs_analysis
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    insight: Mapped[AIInsight | None] = relationship(back_populates="recommendations")
    verifications: Mapped[list["EngineerVerification"]] = relationship(
        back_populates="recommendation", cascade="all, delete-orphan"
    )


class EngineerVerification(Base):
    __tablename__ = "engineer_verifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    recommendation_id: Mapped[int] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    decision: Mapped[str] = mapped_column(String(24), nullable=False)  # accept|reject|needs_analysis
    notes: Mapped[str | None] = mapped_column(Text)
    verified_by: Mapped[str] = mapped_column(String(120), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recommendation: Mapped[Recommendation] = relationship(back_populates="verifications")


class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    process_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

