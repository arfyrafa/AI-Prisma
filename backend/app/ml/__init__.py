"""Machine Learning inference module for ClO₂ Industrial Monitoring.

Provides deterministic, reproducible MLR prediction, variable metadata,
and range validation.
"""

from app.ml.predictor import predict_clo2
from app.ml.schemas import Clo2PredictionInput, Clo2PredictionResult

__all__ = ["predict_clo2", "Clo2PredictionInput", "Clo2PredictionResult"]
