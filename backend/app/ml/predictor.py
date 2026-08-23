"""Deterministic Machine Learning Predictor Service for Chlorine Dioxide (ClO₂).

Performs exact mathematical evaluation, range validation, error calculation,
and operational recommendation synthesis.
"""

from app.ml.clo2_model import MLR_METADATA, VARIABLE_METADATA
from app.ml.schemas import (
    Clo2PredictionInput,
    Clo2PredictionResult,
    ProcessCondition,
    RangeStatus,
    VariableValidation,
)


def validate_variable(symbol: str, value: float) -> VariableValidation:
    meta = VARIABLE_METADATA.get(symbol, {})
    name = meta.get("name", symbol)
    unit = meta.get("unit", "")
    min_v = meta.get("min_valid", 0.0)
    max_v = meta.get("max_valid", 9999.0)

    if value < min_v:
        status: RangeStatus = "OUT_OF_RANGE"
        msg = f"{symbol} ({value} {unit}) di bawah batas minimum valid ({min_v} {unit})."
    elif value > max_v:
        status: RangeStatus = "OUT_OF_RANGE"
        msg = f"{symbol} ({value} {unit}) di atas batas maksimum valid ({max_v} {unit})."
    else:
        status: RangeStatus = "NORMAL"
        msg = None

    return VariableValidation(
        name=name,
        symbol=symbol,
        value=value,
        unit=unit,
        min_valid=min_v,
        max_valid=max_v,
        status=status,
        message=msg,
    )


def predict_clo2(input_data: Clo2PredictionInput) -> Clo2PredictionResult:
    """Evaluate Multiple Linear Regression formula deterministically."""
    coef = MLR_METADATA["coefficients"]
    intercept = MLR_METADATA["intercept"]

    # 1. Variable Validations
    validations: list[VariableValidation] = []
    warnings: list[str] = []

    symbols = ["X1", "X2", "X3", "X4", "X5", "X7", "X9", "X10"]
    for s in symbols:
        val = getattr(input_data, s)
        v_res = validate_variable(s, val)
        validations.append(v_res)
        if v_res.status == "OUT_OF_RANGE" and v_res.message:
            warnings.append(v_res.message)

    # 2. Deterministic MLR calculation
    predicted = (
        intercept
        + coef["X1"] * input_data.X1
        + coef["X2"] * input_data.X2
        + coef["X3"] * input_data.X3
        + coef["X4"] * input_data.X4
        + coef["X5"] * input_data.X5
        + coef["X7"] * input_data.X7
        + coef["X9"] * input_data.X9
        + coef["X10"] * input_data.X10
    )

    # 3. Process condition
    if predicted < 9.7:
        condition: ProcessCondition = "LOW"
    elif predicted > 11.0:
        condition: ProcessCondition = "HIGH"
    else:
        condition: ProcessCondition = "NORMAL"

    # 4. Overall status & confidence
    if warnings:
        status: RangeStatus = "WARNING"
        confidence = "MEDIUM" if len(warnings) <= 2 else "LOW"
    else:
        status = "NORMAL"
        confidence = "HIGH"

    # 5. Lab Error calculation if actual_value provided
    actual = input_data.actual_value
    error_abs = None
    error_pct = None
    accuracy_status = None

    if actual is not None and actual > 0:
        error_abs = abs(actual - predicted)
        error_pct = (error_abs / actual) * 100
        if error_pct <= 1.0:
            accuracy_status = "Sangat Akurat (Toleransi Utama ±1%)"
        elif error_pct <= 2.0:
            accuracy_status = "Akurat (Toleransi KPI ±2%)"
        elif error_pct <= 5.0:
            accuracy_status = "Cukup (Perlu Evaluasi Setpoint ±5%)"
        else:
            accuracy_status = "Kurang Akurat (Cek Kalibrasi & Lab)"

    # 6. Recommendation synthesis
    if condition == "LOW":
        rec = (
            "Prioritas 1 (Absorber): Pertimbangkan menurunkan laju alir H₂O Absorber secara bertahap "
            "untuk mengurangi efek pengenceran berlebih. "
            "Prioritas 2 (Generator): Evaluasi kenaikan bertahap umpan NaClO₃ (X₁) dan HCl (X₄) sesuai rasio stoikiometri."
        )
    elif condition == "HIGH":
        rec = (
            "Prioritas 1 (Absorber): Pertimbangkan menaikkan laju alir H₂O Absorber bertahap guna meningkatkan pengenceran dan penyerapan gas. "
            "Prioritas 2 (Generator): Kurangi dosis HCl (X₄) atau turunkan sedikit rasio umpan secara bertahap."
        )
    else:
        rec = "Kondisi operasi berada pada rentang target nominal (9.7–11.0 g/L). Pertahankan setpoint stabil."

    return Clo2PredictionResult(
        predicted_value=round(predicted, 4),
        unit="g/L",
        process_condition=condition,
        status=status,
        confidence=confidence,
        actual_value=actual,
        error_abs=round(error_abs, 4) if error_abs is not None else None,
        error_pct=round(error_pct, 2) if error_pct is not None else None,
        accuracy_status=accuracy_status,
        warnings=warnings,
        variables_validation=validations,
        recommendation_summary=rec,
    )
