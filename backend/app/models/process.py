"""Process, sensor reading and process parameter tables."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Process(Base):
    __tablename__ = "processes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    data_source: Mapped[str] = mapped_column(String(32), default="simulation", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    parameters: Mapped[list["ProcessParameter"]] = relationship(
        back_populates="process", cascade="all, delete-orphan"
    )


class SensorReading(Base):
    """One synchronised snapshot of the process.

    Note: the ClO2 concentration column is named ``clo2_concentration``. The
    ingestion schema also accepts the legacy ``co2_concentration`` key so
    existing publishers keep working.
    """

    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    clo2_concentration: Mapped[float | None] = mapped_column(Float)
    temperature: Mapped[float | None] = mapped_column(Float)
    pressure: Mapped[float | None] = mapped_column(Float)
    ph: Mapped[float | None] = mapped_column(Float)
    flow_rate: Mapped[float | None] = mapped_column(Float)
    so2_dosage: Mapped[float | None] = mapped_column(Float)
    orp: Mapped[float | None] = mapped_column(Float)
    turbidity: Mapped[float | None] = mapped_column(Float)

    source: Mapped[str] = mapped_column(String(32), default="simulation", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_readings_process_time", "process_id", "timestamp"),)

    # Parameter key -> column name. Used by the deviation engine so the UI
    # never has to know about column layout.
    PARAMETER_COLUMNS = (
        "clo2_concentration",
        "temperature",
        "pressure",
        "ph",
        "flow_rate",
        "so2_dosage",
        "orp",
        "turbidity",
    )

    def as_parameter_map(self) -> dict[str, float | None]:
        return {key: getattr(self, key) for key in self.PARAMETER_COLUMNS}


class ProcessParameter(Base):
    """Configurable operating range for one parameter of one process."""

    __tablename__ = "process_parameters"

    id: Mapped[int] = mapped_column(primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"), index=True)
    parameter_name: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="")
    target_value: Mapped[float | None] = mapped_column(Float)
    minimum_value: Mapped[float | None] = mapped_column(Float)
    maximum_value: Mapped[float | None] = mapped_column(Float)
    display_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    process: Mapped[Process] = relationship(back_populates="parameters")
