"""Deviation engine.

Status is derived from the operating ranges stored in ``process_parameters``.
Nothing here is hard-coded in the UI: the frontend renders whatever status the
backend computes, so changing a range in Settings changes the whole system.
"""

from datetime import datetime, timezone

from app.core.config import settings
from app.models import ProcessParameter, SensorReading
from app.schemas import Deviation, ParameterSnapshot

STATUS_LABELS = {
    "normal": "Normal",
    "warning": "Peringatan",
    "critical": "Kritis",
    "no_data": "Tidak ada data",
}

SEVERITY_ORDER = {"INFO": 0, "WARNING": 1, "CRITICAL": 2}
STATUS_ORDER = {"no_data": -1, "normal": 0, "warning": 1, "critical": 2}


def _critical_margin(parameter: ProcessParameter) -> float:
    """How far past a limit a value must go before it becomes CRITICAL."""
    if parameter.minimum_value is None or parameter.maximum_value is None:
        return 0.0
    span = abs(parameter.maximum_value - parameter.minimum_value)
    return span * settings.CRITICAL_MARGIN_RATIO


def evaluate_parameter(
    parameter: ProcessParameter, value: float | None
) -> tuple[str, float | None]:
    """Return ``(status, deviation)`` for a single parameter value."""
    if value is None:
        return "no_data", None

    deviation: float | None = None
    if parameter.target_value is not None:
        deviation = round(value - parameter.target_value, 4)

    margin = _critical_margin(parameter)
    status = "normal"

    if parameter.maximum_value is not None and value > parameter.maximum_value:
        excess = value - parameter.maximum_value
        status = "critical" if excess > margin else "warning"
    elif parameter.minimum_value is not None and value < parameter.minimum_value:
        shortfall = parameter.minimum_value - value
        status = "critical" if shortfall > margin else "warning"

    return status, deviation


def build_snapshots(
    parameters: list[ProcessParameter], reading: SensorReading | None
) -> list[ParameterSnapshot]:
    values = reading.as_parameter_map() if reading else {}
    snapshots: list[ParameterSnapshot] = []
    for parameter in parameters:
        value = values.get(parameter.parameter_name)
        status, deviation = evaluate_parameter(parameter, value)
        snapshots.append(
            ParameterSnapshot(
                id=parameter.id,
                parameter_name=parameter.parameter_name,
                display_name=parameter.display_name,
                unit=parameter.unit,
                current_value=value,
                target_value=parameter.target_value,
                minimum_value=parameter.minimum_value,
                maximum_value=parameter.maximum_value,
                deviation=deviation,
                status=status,  # type: ignore[arg-type]
                status_label=STATUS_LABELS[status],
                last_updated=reading.timestamp if reading else None,
            )
        )
    return snapshots


def overall_status(snapshots: list[ParameterSnapshot]) -> str:
    if not snapshots or all(s.status == "no_data" for s in snapshots):
        return "no_data"
    return max((s.status for s in snapshots), key=lambda s: STATUS_ORDER[s])


def detect_deviations(
    parameters: list[ProcessParameter], reading: SensorReading | None
) -> list[Deviation]:
    """Every parameter currently outside its configured operating range."""
    if reading is None:
        return []

    detected_at = reading.timestamp or datetime.now(timezone.utc)
    deviations: list[Deviation] = []

    for snapshot, parameter in zip(build_snapshots(parameters, reading), parameters, strict=True):
        if snapshot.status not in ("warning", "critical") or snapshot.current_value is None:
            continue

        if parameter.maximum_value is not None and snapshot.current_value > parameter.maximum_value:
            offset = round(snapshot.current_value - parameter.maximum_value, 4)
            direction = "di atas batas atas"
            limit = parameter.maximum_value
        else:
            offset = round(snapshot.current_value - (parameter.minimum_value or 0.0), 4)
            direction = "di bawah batas bawah"
            limit = parameter.minimum_value

        severity = "CRITICAL" if snapshot.status == "critical" else "WARNING"
        unit = f" {parameter.unit}".rstrip()
        message = (
            f"{parameter.display_name} {direction} operasi "
            f"({snapshot.current_value}{unit} vs {limit}{unit})."
        )

        deviations.append(
            Deviation(
                parameter_name=parameter.parameter_name,
                display_name=parameter.display_name,
                unit=parameter.unit,
                current_value=snapshot.current_value,
                expected_min=parameter.minimum_value,
                expected_max=parameter.maximum_value,
                deviation=offset,
                severity=severity,  # type: ignore[arg-type]
                detected_at=detected_at,
                message=message,
            )
        )

    return deviations
