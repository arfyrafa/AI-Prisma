"""Pydantic schemas for Machine Learning prediction."""

from typing import Any, Literal
from pydantic import BaseModel, Field

RangeStatus = Literal["NORMAL", "WARNING", "OUT_OF_RANGE"]
ProcessCondition = Literal["LOW", "NORMAL", "HIGH"]


class Clo2PredictionInput(BaseModel):
    """Input independent variables for the ClO2 MLR prediction model."""

    X1: float = Field(default=17.37, description="NaClO3 Feed (m3/h)")
    X2: float = Field(default=437.16, description="NaClO3 Concentration (g/L)")
    X3: float = Field(default=95.50, description="NaCl Concentration (g/L)")
    X4: float = Field(default=4.13, description="HCl Feed (m3/h)")
    X5: float = Field(default=31.55, description="HCl Concentration (%)")
    X7: float = Field(default=46.70, description="Generator ClO2 Output Temperature (°C)")
    X9: float = Field(default=8.42, description="H2O Chilled Water Temperature (°C)")
    X10: float = Field(default=104.78, description="Absorber H2O Rate (m3/h)")
    actual_value: float | None = Field(default=None, description="Actual lab measurement in g/L")


class VariableValidation(BaseModel):
    name: str
    symbol: str
    value: float
    unit: str
    min_valid: float
    max_valid: float
    status: RangeStatus
    message: str | None = None


class Clo2PredictionResult(BaseModel):
    """Deterministic prediction outcome from the Python ML Service."""

    predicted_value: float
    unit: str = "g/L"
    model_name: str = "OpenClaw_ClO2_MLR_Model"
    model_version: str = "mlr-v1.0"
    process_condition: ProcessCondition
    status: RangeStatus
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    actual_value: float | None = None
    error_abs: float | None = None
    error_pct: float | None = None
    accuracy_status: str | None = None
    warnings: list[str] = Field(default_factory=list)
    variables_validation: list[VariableValidation] = Field(default_factory=list)
    recommendation_summary: str | None = None
