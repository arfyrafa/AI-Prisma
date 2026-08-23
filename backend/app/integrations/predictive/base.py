"""Contract for the replaceable predictive model."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class PredictionUnavailableError(RuntimeError):
    """Raised when a prediction cannot be produced (e.g. not enough history)."""


@dataclass
class PredictionResult:
    target_parameter: str
    actual_value: float | None
    predicted_value: float
    model_name: str
    horizon_minutes: int
    is_simulated: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)


class PredictiveModel(ABC):
    """Any model that maps recent process history to a future value."""

    name: str = "base"

    @abstractmethod
    def predict(
        self,
        history: list[dict[str, Any]],
        target_parameter: str,
        horizon_minutes: int,
    ) -> PredictionResult: ...
