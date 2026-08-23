"""Alert table."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    sensor_reading_id: Mapped[int | None] = mapped_column(
        ForeignKey("sensor_readings.id", ondelete="SET NULL")
    )
    parameter_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # INFO|WARNING|CRITICAL
    message: Mapped[str] = mapped_column(Text, nullable=False)

    current_value: Mapped[float | None] = mapped_column(Float)
    expected_min: Mapped[float | None] = mapped_column(Float)
    expected_max: Mapped[float | None] = mapped_column(Float)
    deviation: Mapped[float | None] = mapped_column(Float)

    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(120))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
