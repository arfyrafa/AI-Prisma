"""API routes for deterministic Machine Learning predictions and metadata."""

from fastapi import APIRouter
from app.ml.clo2_model import MLR_METADATA, VARIABLE_METADATA
from app.ml.predictor import predict_clo2
from app.ml.schemas import Clo2PredictionInput, Clo2PredictionResult

router = APIRouter(prefix="/ml", tags=["machine-learning"])


@router.post("/predict", response_model=Clo2PredictionResult)
def predict(payload: Clo2PredictionInput) -> Clo2PredictionResult:
    """Evaluate Multiple Linear Regression formula deterministically via Python ML service."""
    return predict_clo2(payload)


@router.get("/metadata")
def get_model_metadata() -> dict:
    """Return ClO2 ML model specification, equation, and variable definitions."""
    return {
        "model": MLR_METADATA,
        "variables": VARIABLE_METADATA,
    }
